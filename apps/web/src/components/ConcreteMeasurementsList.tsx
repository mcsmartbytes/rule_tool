"use client";

import { useConcreteStore, useSlabs, useLines } from "@/lib/concrete/store";
import {
  calcCubicYards,
  LINE_TYPE_LABELS,
  FINISH_LABELS,
  type ConcreteSlabMeasurement,
  type ConcreteLineMeasurement,
} from "@/lib/concrete/types";

type Props = {
  onClose?: () => void;
  onZoomTo?: (lng: number, lat: number) => void;
};

export default function ConcreteMeasurementsList({ onClose, onZoomTo }: Props) {
  const slabs = useSlabs();
  const lines = useLines();
  const selectMeasurement = useConcreteStore((s) => s.selectMeasurement);
  const removeMeasurement = useConcreteStore((s) => s.removeMeasurement);
  const selectedId = useConcreteStore((s) => s.selectedMeasurementId);

  const handleSelectSlab = (slab: ConcreteSlabMeasurement) => {
    selectMeasurement(slab.id);

    // Zoom to centroid if callback provided
    if (onZoomTo && slab.geometry?.geometry?.coordinates?.[0]) {
      const coords = slab.geometry.geometry.coordinates[0] as [number, number][];
      const centroid = coords.reduce(
        (acc, c) => ({ lng: acc.lng + c[0] / coords.length, lat: acc.lat + c[1] / coords.length }),
        { lng: 0, lat: 0 }
      );
      onZoomTo(centroid.lng, centroid.lat);
    }
  };

  const handleSelectLine = (line: ConcreteLineMeasurement) => {
    selectMeasurement(line.id);

    // Zoom to midpoint if callback provided
    if (onZoomTo && line.geometry?.geometry?.coordinates) {
      const coords = line.geometry.geometry.coordinates as [number, number][];
      if (coords.length >= 2) {
        const mid = Math.floor(coords.length / 2);
        onZoomTo(coords[mid][0], coords[mid][1]);
      }
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this measurement?")) {
      removeMeasurement(id);
    }
  };

  const isEmpty = slabs.length === 0 && lines.length === 0;

  return (
    <div className="glass" style={{ padding: 16, borderRadius: 12, minWidth: 300, maxHeight: "70vh", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Measurements</div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        )}
      </div>

      {isEmpty ? (
        <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>
          No measurements yet. Draw polygons for slabs or lines for cuts.
        </div>
      ) : (
        <>
          {/* Slabs Section */}
          {slabs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>
                SLABS ({slabs.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {slabs.map((slab) => {
                  const yd3 = calcCubicYards(slab.area_sqft, slab.thickness_in);
                  const isSelected = selectedId === slab.id;
                  return (
                    <div
                      key={slab.id}
                      onClick={() => handleSelectSlab(slab)}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: isSelected ? "rgba(0,255,136,0.15)" : "rgba(0,0,0,0.2)",
                        border: isSelected ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{slab.label}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {slab.area_sqft.toLocaleString()} sqft &middot; {slab.thickness_in}" &middot;{" "}
                            {FINISH_LABELS[slab.finish]}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            <strong>{yd3.toFixed(2)} yd³</strong>
                            {slab.demo_included && <span style={{ marginLeft: 6, color: "#ff8c8c" }}>+ Demo</span>}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(slab.id, e)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#ff4444",
                            fontSize: 16,
                            padding: 4,
                            lineHeight: 1,
                          }}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lines Section */}
          {lines.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>
                LINES ({lines.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {lines.map((line) => {
                  const isSelected = selectedId === line.id;
                  return (
                    <div
                      key={line.id}
                      onClick={() => handleSelectLine(line)}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: isSelected ? "rgba(0,255,136,0.15)" : "rgba(0,0,0,0.2)",
                        border: isSelected ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                            {LINE_TYPE_LABELS[line.line_type] || line.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {line.lineal_feet.toFixed(0)} lineal feet
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(line.id, e)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#ff4444",
                            fontSize: 16,
                            padding: 4,
                            lineHeight: 1,
                          }}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
