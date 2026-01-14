"use client";

import { useCallback, useEffect, useState } from "react";
import { useConcreteStore, useSelectedMeasurement } from "@/lib/concrete/store";
import {
  THICKNESS_OPTIONS,
  FINISH_LABELS,
  REINFORCEMENT_LABELS,
  ACCESS_LABELS,
  calcCubicYards,
  type ConcreteSlabMeasurement,
  type ConcreteFinish,
  type ConcreteReinforcement,
  type AccessDifficulty,
  type ThicknessInches,
} from "@/lib/concrete/types";
import { calcSlabPreviewTotal } from "@/lib/concrete/engine";

type Props = {
  onClose?: () => void;
};

export default function ConcreteSlabDetails({ onClose }: Props) {
  const measurement = useSelectedMeasurement();
  const updateMeasurement = useConcreteStore((s) => s.updateMeasurement);
  const removeMeasurement = useConcreteStore((s) => s.removeMeasurement);
  const selectMeasurement = useConcreteStore((s) => s.selectMeasurement);
  const pricingRules = useConcreteStore((s) => s.pricingRules);

  // Local state for debounced updates
  const [localLabel, setLocalLabel] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync local label with measurement
  useEffect(() => {
    if (measurement?.type === "CONCRETE_SLAB") {
      setLocalLabel(measurement.label);
    }
  }, [measurement]);

  // Debounced label update
  const updateLabel = useCallback(
    (value: string) => {
      setLocalLabel(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        if (measurement) {
          updateMeasurement(measurement.id, { label: value });
        }
      }, 500);
      setDebounceTimer(timer);
    },
    [measurement, updateMeasurement, debounceTimer]
  );

  // Immediate update for selects/toggles
  const updateField = useCallback(
    <K extends keyof ConcreteSlabMeasurement>(field: K, value: ConcreteSlabMeasurement[K]) => {
      if (measurement) {
        updateMeasurement(measurement.id, { [field]: value });
      }
    },
    [measurement, updateMeasurement]
  );

  const handleDelete = useCallback(() => {
    if (measurement && confirm("Delete this slab?")) {
      removeMeasurement(measurement.id);
      selectMeasurement(undefined);
      onClose?.();
    }
  }, [measurement, removeMeasurement, selectMeasurement, onClose]);

  const handleClose = useCallback(() => {
    selectMeasurement(undefined);
    onClose?.();
  }, [selectMeasurement, onClose]);

  if (!measurement || measurement.type !== "CONCRETE_SLAB") {
    return null;
  }

  const slab = measurement as ConcreteSlabMeasurement;
  const cubicYards = calcCubicYards(slab.area_sqft, slab.thickness_in);
  const slabTotal = calcSlabPreviewTotal(slab, pricingRules);

  return (
    <div className="glass" style={{ padding: 16, borderRadius: 12, minWidth: 280 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Slab Details</div>
        <button
          onClick={handleClose}
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
      </div>

      {/* Label */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Label
        </label>
        <input
          type="text"
          value={localLabel}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Driveway, Walkway, Patio..."
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "inherit",
            fontSize: 13,
          }}
        />
      </div>

      {/* Thickness */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Thickness (inches)
        </label>
        <select
          value={slab.thickness_in}
          onChange={(e) => updateField("thickness_in", Number(e.target.value) as ThicknessInches)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "inherit",
            fontSize: 13,
          }}
        >
          {THICKNESS_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}″
            </option>
          ))}
        </select>
      </div>

      {/* Finish */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Finish
        </label>
        <select
          value={slab.finish}
          onChange={(e) => updateField("finish", e.target.value as ConcreteFinish)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "inherit",
            fontSize: 13,
          }}
        >
          {Object.entries(FINISH_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Reinforcement */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Reinforcement
        </label>
        <select
          value={slab.reinforcement}
          onChange={(e) => updateField("reinforcement", e.target.value as ConcreteReinforcement)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "inherit",
            fontSize: 13,
          }}
        >
          {Object.entries(REINFORCEMENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Access Difficulty */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Access
        </label>
        <select
          value={slab.access_difficulty}
          onChange={(e) => updateField("access_difficulty", e.target.value as AccessDifficulty)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "inherit",
            fontSize: 13,
          }}
        >
          {Object.entries(ACCESS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Demo Toggle */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={slab.demo_included}
            onChange={(e) => updateField("demo_included", e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <span>Include Demo/Removal</span>
        </label>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--glass-border)", margin: "12px 0" }} />

      {/* Calculations */}
      <div style={{ display: "grid", gap: 8, fontSize: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>Area:</span>
          <span>{slab.area_sqft.toLocaleString()} sq ft</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>Thickness:</span>
          <span>{slab.thickness_in}″</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>Volume:</span>
          <span style={{ fontWeight: 600 }}>{cubicYards.toFixed(2)} yd³</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ color: "var(--muted)" }}>Slab Subtotal:</span>
          <span style={{ fontWeight: 600, color: "var(--accent)" }}>
            ${slabTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ff4444",
          background: "rgba(255, 68, 68, 0.1)",
          color: "#ff4444",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Delete Slab
      </button>
    </div>
  );
}
