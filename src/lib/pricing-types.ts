/**
 * Spatial Quote Engine - Type Definitions
 * Production-aware pricing for Area Bid Pro
 */

// Service type configuration - defines how a service is priced
export interface ServiceType {
  id: string;
  name: string;                    // "Interior Painting", "Sealcoating", etc.
  pricingModel: 'area' | 'linear' | 'fixed' | 'hourly';
  productionRate: number;          // sq ft/hour or linear ft/hour
  productionRateUnit: string;      // "sq ft/hr" or "linear ft/hr"
  defaultCrewSize: number;
  defaultHourlyRate: number;       // $ per person per hour
  materialCostPerUnit?: number;    // $ per sq ft or linear ft
  materialWasteFactor?: number;    // 1.10 = 10% waste
  equipmentCostFixed?: number;     // flat cost per job
  equipmentCostHourly?: number;    // $ per hour of equipment use
  minJobCharge?: number;           // minimum charge for this service
}

// Pricing configuration (user's rate tables)
export interface PricingConfig {
  id: string;
  name: string;                    // "Default", "Premium", "Budget"
  serviceTypes: ServiceType[];
  defaultMargin: number;           // 0.25 = 25%
  laborBurdenRate: number;         // 1.3 = 30% burden on top of hourly
  lastUpdated: string;
}

// Line item in a bid
export interface BidLineItem {
  id: string;
  serviceTypeId: string;
  serviceName: string;
  description: string;
  quantity: number;                // area in sq ft or length in ft
  unit: 'sq ft' | 'linear ft' | 'ea' | 'hr';

  // Calculated fields
  laborHours: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subtotal: number;

  // Overrides (user can adjust)
  overridePrice?: number;
  overrideQuantity?: number;
}

// Measurement snapshot from map
export interface MeasurementSnapshot {
  totalArea: number;               // sq ft
  totalPerimeter: number;          // ft
  shapes: Array<{
    id: string;
    type: string;
    area: number;
    perimeter: number;
  }>;
  heights: Array<{
    id: string;
    value: number;
    label: string;
  }>;
}

// Complete bid/quote
export interface Bid {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'completed';

  // Customer/Job context
  customerId?: string;
  customerName?: string;
  jobId?: string;
  jobName?: string;
  address?: string;
  notes?: string;

  // Measurements snapshot
  measurements: MeasurementSnapshot;

  // Pricing
  pricingConfigId: string;
  lineItems: BidLineItem[];
  margin: number;                  // Applied margin %

  // Totals
  subtotal: number;                // Sum of line items
  marginAmount: number;            // subtotal * margin
  total: number;                   // subtotal + marginAmount

  // Risk indicators
  riskFlags: RiskFlag[];
}

// Risk assessment flags
export interface RiskFlag {
  type: 'low_margin' | 'labor_heavy' | 'material_sensitive' | 'below_minimum';
  message: string;
  severity: 'warning' | 'error';
}

// Default service types for multi-trade support
export const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  {
    id: 'painting-interior',
    name: 'Interior Painting',
    pricingModel: 'area',
    productionRate: 200,           // 200 sq ft per hour
    productionRateUnit: 'sq ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 28,
    materialCostPerUnit: 0.35,     // paint + supplies per sq ft
    materialWasteFactor: 1.10,
    equipmentCostFixed: 25,
    minJobCharge: 350,
  },
  {
    id: 'painting-exterior',
    name: 'Exterior Painting',
    pricingModel: 'area',
    productionRate: 150,           // slower due to prep, ladders
    productionRateUnit: 'sq ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 30,
    materialCostPerUnit: 0.40,
    materialWasteFactor: 1.15,
    equipmentCostFixed: 75,        // scaffolding, ladders
    minJobCharge: 500,
  },
  {
    id: 'sealcoating',
    name: 'Sealcoating',
    pricingModel: 'area',
    productionRate: 2000,          // spray application
    productionRateUnit: 'sq ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 25,
    materialCostPerUnit: 0.08,
    materialWasteFactor: 1.10,
    equipmentCostFixed: 50,
    minJobCharge: 350,
  },
  {
    id: 'pressure-washing',
    name: 'Pressure Washing',
    pricingModel: 'area',
    productionRate: 500,
    productionRateUnit: 'sq ft/hr',
    defaultCrewSize: 1,
    defaultHourlyRate: 25,
    materialCostPerUnit: 0.02,     // water, chemicals
    materialWasteFactor: 1.05,
    equipmentCostFixed: 40,
    minJobCharge: 150,
  },
  {
    id: 'line-striping',
    name: 'Line Striping',
    pricingModel: 'linear',
    productionRate: 500,           // linear ft per hour
    productionRateUnit: 'linear ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 25,
    materialCostPerUnit: 0.15,
    materialWasteFactor: 1.05,
    equipmentCostFixed: 30,
    minJobCharge: 200,
  },
  {
    id: 'fencing',
    name: 'Fence Installation',
    pricingModel: 'linear',
    productionRate: 20,            // 20 linear ft per hour
    productionRateUnit: 'linear ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 30,
    materialCostPerUnit: 15.00,    // fence materials per linear ft
    materialWasteFactor: 1.08,
    equipmentCostFixed: 50,
    minJobCharge: 500,
  },
  {
    id: 'crack-filling',
    name: 'Crack Filling',
    pricingModel: 'linear',
    productionRate: 200,
    productionRateUnit: 'linear ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 25,
    materialCostPerUnit: 0.50,
    materialWasteFactor: 1.15,
    equipmentCostFixed: 40,
    minJobCharge: 250,
  },
  {
    id: 'landscaping-mulch',
    name: 'Mulching',
    pricingModel: 'area',
    productionRate: 100,           // 100 sq ft per hour
    productionRateUnit: 'sq ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 22,
    materialCostPerUnit: 0.50,     // mulch per sq ft
    materialWasteFactor: 1.10,
    equipmentCostFixed: 30,
    minJobCharge: 200,
  },
];

// Default pricing configuration
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  id: 'default',
  name: 'Default Pricing',
  serviceTypes: DEFAULT_SERVICE_TYPES,
  defaultMargin: 0.25,             // 25% margin
  laborBurdenRate: 1.30,           // 30% labor burden (taxes, insurance, etc.)
  lastUpdated: new Date().toISOString(),
};
