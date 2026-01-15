"use client";

import { useConcreteStore } from "@/lib/concrete/store";
import { LINE_TYPE_LABELS, type ConcreteLineType } from "@/lib/concrete/types";

const LINE_TYPES: ConcreteLineType[] = ["saw_cut", "forming", "thickened_edge"];

type Props = {
  disabled?: boolean;
};

export default function ConcreteLineSelector({ disabled }: Props) {
  const activeLineType = useConcreteStore((s) => s.activeLineType);
  const setActiveLineType = useConcreteStore((s) => s.setActiveLineType);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Line Type</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {LINE_TYPES.map((type) => {
          const isActive = activeLineType === type;
          return (
            <button
              key={type}
              onClick={() => setActiveLineType(type)}
              disabled={disabled}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                borderRadius: 4,
                border: isActive ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                background: isActive ? "rgba(0,255,136,0.15)" : "rgba(0,0,0,0.2)",
                color: isActive ? "var(--accent)" : "inherit",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {LINE_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
