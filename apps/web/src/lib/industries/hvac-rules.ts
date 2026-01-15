/**
 * HVAC Rules Engine
 *
 * Contains load calculation rules, system archetypes, ductwork formulas,
 * labor productivity norms, and cost curves for HVAC estimating.
 *
 * Based on industry rules of thumb - not proprietary ASHRAE/Manual J tables.
 * These are contractor-derived heuristics for fast estimating.
 */

// ============================================================================
// CLIMATE ZONES & DESIGN CONDITIONS
// ============================================================================

export interface ClimateZone {
  id: string;
  name: string;
  description: string;
  coolingDesignTemp: number;    // Summer design temp (F)
  heatingDesignTemp: number;    // Winter design temp (F)
  coolingMultiplier: number;    // Adjustment to cooling load
  heatingMultiplier: number;    // Adjustment to heating load
  humidityFactor: number;       // Latent load factor (1.0 = neutral)
}

export const CLIMATE_ZONES: Record<string, ClimateZone> = {
  '1': {
    id: '1',
    name: 'Hot-Humid',
    description: 'Miami, Houston, New Orleans',
    coolingDesignTemp: 95,
    heatingDesignTemp: 45,
    coolingMultiplier: 1.15,
    heatingMultiplier: 0.6,
    humidityFactor: 1.3,
  },
  '2': {
    id: '2',
    name: 'Hot-Dry',
    description: 'Phoenix, Las Vegas, El Paso',
    coolingDesignTemp: 110,
    heatingDesignTemp: 35,
    coolingMultiplier: 1.25,
    heatingMultiplier: 0.75,
    humidityFactor: 0.85,
  },
  '3': {
    id: '3',
    name: 'Mixed-Humid',
    description: 'Atlanta, Dallas, Memphis',
    coolingDesignTemp: 95,
    heatingDesignTemp: 20,
    coolingMultiplier: 1.0,
    heatingMultiplier: 1.0,
    humidityFactor: 1.15,
  },
  '4': {
    id: '4',
    name: 'Mixed-Dry',
    description: 'Albuquerque, Denver',
    coolingDesignTemp: 95,
    heatingDesignTemp: 10,
    coolingMultiplier: 0.95,
    heatingMultiplier: 1.1,
    humidityFactor: 0.9,
  },
  '5': {
    id: '5',
    name: 'Cold',
    description: 'Chicago, Boston, Pittsburgh',
    coolingDesignTemp: 90,
    heatingDesignTemp: 0,
    coolingMultiplier: 0.85,
    heatingMultiplier: 1.25,
    humidityFactor: 1.0,
  },
  '6': {
    id: '6',
    name: 'Very Cold',
    description: 'Minneapolis, Milwaukee',
    coolingDesignTemp: 88,
    heatingDesignTemp: -10,
    coolingMultiplier: 0.75,
    heatingMultiplier: 1.4,
    humidityFactor: 0.95,
  },
  '7': {
    id: '7',
    name: 'Subarctic',
    description: 'Anchorage, Fairbanks',
    coolingDesignTemp: 75,
    heatingDesignTemp: -30,
    coolingMultiplier: 0.5,
    heatingMultiplier: 1.6,
    humidityFactor: 0.85,
  },
};

// ============================================================================
// BUILDING TYPE ARCHETYPES
// ============================================================================

export interface BuildingArchetype {
  id: string;
  name: string;
  // Load assumptions (BTU/hr per sqft) - rule of thumb ranges
  coolingLoadPerSqft: { min: number; typical: number; max: number };
  heatingLoadPerSqft: { min: number; typical: number; max: number };
  // Quick tonnage rule (sqft per ton)
  sqftPerTon: { min: number; typical: number; max: number };
  // Internal gains assumptions
  occupantDensity: number;      // sqft per person
  lightingDensity: number;      // watts per sqft
  plugLoadDensity: number;      // watts per sqft
  // Ventilation
  ventilationCfmPerPerson: number;
  infiltrationAch: number;      // air changes per hour
  // Typical system types
  recommendedSystems: string[];
  // Operating hours factor
  operatingHours: number;       // hours per day
}

