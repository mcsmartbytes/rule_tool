/**
 * Geographic Utilities for AI Detection
 * Converts pixel coordinates to geographic coordinates
 */

import type { MapBounds, RawAIFeature, AIDetectedFeature, RawGeometry } from './types';
import type { SiteObjectType } from '@/lib/supabase/types';

/**
 * Convert pixel coordinates to geographic coordinates
 */
export function pixelToGeo(
  pixelX: number,
  pixelY: number,
  imageWidth: number,
  imageHeight: number,
  bounds: MapBounds
): [number, number] {
  // Calculate longitude (X increases left to right)
  const lng = bounds.west + (pixelX / imageWidth) * (bounds.east - bounds.west);

  // Calculate latitude (Y increases top to bottom in image, but north to south in geo)
  const lat = bounds.north - (pixelY / imageHeight) * (bounds.north - bounds.south);

  return [lng, lat];
}

/**
 * Convert an array of pixel coordinate pairs to geographic coordinates
 */
export function pixelCoordsToGeo(
  pixelCoords: number[][],
  imageWidth: number,
  imageHeight: number,
  bounds: MapBounds
): number[][] {
  return pixelCoords.map(([px, py]) =>
    pixelToGeo(px, py, imageWidth, imageHeight, bounds)
  );
}

/**
 * Convert raw AI response geometry (pixel coords) to GeoJSON geometry (geo coords)
 */
export function convertGeometry(
  rawGeometry: RawGeometry,
  imageWidth: number,
  imageHeight: number,
  bounds: MapBounds
): GeoJSON.Geometry {
  switch (rawGeometry.type) {
    case 'Point': {
      const [px, py] = rawGeometry.coordinates;
      const [lng, lat] = pixelToGeo(px, py, imageWidth, imageHeight, bounds);
      return {
        type: 'Point',
        coordinates: [lng, lat],
      };
    }

    case 'LineString': {
      return {
        type: 'LineString',
        coordinates: pixelCoordsToGeo(rawGeometry.coordinates, imageWidth, imageHeight, bounds),
      };
    }

    case 'Polygon': {
      return {
        type: 'Polygon',
        coordinates: rawGeometry.coordinates.map(ring =>
          pixelCoordsToGeo(ring, imageWidth, imageHeight, bounds)
        ),
      };
    }

    default: {
      const _exhaustive: never = rawGeometry;
      throw new Error(`Unsupported geometry type: ${_exhaustive}`);
    }
  }
}

/**
 * Validate and map object type string to SiteObjectType
 */
const VALID_OBJECT_TYPES: SiteObjectType[] = [
  'parking-surface',
  'drive-lane',
  'loading-area',
  'sidewalk',
  'plaza',
  'curb',
  'gutter',
  'edge-line',
  'crack',
  'drain',
  'bollard',
  'light-pole',
  'sign',
  'building-footprint',
  'median',
  'island',
  'ada-ramp',
  'ada-space',
  'fire-lane',
  'crosswalk',
  'parking-stall',
  'stall-group',
  'directional-arrow',
  'symbol',
];

export function mapToObjectType(typeString: string): SiteObjectType | null {
  const normalized = typeString.toLowerCase().replace(/[_\s]/g, '-');

  if (VALID_OBJECT_TYPES.includes(normalized as SiteObjectType)) {
    return normalized as SiteObjectType;
  }

  // Handle common aliases
  const aliases: Record<string, SiteObjectType> = {
    'parking-lot': 'parking-surface',
    'parking': 'parking-surface',
    'driveway': 'drive-lane',
    'drive': 'drive-lane',
    'walkway': 'sidewalk',
    'path': 'sidewalk',
    'building': 'building-footprint',
    'structure': 'building-footprint',
    'roof': 'building-footprint',
    'arrow': 'directional-arrow',
    'stall': 'parking-stall',
    'handicap': 'ada-space',
    'accessible': 'ada-space',
  };

  return aliases[normalized] || null;
}

/**
 * Calculate pixel bounding box for a geometry
 */
export function getPixelBounds(geometry: RawAIFeature['geometry']): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let allCoords: number[][] = [];

  if (geometry.type === 'Point') {
    const c = geometry.coordinates as number[];
    allCoords = [[c[0], c[1]]];
  } else if (geometry.type === 'LineString') {
    allCoords = geometry.coordinates as number[][];
  } else if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][];
    allCoords = rings.flat();
  }

  const xs = allCoords.map(c => c[0]);
  const ys = allCoords.map(c => c[1]);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * Convert raw AI features to AIDetectedFeature with geographic coordinates
 */
export function convertRawFeatures(
  rawFeatures: RawAIFeature[],
  imageWidth: number,
  imageHeight: number,
  bounds: MapBounds
): AIDetectedFeature[] {
  const results: AIDetectedFeature[] = [];

  for (const raw of rawFeatures) {
    const objectType = mapToObjectType(raw.type);

    if (!objectType) {
      console.warn(`Unknown object type: ${raw.type}, skipping`);
      continue;
    }

    if (raw.confidence < 0.5) {
      continue; // Skip low confidence features
    }

    try {
      const geometry = convertGeometry(raw.geometry, imageWidth, imageHeight, bounds);
      const pixelBounds = getPixelBounds(raw.geometry);

      results.push({
        id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: objectType,
        subType: raw.subType,
        geometry,
        confidence: raw.confidence,
        label: raw.label,
        pixelBounds,
      });
    } catch (err) {
      console.warn(`Failed to convert feature: ${raw.type}`, err);
    }
  }

  return results;
}

/**
 * Calculate approximate scale (feet per pixel) at given zoom and latitude
 */
export function calculateScale(zoom: number, latitude: number): number {
  // At zoom 0, the entire world (circumference) fits in 256 pixels
  // Earth's circumference at equator: 40,075,017 meters
  const metersPerPixelAtZoom0 = 40075017 / 256;

  // Adjust for zoom level
  const metersPerPixel = metersPerPixelAtZoom0 / Math.pow(2, zoom);

  // Adjust for latitude (Mercator projection)
  const latRadians = latitude * (Math.PI / 180);
  const adjustedMetersPerPixel = metersPerPixel * Math.cos(latRadians);

  // Convert to feet
  const feetPerPixel = adjustedMetersPerPixel * 3.28084;

  return feetPerPixel;
}
