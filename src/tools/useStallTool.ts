"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import type { Feature, LineString } from "geojson";
import {
  ensureStallSourcesAndLayers,
  setFinalFeatures,
  setPreviewFeatures,
} from "@/lib/stallLayers";
import { buildStallTickFeatures } from "@/lib/stallTicks";
import {
  calcLinealFeet,
  calcStallCount,
  feetFromMeters,
} from "@/lib/stripingMath";
import type { StallGroupMeasurement, StallLayout } from "@/types/measurements";

type StallToolOptions = {
  /** Whether the tool is currently active */
  enabled: boolean;

  /** Default stall width in feet (typically 9) */
  stallWidthFt?: number;

  /** Default stall depth in feet (typically 18) */
  stallDepthFt?: number;

  /** Single or double row layout */
  layout?: StallLayout;

  /** Whether row includes accessible stalls */
  hasAccessible?: boolean;

  /** Number of accessible stalls in the row */
  accessibleCount?: number;

  /** Whether to include stop bars */
  hasStopBars?: boolean;

  /** How to calculate stop bar count: auto (1 per stall) or manual */
  stopBarCountMode?: "auto" | "manual";

  /** Manual stop bar count if mode is manual */
  stopBarCountManual?: number;

  /** Existing measurements to render on the map */
  existing: StallGroupMeasurement[];

  /** Callback when a new stall group is created */
  onCreate: (m: StallGroupMeasurement) => void;

  /** Optional callback for live preview values while dragging */
  onLiveUpdate?: (
    live: {
      rowLengthFt: number;
      stallCount: number;
      linealFeet: number;
    } | null
  ) => void;

  /** Callback when a stall group is deleted */
  onDelete?: (id: string) => void;
};

