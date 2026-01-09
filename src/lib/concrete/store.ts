"use client";

import { create } from "zustand";
import type {
  ConcreteMeasurement,
  ConcreteSlabMeasurement,
  ConcreteLineMeasurement,
  ConcreteQuoteSettings,
  ConcretePricingRule,
  ConcreteLineType,
} from "./types";
import { DEFAULT_CONCRETE_SETTINGS, DEFAULT_CONCRETE_PRICING } from "./types";
import { buildConcreteQuoteItems, type ConcreteQuoteResult } from "./engine";

function now() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

type ConcreteStore = {
  // Quote-level settings
  quoteId?: string;
  settings: ConcreteQuoteSettings;
  pricingRules: ConcretePricingRule[];

  // Measurements
  measurements: ConcreteMeasurement[];
  selectedMeasurementId?: string;

  // Computed quote result
  quoteResult: ConcreteQuoteResult;

  // Active line type for LINE tool
  activeLineType: ConcreteLineType;

  // Actions
  setQuoteId: (id: string) => void;
  setSettings: (settings: Partial<ConcreteQuoteSettings>) => void;
  setPricingRules: (rules: ConcretePricingRule[]) => void;
  setActiveLineType: (type: ConcreteLineType) => void;

  // Measurement actions
  addSlab: (slab: Omit<ConcreteSlabMeasurement, "id" | "type" | "created_at" | "updated_at">) => string;
  addLine: (line: Omit<ConcreteLineMeasurement, "id" | "type" | "created_at" | "updated_at">) => string;
  updateMeasurement: (id: string, updates: Partial<ConcreteMeasurement>) => void;
  removeMeasurement: (id: string) => void;
  selectMeasurement: (id: string | undefined) => void;
  clearAll: () => void;

  // Bulk load (from Supabase or saved state)
  loadMeasurements: (measurements: ConcreteMeasurement[]) => void;
};

const INITIAL_QUOTE_RESULT: ConcreteQuoteResult = {
  items: [],
  subtotals: { base: 0, demo: 0, finish: 0, reinforcement: 0, access: 0, lines: 0 },
  total: 0,
  totalSqft: 0,
  totalLinealFeet: 0,
  totalCubicYards: 0,
};

export const useConcreteStore = create<ConcreteStore>((set, get) => ({
  settings: { ...DEFAULT_CONCRETE_SETTINGS },
  pricingRules: [...DEFAULT_CONCRETE_PRICING],
  measurements: [],
  quoteResult: INITIAL_QUOTE_RESULT,
  activeLineType: "saw_cut",

  setQuoteId: (quoteId) => set({ quoteId }),

  setSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  setPricingRules: (pricingRules) => {
    set({ pricingRules });
    // Recompute quote
    const state = get();
    const quoteResult = buildConcreteQuoteItems(state.measurements, pricingRules);
    set({ quoteResult });
  },

  setActiveLineType: (activeLineType) => set({ activeLineType }),

  addSlab: (slabData) => {
    const id = uid();
    const timestamp = now();
    const state = get();

    const slab: ConcreteSlabMeasurement = {
      id,
      type: "CONCRETE_SLAB",
      ...slabData,
      // Apply defaults from settings if not provided
      thickness_in: slabData.thickness_in ?? state.settings.default_thickness_in,
      finish: slabData.finish ?? state.settings.default_finish,
      reinforcement: slabData.reinforcement ?? state.settings.default_reinforcement,
      access_difficulty: slabData.access_difficulty ?? state.settings.default_access_difficulty,
      demo_included: slabData.demo_included ?? false,
      label: slabData.label || "Slab",
      created_at: timestamp,
      updated_at: timestamp,
    };

    const measurements = [...state.measurements, slab];
    const quoteResult = buildConcreteQuoteItems(measurements, state.pricingRules);

    set({ measurements, quoteResult, selectedMeasurementId: id });

    return id;
  },

  addLine: (lineData) => {
    const id = uid();
    const timestamp = now();
    const state = get();

    const line: ConcreteLineMeasurement = {
      id,
      type: "CONCRETE_LINE",
      ...lineData,
      line_type: lineData.line_type ?? state.activeLineType,
      label: lineData.label || (lineData.line_type === "saw_cut" ? "Saw Cuts" : "Forming"),
      created_at: timestamp,
      updated_at: timestamp,
    };

    const measurements = [...state.measurements, line];
    const quoteResult = buildConcreteQuoteItems(measurements, state.pricingRules);

    set({ measurements, quoteResult });

    return id;
  },

  updateMeasurement: (id, updates) => {
    const state = get();
    const measurements = state.measurements.map((m) => {
      if (m.id !== id) return m;
      return { ...m, ...updates, updated_at: now() } as ConcreteMeasurement;
    });

    const quoteResult = buildConcreteQuoteItems(measurements, state.pricingRules);
    set({ measurements, quoteResult });
  },

  removeMeasurement: (id) => {
    const state = get();
    const measurements = state.measurements.filter((m) => m.id !== id);
    const quoteResult = buildConcreteQuoteItems(measurements, state.pricingRules);

    set({
      measurements,
      quoteResult,
      selectedMeasurementId: state.selectedMeasurementId === id ? undefined : state.selectedMeasurementId,
    });
  },

  selectMeasurement: (selectedMeasurementId) => set({ selectedMeasurementId }),

  clearAll: () => {
    set({
      measurements: [],
      quoteResult: INITIAL_QUOTE_RESULT,
      selectedMeasurementId: undefined,
    });
  },

  loadMeasurements: (measurements) => {
    const state = get();
    const quoteResult = buildConcreteQuoteItems(measurements, state.pricingRules);
    set({ measurements, quoteResult, selectedMeasurementId: undefined });
  },
}));

// ============================================
// Selectors
// ============================================

export function useSelectedMeasurement(): ConcreteMeasurement | undefined {
  return useConcreteStore((state) => {
    if (!state.selectedMeasurementId) return undefined;
    return state.measurements.find((m) => m.id === state.selectedMeasurementId);
  });
}

export function useSlabs(): ConcreteSlabMeasurement[] {
  return useConcreteStore((state) =>
    state.measurements.filter((m): m is ConcreteSlabMeasurement => m.type === "CONCRETE_SLAB")
  );
}

export function useLines(): ConcreteLineMeasurement[] {
  return useConcreteStore((state) =>
    state.measurements.filter((m): m is ConcreteLineMeasurement => m.type === "CONCRETE_LINE")
  );
}
