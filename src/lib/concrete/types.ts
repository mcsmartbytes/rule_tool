import type { Feature, Polygon, LineString } from "geojson";

// ============================================
// Concrete Measurement Types
// ============================================

export type ConcreteFinish = "broom" | "trowel" | "stamped" | "exposed";
export type ConcreteReinforcement = "none" | "fiber" | "mesh" | "rebar";
export type AccessDifficulty = "normal" | "limited" | "wheelbarrow";
export type ConcreteLineType = "saw_cut" | "forming" | "thickened_edge";

// Thickness options in inches
export const THICKNESS_OPTIONS = [4, 5, 6, 8, 10, 12] as const;
export type ThicknessInches = (typeof THICKNESS_OPTIONS)[number] | number;

// ============================================
// Concrete Area Measurement (Slabs)
// ============================================

export type ConcreteSlabMeasurement = {
  id: string;
  type: "CONCRETE_SLAB";
  geometry: Feature<Polygon>;

  // Calculated values
  area_sqft: number;

  // Slab properties
  label: string;
  thickness_in: ThicknessInches;
  finish: ConcreteFinish;
  reinforcement: ConcreteReinforcement;
  demo_included: boolean;
  access_difficulty: AccessDifficulty;

  // Metadata
  created_at: string;
  updated_at: string;
};

// ============================================
// Concrete Line Measurement (Cuts, Forming)
// ============================================

export type ConcreteLineMeasurement = {
  id: string;
  type: "CONCRETE_LINE";
  geometry: Feature<LineString>;

  // Calculated values
  lineal_feet: number;

  // Line properties
  label: string;
  line_type: ConcreteLineType;

  // Metadata
  created_at: string;
  updated_at: string;
};

// Union type for all concrete measurements
export type ConcreteMeasurement = ConcreteSlabMeasurement | ConcreteLineMeasurement;

// ============================================
// Quote-Level Concrete Settings (Defaults)
// ============================================

export type ConcreteQuoteSettings = {
  job_type: "residential" | "commercial";
  default_thickness_in: ThicknessInches;
  default_finish: ConcreteFinish;
  default_reinforcement: ConcreteReinforcement;
  default_access_difficulty: AccessDifficulty;
};

export const DEFAULT_CONCRETE_SETTINGS: ConcreteQuoteSettings = {
  job_type: "residential",
  default_thickness_in: 4,
  default_finish: "broom",
  default_reinforcement: "fiber",
  default_access_difficulty: "normal",
};

// ============================================
// Pricing Rule Types
// ============================================

export type ConcretePricingRule = {
  id: string;
  service_key: ConcreteServiceKey;
  base_unit: "sqft" | "lf" | "each";
  base_rate: number;

  // Optional condition matchers
  thickness_in?: ThicknessInches;
  finish?: ConcreteFinish;
  reinforcement?: ConcreteReinforcement;
  access_difficulty?: AccessDifficulty;

  // Modifiers when conditions match
  rate_modifier?: number; // +/- per unit
  flat_fee?: number;
};

// ============================================
// Concrete Service Keys
// ============================================

export type ConcreteServiceKey =
  | "concrete_base"
  | "concrete_demo"
  | "saw_cut"
  | "forming"
  | "thickened_edge"
  | "steps"
  | "finish_stamped"
  | "finish_exposed"
  | "reinforcement_mesh"
  | "reinforcement_rebar"
  | "access_limited"
  | "access_wheelbarrow";

// ============================================
// Quote Item (Pricing Output)
// ============================================

export type ConcreteQuoteItem = {
  id: string;
  service_key: ConcreteServiceKey;
  source_measurement_id?: string;

  label: string;
  quantity: number;
  unit: "sqft" | "lf" | "each";
  unit_price: number;
  total: number;

  // For display grouping
  category: "base" | "demo" | "finish" | "reinforcement" | "access" | "lines";
};

// ============================================
// Volume Calculation Helper
// ============================================

/**
 * Calculate cubic yards from area and thickness.
 * Formula: yd³ = (area_sqft × thickness_in / 12) / 27
 */
export function calcCubicYards(areaSqft: number, thicknessIn: number): number {
  if (areaSqft <= 0 || thicknessIn <= 0) return 0;
  return (areaSqft * (thicknessIn / 12)) / 27;
}

/**
 * Calculate total volume from multiple slabs
 */
export function calcTotalCubicYards(slabs: ConcreteSlabMeasurement[]): number {
  return slabs.reduce((sum, slab) => {
    return sum + calcCubicYards(slab.area_sqft, slab.thickness_in);
  }, 0);
}

// ============================================
// Default Pricing Rules (Company-level defaults)
// ============================================

export const DEFAULT_CONCRETE_PRICING: ConcretePricingRule[] = [
  // Base concrete pricing
  { id: "base-4in", service_key: "concrete_base", base_unit: "sqft", base_rate: 5.50, thickness_in: 4 },
  { id: "base-6in", service_key: "concrete_base", base_unit: "sqft", base_rate: 6.50, thickness_in: 6 },
  { id: "base-8in", service_key: "concrete_base", base_unit: "sqft", base_rate: 8.00, thickness_in: 8 },

  // Demo pricing
  { id: "demo", service_key: "concrete_demo", base_unit: "sqft", base_rate: 2.25 },

  // Finish modifiers
  { id: "finish-stamped", service_key: "finish_stamped", base_unit: "sqft", base_rate: 0, rate_modifier: 4.00, finish: "stamped" },
  { id: "finish-exposed", service_key: "finish_exposed", base_unit: "sqft", base_rate: 0, rate_modifier: 2.50, finish: "exposed" },

  // Reinforcement modifiers
  { id: "rebar-mesh", service_key: "reinforcement_mesh", base_unit: "sqft", base_rate: 0, rate_modifier: 0.75, reinforcement: "mesh" },
  { id: "rebar-rebar", service_key: "reinforcement_rebar", base_unit: "sqft", base_rate: 0, rate_modifier: 1.50, reinforcement: "rebar" },

  // Access modifiers
  { id: "access-limited", service_key: "access_limited", base_unit: "sqft", base_rate: 0, rate_modifier: 1.00, access_difficulty: "limited" },
  { id: "access-wheelbarrow", service_key: "access_wheelbarrow", base_unit: "sqft", base_rate: 0, rate_modifier: 2.00, access_difficulty: "wheelbarrow" },

  // Line services
  { id: "saw-cut", service_key: "saw_cut", base_unit: "lf", base_rate: 1.50 },
  { id: "forming", service_key: "forming", base_unit: "lf", base_rate: 4.50 },
  { id: "thickened-edge", service_key: "thickened_edge", base_unit: "lf", base_rate: 6.00 },
];

// ============================================
// Display Helpers
// ============================================

export const FINISH_LABELS: Record<ConcreteFinish, string> = {
  broom: "Broom Finish",
  trowel: "Trowel Finish",
  stamped: "Stamped",
  exposed: "Exposed Aggregate",
};

export const REINFORCEMENT_LABELS: Record<ConcreteReinforcement, string> = {
  none: "No Reinforcement",
  fiber: "Fiber Mesh",
  mesh: "Wire Mesh",
  rebar: "Rebar",
};

export const ACCESS_LABELS: Record<AccessDifficulty, string> = {
  normal: "Normal Access",
  limited: "Limited Access",
  wheelbarrow: "Wheelbarrow Only",
};

export const LINE_TYPE_LABELS: Record<ConcreteLineType, string> = {
  saw_cut: "Saw Cuts",
  forming: "Forming/Edges",
  thickened_edge: "Thickened Edge",
};