export const BUILDING_ARCHETYPES: Record<string, BuildingArchetype> = {
  'single-family': {
    id: 'single-family',
    name: 'Single Family Residential',
    coolingLoadPerSqft: { min: 20, typical: 25, max: 35 },
    heatingLoadPerSqft: { min: 25, typical: 35, max: 50 },
    sqftPerTon: { min: 400, typical: 500, max: 600 },
    occupantDensity: 500,
    lightingDensity: 1.0,
    plugLoadDensity: 1.0,
    ventilationCfmPerPerson: 15,
    infiltrationAch: 0.35,
    recommendedSystems: ['split-system', 'heat-pump', 'minisplit'],
    operatingHours: 24,
  },
  'multi-family': {
    id: 'multi-family',
    name: 'Multi-Family Residential',
    coolingLoadPerSqft: { min: 22, typical: 28, max: 38 },
    heatingLoadPerSqft: { min: 22, typical: 32, max: 45 },
    sqftPerTon: { min: 350, typical: 450, max: 550 },
    occupantDensity: 400,
    lightingDensity: 1.0,
    plugLoadDensity: 1.2,
    ventilationCfmPerPerson: 15,
    infiltrationAch: 0.3,
    recommendedSystems: ['split-system', 'heat-pump', 'minisplit', 'vrf'],
    operatingHours: 24,
  },
  'office': {
    id: 'office',
    name: 'Office Building',
    coolingLoadPerSqft: { min: 30, typical: 40, max: 55 },
    heatingLoadPerSqft: { min: 25, typical: 35, max: 45 },
    sqftPerTon: { min: 250, typical: 350, max: 450 },
    occupantDensity: 150,
    lightingDensity: 1.2,
    plugLoadDensity: 2.5,
    ventilationCfmPerPerson: 20,
    infiltrationAch: 0.15,
    recommendedSystems: ['rtu', 'vrf', 'chilled-water', 'vav'],
    operatingHours: 10,
  },
  'retail': {
    id: 'retail',
    name: 'Retail Store',
    coolingLoadPerSqft: { min: 35, typical: 45, max: 60 },
    heatingLoadPerSqft: { min: 20, typical: 30, max: 40 },
    sqftPerTon: { min: 200, typical: 300, max: 400 },
    occupantDensity: 60,
    lightingDensity: 1.8,
    plugLoadDensity: 1.5,
    ventilationCfmPerPerson: 20,
    infiltrationAch: 0.25,
    recommendedSystems: ['rtu', 'split-system'],
    operatingHours: 12,
  },
  'restaurant': {
    id: 'restaurant',
    name: 'Restaurant',
    coolingLoadPerSqft: { min: 50, typical: 65, max: 85 },
    heatingLoadPerSqft: { min: 30, typical: 40, max: 55 },
    sqftPerTon: { min: 150, typical: 200, max: 280 },
    occupantDensity: 15,
    lightingDensity: 1.5,
    plugLoadDensity: 5.0,  // Kitchen equipment
    ventilationCfmPerPerson: 20,
    infiltrationAch: 0.5,  // Door traffic
    recommendedSystems: ['rtu', 'split-system'],
    operatingHours: 14,
  },
  'warehouse': {
    id: 'warehouse',
    name: 'Warehouse',
    coolingLoadPerSqft: { min: 8, typical: 12, max: 20 },
    heatingLoadPerSqft: { min: 15, typical: 25, max: 35 },
    sqftPerTon: { min: 800, typical: 1000, max: 1500 },
    occupantDensity: 2000,
    lightingDensity: 0.8,
    plugLoadDensity: 0.5,
    ventilationCfmPerPerson: 15,
    infiltrationAch: 0.4,
    recommendedSystems: ['unit-heater', 'rtu', 'radiant'],
    operatingHours: 10,
  },
  'school': {
    id: 'school',
    name: 'School / Educational',
    coolingLoadPerSqft: { min: 35, typical: 45, max: 55 },
    heatingLoadPerSqft: { min: 30, typical: 40, max: 50 },
    sqftPerTon: { min: 250, typical: 325, max: 400 },
    occupantDensity: 25,
    lightingDensity: 1.2,
    plugLoadDensity: 1.5,
    ventilationCfmPerPerson: 15,
    infiltrationAch: 0.2,
    recommendedSystems: ['rtu', 'vav', 'chilled-water'],
    operatingHours: 10,
  },
  'healthcare': {
    id: 'healthcare',
    name: 'Healthcare / Medical',
    coolingLoadPerSqft: { min: 40, typical: 55, max: 75 },
    heatingLoadPerSqft: { min: 35, typical: 45, max: 60 },
    sqftPerTon: { min: 200, typical: 275, max: 350 },
    occupantDensity: 100,
    lightingDensity: 1.5,
    plugLoadDensity: 4.0,  // Medical equipment
    ventilationCfmPerPerson: 25,
    infiltrationAch: 0.15,
    recommendedSystems: ['vav', 'chilled-water', 'vrf'],
    operatingHours: 24,
  },
  'industrial': {
    id: 'industrial',
    name: 'Industrial / Manufacturing',
    coolingLoadPerSqft: { min: 15, typical: 25, max: 50 },
    heatingLoadPerSqft: { min: 20, typical: 30, max: 45 },
    sqftPerTon: { min: 300, typical: 500, max: 800 },
    occupantDensity: 500,
    lightingDensity: 1.5,
    plugLoadDensity: 3.0,
    ventilationCfmPerPerson: 20,
    infiltrationAch: 0.5,
    recommendedSystems: ['rtu', 'unit-heater', 'makeup-air'],
    operatingHours: 16,
  },
};

