/**
 * AI Detection Types
 */

import type { SiteObjectType } from '@/lib/supabase/types';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface AIDetectRequest {
  image: string;              // Base64 PNG from map canvas
  bounds: MapBounds;          // Current viewport bounds
  zoom: number;               // Current zoom level
  imageWidth: number;         // Canvas width in pixels
  imageHeight: number;        // Canvas height in pixels
  industry?: 'asphalt' | 'sealcoating' | 'concrete' | 'striping' | 'all';
}

export interface AIDetectedFeature {
  id: string;                 // Generated ID
  type: SiteObjectType;       // Object type from enum
  subType?: string;           // Optional material/style
  geometry: GeoJSON.Geometry; // Geographic coordinates
  confidence: number;         // 0-1 confidence score
  label?: string;             // AI-generated description
  pixelBounds?: {             // Original pixel bounds for debugging
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface AIDetectResponse {
  success: boolean;
  features: AIDetectedFeature[];
  processingTimeMs: number;
  error?: string;
}

export interface AIDetectionState {
  status: 'idle' | 'capturing' | 'analyzing' | 'reviewing' | 'error';
  pendingFeatures: AIDetectedFeature[];
  selectedFeatureIds: Set<string>;
  error: string | null;
}

// Raw geometry types from Claude Vision (pixel coordinates)
interface RawPointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [x, y] pixel coordinates
}

interface RawLineStringGeometry {
  type: 'LineString';
  coordinates: number[][]; // [[x, y], [x, y], ...]
}

interface RawPolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][]; // [[[x, y], [x, y], ...]]
}

export type RawGeometry = RawPointGeometry | RawLineStringGeometry | RawPolygonGeometry;

// Raw response from Claude Vision (pixel coordinates)
export interface RawAIFeature {
  type: string;
  subType?: string;
  confidence: number;
  label?: string;
  geometry: RawGeometry;
}