function uuid(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function lineFeature(
  a: mapboxgl.LngLatLike,
  b: mapboxgl.LngLatLike,
  mapboxgl: typeof import("mapbox-gl")
): Feature<LineString> {
  const A = mapboxgl.LngLat.convert(a);
  const B = mapboxgl.LngLat.convert(b);

  return {
    type: "Feature",
    properties: { kind: "stall_row" },
    geometry: {
      type: "LineString",
      coordinates: [
        [A.lng, A.lat],
        [B.lng, B.lat],
      ],
    },
  };
}

export function useStallTool(
  map: mapboxgl.Map | null,
  opts: StallToolOptions
) {
  const {
    enabled,
    stallWidthFt = 9,
    stallDepthFt = 18,
    layout = "single",
    hasAccessible = false,
    accessibleCount = 0,
    hasStopBars = false,
    stopBarCountMode = "auto",
    stopBarCountManual = 0,
    existing,
    onCreate,
    onLiveUpdate,
    onDelete,
  } = opts;

  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<mapboxgl.LngLat | null>(null);
  const lastRef = useRef<mapboxgl.LngLat | null>(null);
  const mapboxglRef = useRef<typeof import("mapbox-gl") | null>(null);
  const mapReadyRef = useRef(false);

  // Build features for existing measurements (rows + tick marks)
  const buildExistingFeatures = useCallback(() => {
    if (!map || !mapReadyRef.current) return [];

    const feats: Feature[] = [];

    for (const m of existing) {
      const row = m.geometry as Feature<LineString>;
      const coords = row.geometry.coordinates;
      if (!coords?.length || coords.length < 2) continue;

      const mapboxgl = mapboxglRef.current;
      if (!mapboxgl) continue;

      const start = new mapboxgl.LngLat(coords[0][0], coords[0][1]);
      const end = new mapboxgl.LngLat(coords[1][0], coords[1][1]);

      // Add the row line
      feats.push({
        ...row,
        properties: {
          ...(row.properties ?? {}),
          kind: "stall_row",
          measurementId: m.id,
          type: "STALL_GROUP",
          stall_count: m.stall_count,
          lineal_feet: m.lineal_feet,
          layout: m.layout,
        },
      });

      // Add tick marks
      const ticks = buildStallTickFeatures({
        map,
        start,
        end,
        stallWidthFt: m.stall_width_ft,
        tickLengthFt: 2.5,
        includeEnds: false,
        featureProps: { measurementId: m.id },
      });

      feats.push(...ticks);
    }

    return feats;
  }, [map, existing]);

  // Load mapbox-gl dynamically and ensure layers exist
  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const mapboxgl = await import("mapbox-gl");
        if (cancelled) return;
        mapboxglRef.current = mapboxgl;

        const initLayers = () => {
          if (cancelled) return;
          ensureStallSourcesAndLayers(map);
          mapReadyRef.current = true;
          // Now that map is ready, build and set features
          const features = buildExistingFeatures();
          setFinalFeatures(map, features);
        };

        if (map.isStyleLoaded()) {
          initLayers();
        } else {
          map.once("load", initLayers);
        }
      } catch (err) {
        console.warn("Failed to setup stall tool:", err);
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [map, buildExistingFeatures]);

  // Update final features when existing measurements change
  useEffect(() => {
    if (!map || !mapReadyRef.current) return;
    const features = buildExistingFeatures();
    setFinalFeatures(map, features);
  }, [map, existing, buildExistingFeatures]);

  // Update cursor when tool is enabled/disabled
  useEffect(() => {
    if (!map) return;

    if (enabled) {
      map.getCanvas().style.cursor = "crosshair";
    } else {
      map.getCanvas().style.cursor = "";
    }

    return () => {
      if (map) {
        map.getCanvas().style.cursor = "";
      }
    };
  }, [map, enabled]);

  // Main tool interaction handlers
  useEffect(() => {
    if (!map || !mapboxglRef.current) return;

    const mapboxgl = mapboxglRef.current;

    // Cleanup when disabled
    if (!enabled) {
      setPreviewFeatures(map, []);
      onLiveUpdate?.(null);
      setIsDragging(false);
      startRef.current = null;
      lastRef.current = null;
      return;
    }

    const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
      // Start the row
      setIsDragging(true);
      startRef.current = e.lngLat;
      lastRef.current = e.lngLat;

      // Prevent map drag while drawing
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!isDragging || !startRef.current) return;

      lastRef.current = e.lngLat;

      const start = startRef.current;
      const end = e.lngLat;

      const meters = start.distanceTo(end);
      const rowLengthFt = feetFromMeters(meters);
      const stallCount = calcStallCount(rowLengthFt, stallWidthFt);
      const linealFeet = calcLinealFeet(stallCount, stallDepthFt, layout);

      // Build row line feature
      const row = lineFeature(start, end, mapboxgl);

      // Build tick mark features
      const ticks = buildStallTickFeatures({
        map,
        start,
        end,
        stallWidthFt,
        tickLengthFt: 2.5,
        includeEnds: false,
        featureProps: { parent: "preview" },
      });

      // Set all preview features (row + ticks)
      setPreviewFeatures(map, [row, ...ticks]);
      onLiveUpdate?.({ rowLengthFt, stallCount, linealFeet });
    };

    const finish = () => {
      if (!startRef.current || !lastRef.current) return;

      const start = startRef.current;
      const end = lastRef.current;

      const meters = start.distanceTo(end);
      const rowLengthFt = feetFromMeters(meters);
      const stallCount = calcStallCount(rowLengthFt, stallWidthFt);

      // If barely dragged, treat as cancel
      if (stallCount <= 0 || rowLengthFt < stallWidthFt * 0.75) {
        setPreviewFeatures(map, []);
        onLiveUpdate?.(null);
        return;
      }

      const linealFeet = calcLinealFeet(stallCount, stallDepthFt, layout);

      const stopBarCount = hasStopBars
        ? stopBarCountMode === "auto"
          ? stallCount
          : Math.max(0, stopBarCountManual)
        : 0;

      const measurement: StallGroupMeasurement = {
        id: uuid(),
        type: "STALL_GROUP",
        geometry: lineFeature(start, end, mapboxgl),
        row_length_ft: rowLengthFt,
        stall_width_ft: stallWidthFt,
        stall_depth_ft: stallDepthFt,
        stall_count: stallCount,
        lineal_feet: linealFeet,
        layout,
        has_accessible: hasAccessible,
        accessible_count: hasAccessible
          ? Math.min(accessibleCount, stallCount)
          : 0,
        has_stop_bars: hasStopBars,
        stop_bar_count: stopBarCount,
        created_at: new Date().toISOString(),
      };

      onCreate(measurement);

      // Clear preview
      setPreviewFeatures(map, []);
      onLiveUpdate?.(null);
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);

      finish();

      // Re-enable map interactions
      map.dragPan.enable();
      map.doubleClickZoom.enable();

      startRef.current = null;
      lastRef.current = null;
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setIsDragging(false);
        startRef.current = null;
        lastRef.current = null;
        setPreviewFeatures(map, []);
        onLiveUpdate?.(null);

        map.dragPan.enable();
        map.doubleClickZoom.enable();
      }
    };

    // Attach event listeners
    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);

      // Restore interactions if tool unmounts mid-drag
      try {
        map.dragPan.enable();
        map.doubleClickZoom.enable();
      } catch {}
      setPreviewFeatures(map, []);
      onLiveUpdate?.(null);
    };
  }, [
    map,
    enabled,
    isDragging,
    stallWidthFt,
    stallDepthFt,
    layout,
    hasAccessible,
    accessibleCount,
    hasStopBars,
    stopBarCountMode,
    stopBarCountManual,
    onCreate,
    onLiveUpdate,
  ]);

  return {
    isDragging,
    /** Manually trigger a delete for a stall group */
    deleteStallGroup: (id: string) => {
      onDelete?.(id);
    },
  };
}