// ============================================================================
// SYSTEM ARCHETYPES & COST TIERS
// ============================================================================

export type EfficiencyTier = 'standard' | 'high' | 'premium';

export interface SystemArchetype {
  id: string;
  name: string;
  description: string;
  // Cost per ton by tier (equipment + install)
  costPerTon: Record<EfficiencyTier, { min: number; typical: number; max: number }>;
  // Efficiency ratings by tier
  seerRating: Record<EfficiencyTier, number>;
  // Typical applications
  applications: string[];
  // Labor hours per ton
  laborHoursPerTon: { min: number; typical: number; max: number };
  // Equipment lifespan (years)
  expectedLifespan: number;
  // Maintenance factor (annual cost as % of equipment)
  maintenanceFactor: number;
}

export const SYSTEM_ARCHETYPES: Record<string, SystemArchetype> = {
  'split-system': {
    id: 'split-system',
    name: 'Split System A/C',
    description: 'Traditional split system with outdoor condenser and indoor evaporator coil',
    costPerTon: {
      standard: { min: 2200, typical: 2800, max: 3500 },
      high: { min: 2800, typical: 3500, max: 4200 },
      premium: { min: 3500, typical: 4500, max: 5500 },
    },
    seerRating: { standard: 14, high: 17, premium: 21 },
    applications: ['single-family', 'multi-family', 'small-commercial'],
    laborHoursPerTon: { min: 3, typical: 4, max: 6 },
    expectedLifespan: 15,
    maintenanceFactor: 0.02,
  },
  'heat-pump': {
    id: 'heat-pump',
    name: 'Heat Pump',
    description: 'Reversible system for heating and cooling',
    costPerTon: {
      standard: { min: 2500, typical: 3200, max: 4000 },
      high: { min: 3200, typical: 4000, max: 4800 },
      premium: { min: 4500, typical: 5500, max: 7000 },
    },
    seerRating: { standard: 15, high: 18, premium: 22 },
    applications: ['single-family', 'multi-family', 'mild-climates'],
    laborHoursPerTon: { min: 4, typical: 5, max: 7 },
    expectedLifespan: 15,
    maintenanceFactor: 0.025,
  },
  'minisplit': {
    id: 'minisplit',
    name: 'Ductless Minisplit',
    description: 'Wall-mounted indoor units with outdoor condenser',
    costPerTon: {
      standard: { min: 3000, typical: 3800, max: 4500 },
      high: { min: 3800, typical: 4500, max: 5500 },
      premium: { min: 5000, typical: 6000, max: 7500 },
    },
    seerRating: { standard: 18, high: 22, premium: 28 },
    applications: ['additions', 'retrofits', 'zoning', 'no-duct'],
    laborHoursPerTon: { min: 6, typical: 8, max: 12 },
    expectedLifespan: 18,
    maintenanceFactor: 0.015,
  },
  'rtu': {
    id: 'rtu',
    name: 'Rooftop Unit (RTU)',
    description: 'Package unit for commercial rooftop installation',
    costPerTon: {
      standard: { min: 1500, typical: 1800, max: 2200 },
      high: { min: 2000, typical: 2400, max: 2800 },
      premium: { min: 2500, typical: 3000, max: 3800 },
    },
    seerRating: { standard: 13, high: 15, premium: 18 },
    applications: ['retail', 'office', 'warehouse', 'restaurant'],
    laborHoursPerTon: { min: 2, typical: 3, max: 5 },
    expectedLifespan: 15,
    maintenanceFactor: 0.03,
  },
  'vrf': {
    id: 'vrf',
    name: 'VRF/VRV System',
    description: 'Variable refrigerant flow with multiple indoor units',
    costPerTon: {
      standard: { min: 4000, typical: 4500, max: 5500 },
      high: { min: 5000, typical: 5500, max: 6500 },
      premium: { min: 6000, typical: 7000, max: 8500 },
    },
    seerRating: { standard: 18, high: 22, premium: 28 },
    applications: ['office', 'hotel', 'multi-zone', 'retrofit'],
    laborHoursPerTon: { min: 8, typical: 10, max: 14 },
    expectedLifespan: 20,
    maintenanceFactor: 0.025,
  },
  'chilled-water': {
    id: 'chilled-water',
    name: 'Chilled Water System',
    description: 'Central chiller with piped distribution to AHUs',
    costPerTon: {
      standard: { min: 1000, typical: 1200, max: 1500 },
      high: { min: 1300, typical: 1600, max: 2000 },
      premium: { min: 1800, typical: 2200, max: 2800 },
    },
    seerRating: { standard: 12, high: 14, premium: 18 },
    applications: ['large-commercial', 'campus', 'healthcare', 'data-center'],
    laborHoursPerTon: { min: 1.5, typical: 2, max: 3 },
    expectedLifespan: 25,
    maintenanceFactor: 0.04,
  },
};

