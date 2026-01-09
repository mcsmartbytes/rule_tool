"use client";

import type mapboxgl from "mapbox-gl";
import { getGoogleTilesSession } from "@/lib/googleTilesSession";

const GOOGLE_SOURCE_ID = "google-sat-src";
const GOOGLE_LAYER_ID = "google-sat-layer";

function findFirstSymbolLayerId(map: mapboxgl.Map): string | undefined {
  const style = map.getStyle();
  if (!style) return undefined;
  const layers = style.layers || [];
  const symbol = layers.find((l) => l.type === "symbol");
  return symbol?.id;
}

export async function enableGoogleSatellite(map: mapboxgl.Map) {
  const session = await getGoogleTilesSession();

  // Add source if missing
  if (!map.getSource(GOOGLE_SOURCE_ID)) {
    map.addSource(GOOGLE_SOURCE_ID, {
      type: "raster",
      tiles: [session.tileUrlTemplate],
      tileSize: 256,
    });
  }

  // Add layer if missing
  if (!map.getLayer(GOOGLE_LAYER_ID)) {
    const beforeId = findFirstSymbolLayerId(map);
    map.addLayer(
      {
        id: GOOGLE_LAYER_ID,
        type: "raster",
        source: GOOGLE_SOURCE_ID,
      },
      beforeId
    );
  }

  map.setLayoutProperty(GOOGLE_LAYER_ID, "visibility", "visible");

  return session;
}

export function disableGoogleSatellite(map: mapboxgl.Map) {
  if (map.getLayer(GOOGLE_LAYER_ID)) {
    map.setLayoutProperty(GOOGLE_LAYER_ID, "visibility", "none");
  }
}

export function isGoogleSatelliteEnabled(map: mapboxgl.Map): boolean {
  if (!map.getLayer(GOOGLE_LAYER_ID)) return false;
  const visibility = map.getLayoutProperty(GOOGLE_LAYER_ID, "visibility");
  return visibility === "visible";
}
