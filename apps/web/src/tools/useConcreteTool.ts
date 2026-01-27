"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import type { Feature, Polygon, LineString } from "geojson";
import { useConcreteStore } from "@/lib/concrete/store";
import type { ConcreteLineType } from "@/lib/concrete/types";

const SQFT_PER_SQM = 10.76391041671;
const FT_PER_METER = 3.2808398950131;

type ConcreteToolOptions = {
  enabled: boolean;
  onSlabCreated?: (id: string) => void;
  onLineCreated?: (id: string) => void;
};

export function useConcreteTool(
  map: MapboxMap | null,
  draw: any | null,
  options: ConcreteToolOptions
) {
  const { enabled, onSlabCreated, onLineCreated } = options;
  const turfRef = useRef<any>(null);
  const handlerRef = useRef<((e: any) => void) | null>(null);

  // Store actions
  const addSlab = useConcreteStore((s) => s.addSlab);
  const addLine = useConcreteStore((s) => s.addLine);
  const activeLineType = useConcreteStore((s) => s.activeLineType);
  const settings = useConcreteStore((s) => s.settings);

  // Load turf on mount
  useEffect(() => {
    import("@turf/turf").then((turf) => {
      turfRef.current = turf;
    });
  }, []);

  const handleDrawCreate = useCallback(
    (e: any) => {
      if (!enabled) return;
      const turf = turfRef.current;
      if (!turf) return;

      const features = e.features as Feature[];

      features.forEach((feature) => {
        const geomType = feature.geometry?.type;

        if (geomType === "Polygon" || geomType === "MultiPolygon") {
          // Calculate area
          let areaSqM = 0;
          try {
            areaSqM = turf.area(feature);
          } catch {
            return;
          }
          const areaSqft = Math.round(areaSqM * SQFT_PER_SQM);

          if (areaSqft <= 0) return;

          // Create slab with defaults from settings
          const id = addSlab({
            geometry: feature as Feature<Polygon>,
            area_sqft: areaSqft,
            label: `Slab ${areaSqft.toLocaleString()} sqft`,
            thickness_in: settings.default_thickness_in,
            finish: settings.default_finish,
            reinforcement: settings.default_reinforcement,
            demo_included: false,
            access_difficulty: settings.default_access_difficulty,
          });

          onSlabCreated?.(id);
        } else if (geomType === "LineString" || geomType === "MultiLineString") {
          // Calculate length
          let lengthM = 0;
          try {
            lengthM = turf.length(feature, { units: "meters" });
          } catch {
            return;
          }
          const lengthFt = Math.round(lengthM * FT_PER_METER);

          if (lengthFt <= 0) return;

          // Create line with active line type
          const id = addLine({
            geometry: feature as Feature<LineString>,
            lineal_feet: lengthFt,
            label: getLabelForLineType(activeLineType, lengthFt),
            line_type: activeLineType,
          });

          onLineCreated?.(id);
        }
      });
    },
    [enabled, addSlab, addLine, activeLineType, settings, onSlabCreated, onLineCreated]
  );

  // Attach/detach event handler
  useEffect(() => {
    if (!map || !enabled) {
      // Remove existing handler
      if (handlerRef.current && map) {
        try {
          map.off("draw.create", handlerRef.current);
        } catch {}
        handlerRef.current = null;
      }
      return;
    }

    // Create and attach handler
    handlerRef.current = handleDrawCreate;
    map.on("draw.create", handleDrawCreate);

    return () => {
      if (handlerRef.current && map) {
        try {
          map.off("draw.create", handlerRef.current);
        } catch {}
        handlerRef.current = null;
      }
    };
  }, [map, enabled, handleDrawCreate]);
}

function getLabelForLineType(lineType: ConcreteLineType, lengthFt: number): string {
  switch (lineType) {
    case "saw_cut":
      return `Saw Cuts (${lengthFt} lf)`;
    case "forming":
      return `Forming (${lengthFt} lf)`;
    case "thickened_edge":
      return `Thickened Edge (${lengthFt} lf)`;
    default:
      return `Line (${lengthFt} lf)`;
  }
}