// ============================================================================
// DUCTWORK RULES
// ============================================================================

export interface DuctworkRules {
  // Linear feet of duct per square foot of conditioned space
  lfPerSqft: { trunk: number; branch: number; flex: number };
  // Fittings as percentage of straight duct LF
  fittingsPercent: number;
  // Insulation area factor (duct SF = duct LF * this factor)
  insulationFactor: number;
  // Hangers per linear foot
  hangersPerLf: number;
  // Supply registers per ton
  registersPerTon: number;
  // Return grilles per system
  returnGrillesPerSystem: number;
}

export const DUCTWORK_RULES: Record<string, DuctworkRules> = {
  'residential-trunk-branch': {
    lfPerSqft: { trunk: 0.015, branch: 0.025, flex: 0.02 },
    fittingsPercent: 0.15,
    insulationFactor: 2.5,
    hangersPerLf: 0.25,
    registersPerTon: 3,
    returnGrillesPerSystem: 2,
  },
  'residential-radial': {
    lfPerSqft: { trunk: 0.005, branch: 0.01, flex: 0.04 },
    fittingsPercent: 0.10,
    insulationFactor: 2.0,
    hangersPerLf: 0.15,
    registersPerTon: 3.5,
    returnGrillesPerSystem: 1,
  },
  'commercial-trunk-branch': {
    lfPerSqft: { trunk: 0.02, branch: 0.03, flex: 0.01 },
    fittingsPercent: 0.20,
    insulationFactor: 3.0,
    hangersPerLf: 0.33,
    registersPerTon: 4,
    returnGrillesPerSystem: 2,
  },
  'commercial-vav': {
    lfPerSqft: { trunk: 0.025, branch: 0.035, flex: 0.005 },
    fittingsPercent: 0.25,
    insulationFactor: 3.5,
    hangersPerLf: 0.4,
    registersPerTon: 5,
    returnGrillesPerSystem: 3,
  },
};

// ============================================================================
// LABOR PRODUCTIVITY NORMS
// ============================================================================

export interface LaborNorms {
  crewSize: { lead: number; journeyman: number; apprentice: number };
  // Hours per unit of work
  hoursPerUnit: Record<string, number>;
  // Multipliers for conditions
  multipliers: {
    retrofit: number;
    heightOver12ft: number;
    congestedSpace: number;
    nightWork: number;
    unionLabor: number;
  };
}

