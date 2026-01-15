import type mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection } from "geojson";

export const STALL_PREVIEW_SOURCE = "stall-preview-src";
export const STALL_FINAL_SOURCE = "stall-final-src";

/**
 * Ensure stall-related sources and layers exist on the map.
 * Call this after map style is loaded.
 */
export function ensureStallSourcesAndLayers(map: mapboxgl.Map) {
  // Preview source
  if (!map.getSource(STALL_PREVIEW_SOURCE)) {
    map.addSource(STALL_PREVIEW_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  // Preview row line (excludes tick marks)
  if (!map.getLayer("stall-preview-line")) {
    map.addLayer({
      id: "stall-preview-line",
      type: "line",
      source: STALL_PREVIEW_SOURCE,
      filter: ["!=", ["get", "kind"], "stall_tick"],
      paint: {
        "line-color": "#ffcc00",
        "line-width": 3,
        "line-opacity": 0.85,
        "line-dasharray": [2, 2],
      },
    });
  }

  // Preview tick marks
  if (!map.getLayer("stall-preview-ticks")) {
    map.addLayer({
      id: "stall-preview-ticks",
      type: "line",
      source: STALL_PREVIEW_SOURCE,
      filter: ["==", ["get", "kind"], "stall_tick"],
      paint: {
        "line-color": "#ffcc00",
        "line-width": 2,
        "line-opacity": 0.9,
      },
    });
  }

  // Finalized source
  if (!map.getSource(STALL_FINAL_SOURCE)) {
    map.addSource(STALL_FINAL_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  // Final row lines (excludes tick marks)
  if (!map.getLayer("stall-final-lines")) {
    map.addLayer({
      id: "stall-final-lines",
      type: "line",
      source: STALL_FINAL_SOURCE,
      filter: ["!=", ["get", "kind"], "stall_tick"],
      paint: {
        "line-color": "#00ff88",
        "line-width": 4,
        "line-opacity": 0.95,
      },
    });
  }

  // Final tick marks
  if (!map.getLayer("stall-final-ticks")) {
    map.addLayer({
      id: "stall-final-ticks",
      type: "line",
      source: STALL_FINAL_SOURCE,
      filter: ["==", ["get", "kind"], "stall_tick"],
      paint: {
        "line-color": "#00ff88",
        "line-width": 2,
        "line-opacity": 0.95,
      },
    });
  }
}

/**
 * Update preview features (row line + tick marks) while user is dragging
 */
export function setPreviewFeatures(map: mapboxgl.Map, features: Feature[]) {
  const src = map.getSource(STALL_PREVIEW_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;

  const data: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  src.setData(data);
}

/**
 * @deprecated Use setPreviewFeatures instead
 */
export function setPreviewFeature(map: mapboxgl.Map, feature: Feature | null) {
  setPreviewFeatures(map, feature ? [feature] : []);
}

/**
 * Update the finalized stall row features (rows + tick marks)
 */
export function setFinalFeatures(map: mapboxgl.Map, features: Feature[]) {
  const src = map.getSource(STALL_FINAL_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;

  const data: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  src.setData(data);
}

/**
 * Remove all stall layers and sources from the map
 */
export function removeStallLayers(map: mapboxgl.Map) {
  try {
    if (map.getLayer("stall-preview-ticks")) map.removeLayer("stall-preview-ticks");
    if (map.getLayer("stall-final-ticks")) map.removeLayer("stall-final-ticks");
    if (map.getLayer("stall-preview-line")) map.removeLayer("stall-preview-line");
    if (map.getLayer("stall-final-lines")) map.removeLayer("stall-final-lines");
    if (map.getSource(STALL_PREVIEW_SOURCE)) map.removeSource(STALL_PREVIEW_SOURCE);
    if (map.getSource(STALL_FINAL_SOURCE)) map.removeSource(STALL_FINAL_SOURCE);
  } catch (err) {
    console.warn("Failed to remove stall layers:", err);
  }
}
