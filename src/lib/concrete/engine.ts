import type {
  ConcreteMeasurement,
  ConcreteSlabMeasurement,
  ConcreteLineMeasurement,
  ConcretePricingRule,
  ConcreteQuoteItem,
  ConcreteServiceKey,
} from "./types";
import { DEFAULT_CONCRETE_PRICING } from "./types";

function uuid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

// ============================================
// Concrete Quote Builder
// ============================================

export type ConcreteQuoteResult = {
  items: ConcreteQuoteItem[];
  subtotals: {
    base: number;
    demo: number;
    finish: number;
    reinforcement: number;
    access: number;
    lines: number;
  };
  total: number;
  totalSqft: number;
  totalLinealFeet: number;
  totalCubicYards: number;
};

/**
 * Build quote items from concrete measurements using pricing rules.
 * This is the core pricing engine for concrete.
 */
export function buildConcreteQuoteItems(
  measurements: ConcreteMeasurement[],
  pricingRules: ConcretePricingRule[] = DEFAULT_CONCRETE_PRICING
): ConcreteQuoteResult {
  const items: ConcreteQuoteItem[] = [];

  const slabs = measurements.filter((m): m is ConcreteSlabMeasurement => m.type === "CONCRETE_SLAB");
  const lines = measurements.filter((m): m is ConcreteLineMeasurement => m.type === "CONCRETE_LINE");

  // Helper to find base rate by thickness
  const getBaseRate = (thicknessIn: number): number => {
    // Find exact match first
    const exactMatch = pricingRules.find(
      (r) => r.service_key === "concrete_base" && r.thickness_in === thicknessIn
    );
    if (exactMatch) return exactMatch.base_rate;

    // Find closest thickness
    const baseRules = pricingRules.filter((r) => r.service_key === "concrete_base" && r.thickness_in);
    if (baseRules.length === 0) return 6.0; // fallback

    const closest = baseRules.reduce((prev, curr) => {
      const prevDiff = Math.abs((prev.thickness_in || 0) - thicknessIn);
      const currDiff = Math.abs((curr.thickness_in || 0) - thicknessIn);
      return currDiff < prevDiff ? curr : prev;
    });
    return closest.base_rate;
  };

  // Helper to get modifier rate
  const getModifierRate = (serviceKey: ConcreteServiceKey, matcher: Partial<ConcreteSlabMeasurement>): number => {
    const rule = pricingRules.find((r) => {
      if (r.service_key !== serviceKey) return false;

      // Check all condition matchers
      if (r.finish && r.finish !== matcher.finish) return false;
      if (r.reinforcement && r.reinforcement !== matcher.reinforcement) return false;
      if (r.access_difficulty && r.access_difficulty !== matcher.access_difficulty) return false;

      return true;
    });

    return rule?.rate_modifier ?? 0;
  };

  // Helper to get line rate
  const getLineRate = (lineType: string): number => {
    const rule = pricingRules.find((r) => r.service_key === lineType);
    return rule?.base_rate ?? 0;
  };

  // Process each slab
  for (const slab of slabs) {
    const { id, label, area_sqft, thickness_in, finish, reinforcement, demo_included, access_difficulty } = slab;

    // 1. Base concrete cost
    const baseRate = getBaseRate(thickness_in);
    items.push({
      id: uuid(),
      service_key: "concrete_base",
      source_measurement_id: id,
      label: `${label} - Concrete (${thickness_in}")`,
      quantity: area_sqft,
      unit: "sqft",
      unit_price: baseRate,
      total: area_sqft * baseRate,
      category: "base",
    });

    // 2. Demo if included
    if (demo_included) {
      const demoRule = pricingRules.find((r) => r.service_key === "concrete_demo");
      const demoRate = demoRule?.base_rate ?? 2.25;
      items.push({
        id: uuid(),
        service_key: "concrete_demo",
        source_measurement_id: id,
        label: `${label} - Demo/Removal`,
        quantity: area_sqft,
        unit: "sqft",
        unit_price: demoRate,
        total: area_sqft * demoRate,
        category: "demo",
      });
    }

    // 3. Finish modifier (stamped or exposed only)
    if (finish === "stamped") {
      const rate = getModifierRate("finish_stamped", slab);
      if (rate > 0) {
        items.push({
          id: uuid(),
          service_key: "finish_stamped",
          source_measurement_id: id,
          label: `${label} - Stamped Finish`,
          quantity: area_sqft,
          unit: "sqft",
          unit_price: rate,
          total: area_sqft * rate,
          category: "finish",
        });
      }
    } else if (finish === "exposed") {
      const rate = getModifierRate("finish_exposed", slab);
      if (rate > 0) {
        items.push({
          id: uuid(),
          service_key: "finish_exposed",
          source_measurement_id: id,
          label: `${label} - Exposed Aggregate`,
          quantity: area_sqft,
          unit: "sqft",
          unit_price: rate,
          total: area_sqft * rate,
          category: "finish",
        });
      }
    }

    // 4. Reinforcement modifier (mesh or rebar only, fiber is included)
    if (reinforcement === "mesh") {
      const rate = getModifierRate("reinforcement_mesh", slab);
      if (rate > 0) {
        items.push({
          id: uuid(),
          service_key: "reinforcement_mesh",
          source_measurement_id: id,
          label: `${label} - Wire Mesh`,
          quantity: area_sqft,
          unit: "sqft",
          unit_price: rate,
          total: area_sqft * rate,
          category: "reinforcement",
        });
      }
    } else if (reinforcement === "rebar") {
      const rate = getModifierRate("reinforcement_rebar", slab);
      if (rate > 0) {
        items.push({
          id: uuid(),
          service_key: "reinforcement_rebar",
          source_measurement_id: id,
          label: `${label} - Rebar`,
          quantity: area_sqft,
          unit: "sqft",
          unit_price: rate,
          total: area_sqft * rate,
          category: "reinforcement",
        });
      }
    }

    // 5. Access difficulty modifier
    if (access_difficulty === "limited") {
      const rate = getModifierRate("access_limited", slab);
      if (rate > 0) {
        items.push({
          id: uuid(),
          service_key: "access_limited",
          source_measurement_id: id,
          label: `${label} - Limited Access`,
          quantity: area_sqft,
          unit: "sqft",
          unit_price: rate,
          total: area_sqft * rate,
          category: "access",
        });
      }
    } else if (access_difficulty === "wheelbarrow") {
      const rate = getModifierRate("access_wheelbarrow", slab);
      if (rate > 0) {
        items.push({
          id: uuid(),
          service_key: "access_wheelbarrow",
          source_measurement_id: id,
          label: `${label} - Wheelbarrow Access`,
          quantity: area_sqft,
          unit: "sqft",
          unit_price: rate,
          total: area_sqft * rate,
          category: "access",
        });
      }
    }
  }

  // Process each line measurement
  for (const line of lines) {
    const { id, label, lineal_feet, line_type } = line;
    const rate = getLineRate(line_type);

    if (rate > 0) {
      items.push({
        id: uuid(),
        service_key: line_type as ConcreteServiceKey,
        source_measurement_id: id,
        label: label || `${line_type === "saw_cut" ? "Saw Cuts" : line_type === "forming" ? "Forming" : "Thickened Edge"}`,
        quantity: lineal_feet,
        unit: "lf",
        unit_price: rate,
        total: lineal_feet * rate,
        category: "lines",
      });
    }
  }

  // Calculate subtotals by category
  const subtotals = {
    base: items.filter((i) => i.category === "base").reduce((s, i) => s + i.total, 0),
    demo: items.filter((i) => i.category === "demo").reduce((s, i) => s + i.total, 0),
    finish: items.filter((i) => i.category === "finish").reduce((s, i) => s + i.total, 0),
    reinforcement: items.filter((i) => i.category === "reinforcement").reduce((s, i) => s + i.total, 0),
    access: items.filter((i) => i.category === "access").reduce((s, i) => s + i.total, 0),
    lines: items.filter((i) => i.category === "lines").reduce((s, i) => s + i.total, 0),
  };

  const total = Object.values(subtotals).reduce((s, v) => s + v, 0);
  const totalSqft = slabs.reduce((s, slab) => s + slab.area_sqft, 0);
  const totalLinealFeet = lines.reduce((s, line) => s + line.lineal_feet, 0);

  // Calculate total cubic yards
  const totalCubicYards = slabs.reduce((sum, slab) => {
    return sum + (slab.area_sqft * (slab.thickness_in / 12)) / 27;
  }, 0);

  return {
    items,
    subtotals,
    total,
    totalSqft,
    totalLinealFeet,
    totalCubicYards,
  };
}

// ============================================
// Helper: Group items by source measurement
// ============================================

export function groupItemsByMeasurement(
  items: ConcreteQuoteItem[]
): Map<string, ConcreteQuoteItem[]> {
  const groups = new Map<string, ConcreteQuoteItem[]>();

  for (const item of items) {
    const key = item.source_measurement_id || "misc";
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  return groups;
}

// ============================================
// Helper: Calculate slab total (for single slab preview)
// ============================================

export function calcSlabPreviewTotal(
  slab: ConcreteSlabMeasurement,
  pricingRules: ConcretePricingRule[] = DEFAULT_CONCRETE_PRICING
): number {
  const result = buildConcreteQuoteItems([slab], pricingRules);
  return result.total;
}