export const LABOR_NORMS: Record<string, LaborNorms> = {
  'residential': {
    crewSize: { lead: 1, journeyman: 1, apprentice: 1 },
    hoursPerUnit: {
      splitSystemPerTon: 4,
      heatPumpPerTon: 5,
      minisplitPerHead: 4,
      ductLfSupply: 0.15,
      ductLfReturn: 0.12,
      registerEach: 0.5,
      thermostatEach: 1.0,
      linesetPerFt: 0.1,
      condensateDrainPerFt: 0.08,
    },
    multipliers: {
      retrofit: 1.25,
      heightOver12ft: 1.15,
      congestedSpace: 1.3,
      nightWork: 1.2,
      unionLabor: 1.35,
    },
  },
  'commercial': {
    crewSize: { lead: 1, journeyman: 2, apprentice: 1 },
    hoursPerUnit: {
      rtuPerTon: 3,
      vrfPerTon: 10,
      chillerPerTon: 2,
      boilerPerMbh: 0.08,
      ductLfSupply: 0.12,
      ductLfReturn: 0.10,
      diffuserEach: 0.75,
      vavBoxEach: 3,
      controlWiringPerFt: 0.05,
    },
    multipliers: {
      retrofit: 1.35,
      heightOver12ft: 1.2,
      congestedSpace: 1.4,
      nightWork: 1.25,
      unionLabor: 1.45,
    },
  },
};

// ============================================================================
// ESTIMATING FUNCTIONS
// ============================================================================

/**
 * Quick tonnage estimate using rule of thumb
 */
export function estimateTonnage(
  conditionedSqft: number,
  buildingType: string,
  climateZoneId: string,
): { min: number; typical: number; max: number } {
  const archetype = BUILDING_ARCHETYPES[buildingType] || BUILDING_ARCHETYPES['single-family'];
  const climate = CLIMATE_ZONES[climateZoneId] || CLIMATE_ZONES['3'];

  const baseMin = conditionedSqft / archetype.sqftPerTon.max;
  const baseTypical = conditionedSqft / archetype.sqftPerTon.typical;
  const baseMax = conditionedSqft / archetype.sqftPerTon.min;

  return {
    min: Math.round(baseMin * climate.coolingMultiplier * 10) / 10,
    typical: Math.round(baseTypical * climate.coolingMultiplier * 10) / 10,
    max: Math.round(baseMax * climate.coolingMultiplier * 10) / 10,
  };
}

/**
 * Estimate heating load in BTU/hr
 */
export function estimateHeatingLoad(
  conditionedSqft: number,
  buildingType: string,
  climateZoneId: string,
): { min: number; typical: number; max: number } {
  const archetype = BUILDING_ARCHETYPES[buildingType] || BUILDING_ARCHETYPES['single-family'];
  const climate = CLIMATE_ZONES[climateZoneId] || CLIMATE_ZONES['3'];

  return {
    min: Math.round(conditionedSqft * archetype.heatingLoadPerSqft.min * climate.heatingMultiplier),
    typical: Math.round(conditionedSqft * archetype.heatingLoadPerSqft.typical * climate.heatingMultiplier),
    max: Math.round(conditionedSqft * archetype.heatingLoadPerSqft.max * climate.heatingMultiplier),
  };
}

/**
 * Estimate ductwork quantities
 */
export function estimateDuctwork(
  conditionedSqft: number,
  tonnage: number,
  ductStyle: string = 'residential-trunk-branch',
): {
  supplyLf: number;
  returnLf: number;
  flexLf: number;
  fittingsCount: number;
  registersCount: number;
  returnGrillesCount: number;
} {
  const rules = DUCTWORK_RULES[ductStyle] || DUCTWORK_RULES['residential-trunk-branch'];

  const supplyLf = Math.round(conditionedSqft * (rules.lfPerSqft.trunk + rules.lfPerSqft.branch));
  const returnLf = Math.round(supplyLf * 0.6); // Return typically 60% of supply
  const flexLf = Math.round(conditionedSqft * rules.lfPerSqft.flex);
  const totalLf = supplyLf + returnLf + flexLf;
  const fittingsCount = Math.round(totalLf * rules.fittingsPercent);
  const registersCount = Math.round(tonnage * rules.registersPerTon);
  const returnGrillesCount = Math.max(2, Math.round(tonnage / 2));

  return {
    supplyLf,
    returnLf,
    flexLf,
    fittingsCount,
    registersCount,
    returnGrillesCount,
  };
}

/**
 * Estimate system cost by tier
 */
