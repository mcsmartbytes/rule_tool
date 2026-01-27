"use client";

import { useConcreteStore, useSlabs, useLines } from "@/lib/concrete/store";
import { LINE_TYPE_LABELS } from "@/lib/concrete/types";

type Props = {
  onShowList?: () => void;
};

export default function LiveQuotePanelConcrete({ onShowList }: Props) {
  const quoteResult = useConcreteStore((s) => s.quoteResult);
  const slabs = useSlabs();
  const lines = useLines();

  const { total, totalSqft, totalLinealFeet, totalCubicYards, subtotals, items } = quoteResult;

  // Group slabs by label for display
  const slabGroups = slabs.reduce(
    (acc, slab) => {
      const key = slab.label || "Slab";
      if (!acc[key]) {
        acc[key] = { count: 0, sqft: 0, yd3: 0 };
      }
      acc[key].count += 1;
      acc[key].sqft += slab.area_sqft;
      acc[key].yd3 += (slab.area_sqft * (slab.thickness_in / 12)) / 27;
      return acc;
    },
    {} as Record<string, { count: number; sqft: number; yd3: number }>
  );

  // Group lines by type
  const lineGroups = lines.reduce(
    (acc, line) => {
      const key = line.line_type;
      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += line.lineal_feet;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasData = slabs.length > 0 || lines.length > 0;

  return (
    <div className="glass" style={{ padding: 16, borderRadius: 12, minWidth: 260 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Concrete Quote</div>
        {hasData && onShowList && (
          <button
            onClick={onShowList}
            style={{
              padding: "4px 8px",
              fontSize: 11,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid var(--glass-border)",
              borderRadius: 4,
              color: "inherit",
              cursor: "pointer",
            }}
          >
            View List
          </button>
        )}
      </div>

      {!hasData ? (
        <div style={{ fontSize: 12, color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>
          Draw polygons for slabs or lines for saw cuts/forming
        </div>
      ) : (
        <>
          {/* Total */}
          <div
            style={{
              background: "rgba(0,255,136,0.1)",
              border: "1px solid rgba(0,255,136,0.3)",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Estimated Total</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Summary Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div style={{ background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 6, textAlign: "center" }}>
              <div style={{ color: "var(--muted)", fontSize: 10, marginBottom: 2 }}>Total Area</div>
              <div style={{ fontWeight: 600 }}>{totalSqft.toLocaleString()} sqft</div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 6, textAlign: "center" }}>
              <div style={{ color: "var(--muted)", fontSize: 10, marginBottom: 2 }}>Est. Concrete</div>
              <div style={{ fontWeight: 600 }}>{totalCubicYards.toFixed(2)} yd³</div>
            </div>
          </div>

          {/* Slabs Section */}
          {slabs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>
                SLABS ({slabs.length})
              </div>
              {Object.entries(slabGroups).map(([label, data]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    padding: "4px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span>
                    {label} {data.count > 1 && `(${data.count})`}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    {data.sqft.toLocaleString()} sqft / {data.yd3.toFixed(1)} yd³
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Demo if any */}
          {subtotals.demo > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                padding: "4px 0",
                marginBottom: 8,
              }}
            >
              <span>Demo/Removal</span>
              <span>${subtotals.demo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* Lines Section */}
          {lines.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>
                LINES ({lines.length})
              </div>
              {Object.entries(lineGroups).map(([type, lf]) => (
                <div
                  key={type}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    padding: "4px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span>{LINE_TYPE_LABELS[type as keyof typeof LINE_TYPE_LABELS] || type}</span>
                  <span style={{ color: "var(--muted)" }}>{lf.toFixed(0)} lf</span>
                </div>
              ))}
            </div>
          )}

          {/* Subtotals Breakdown */}
          <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 12, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>
              BREAKDOWN
            </div>
            <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
              {subtotals.base > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Base Concrete</span>
                  <span>${subtotals.base.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {subtotals.demo > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Demo</span>
                  <span>${subtotals.demo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {subtotals.finish > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Finish Upgrades</span>
                  <span>${subtotals.finish.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {subtotals.reinforcement > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Reinforcement</span>
                  <span>${subtotals.reinforcement.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {subtotals.access > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Access Difficulty</span>
                  <span>${subtotals.access.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {subtotals.lines > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Cuts & Forming</span>
                  <span>${subtotals.lines.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