export function estimateSystemCost(
  tonnage: number,
  systemType: string,
  tier: EfficiencyTier = 'standard',
): { min: number; typical: number; max: number } {
  const system = SYSTEM_ARCHETYPES[systemType] || SYSTEM_ARCHETYPES['split-system'];
  const costs = system.costPerTon[tier];

  return {
    min: Math.round(tonnage * costs.min),
    typical: Math.round(tonnage * costs.typical),
    max: Math.round(tonnage * costs.max),
  };
}

/**
 * Estimate labor hours for a complete installation
 */
export function estimateLaborHours(
  tonnage: number,
  systemType: string,
  ductworkLf: number,
  sector: 'residential' | 'commercial' = 'residential',
  conditions: {
    isRetrofit?: boolean;
    highCeilings?: boolean;
    congested?: boolean;
    nightWork?: boolean;
    union?: boolean;
  } = {},
): number {
  const system = SYSTEM_ARCHETYPES[systemType] || SYSTEM_ARCHETYPES['split-system'];
  const labor = LABOR_NORMS[sector];

  // Base equipment hours
  let equipmentHours = tonnage * system.laborHoursPerTon.typical;

  // Ductwork hours
  const ductHours = ductworkLf * (sector === 'residential' ? 0.15 : 0.12);

  let totalHours = equipmentHours + ductHours;

  // Apply multipliers
  if (conditions.isRetrofit) totalHours *= labor.multipliers.retrofit;
  if (conditions.highCeilings) totalHours *= labor.multipliers.heightOver12ft;
  if (conditions.congested) totalHours *= labor.multipliers.congestedSpace;
  if (conditions.nightWork) totalHours *= labor.multipliers.nightWork;
  if (conditions.union) totalHours *= labor.multipliers.unionLabor;

  return Math.round(totalHours);
}

/**
 * Generate a complete quick estimate
 */
export interface QuickEstimate {
  tonnage: { min: number; typical: number; max: number };
  heatingBtuh: { min: number; typical: number; max: number };
  systemCost: { min: number; typical: number; max: number };
  ductwork: {
    supplyLf: number;
    returnLf: number;
    flexLf: number;
    registersCount: number;
  };
  laborHours: number;
  totalCost: { min: number; typical: number; max: number };
  recommendedSystems: string[];
}

export function generateQuickEstimate(
  conditionedSqft: number,
  buildingType: string,
  climateZoneId: string,
  systemType: string,
  tier: EfficiencyTier = 'standard',
  sector: 'residential' | 'commercial' = 'residential',
): QuickEstimate {
  const tonnage = estimateTonnage(conditionedSqft, buildingType, climateZoneId);
  const heatingBtuh = estimateHeatingLoad(conditionedSqft, buildingType, climateZoneId);
  const systemCost = estimateSystemCost(tonnage.typical, systemType, tier);

  const ductStyle = sector === 'residential' ? 'residential-trunk-branch' : 'commercial-trunk-branch';
  const ductwork = estimateDuctwork(conditionedSqft, tonnage.typical, ductStyle);

  const laborHours = estimateLaborHours(
    tonnage.typical,
    systemType,
    ductwork.supplyLf + ductwork.returnLf,
    sector,
  );

  // Add ductwork costs
  const ductCostPerLf = sector === 'residential' ? 15 : 18;
  const ductCost = (ductwork.supplyLf + ductwork.returnLf + ductwork.flexLf) * ductCostPerLf;

  // Labor cost (typical blended rate)
  const laborRate = sector === 'residential' ? 75 : 85;
  const laborCost = laborHours * laborRate;

  const archetype = BUILDING_ARCHETYPES[buildingType] || BUILDING_ARCHETYPES['single-family'];

  return {
    tonnage,
    heatingBtuh,
    systemCost,
    ductwork: {
      supplyLf: ductwork.supplyLf,
      returnLf: ductwork.returnLf,
      flexLf: ductwork.flexLf,
      registersCount: ductwork.registersCount,
    },
    laborHours,
    totalCost: {
      min: systemCost.min + ductCost + laborCost * 0.85,
      typical: systemCost.typical + ductCost + laborCost,
      max: systemCost.max + ductCost * 1.2 + laborCost * 1.25,
    },
    recommendedSystems: archetype.recommendedSystems,
  };
}
