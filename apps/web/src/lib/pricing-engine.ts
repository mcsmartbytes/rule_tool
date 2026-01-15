/**
 * Spatial Quote Engine - Calculation Engine
 * Production-aware pricing calculations for Area Bid Pro
 */

import type {
  ServiceType,
  PricingConfig,
  BidLineItem,
  Bid,
  RiskFlag,
  MeasurementSnapshot,
} from './pricing-types';

/**
 * Calculate a single line item based on service type and quantity
 */
export function calculateLineItem(
  serviceType: ServiceType,
  quantity: number,
  pricingConfig: PricingConfig,
  description?: string
): BidLineItem {
  // Determine unit based on pricing model
  const unit: BidLineItem['unit'] =
    serviceType.pricingModel === 'linear' ? 'linear ft' :
    serviceType.pricingModel === 'area' ? 'sq ft' :
    serviceType.pricingModel === 'hourly' ? 'hr' : 'ea';

  // Labor calculation
  let laborHours: number;
  if (serviceType.pricingModel === 'hourly') {
    laborHours = quantity; // quantity IS hours for hourly pricing
  } else if (serviceType.pricingModel === 'fixed') {
    laborHours = 1; // Fixed price jobs default to 1 hour estimate
  } else {
    laborHours = quantity / serviceType.productionRate;
  }

  // Labor cost = hours × crew size × hourly rate × burden rate
  const laborCost =
    laborHours *
    serviceType.defaultCrewSize *
    serviceType.defaultHourlyRate *
    pricingConfig.laborBurdenRate;

  // Material calculation
  let materialCost = 0;
  if (serviceType.materialCostPerUnit && serviceType.pricingModel !== 'fixed') {
    const wasteFactor = serviceType.materialWasteFactor || 1;
    materialCost = quantity * serviceType.materialCostPerUnit * wasteFactor;
  }

  // Equipment calculation
  const equipmentFixed = serviceType.equipmentCostFixed || 0;
  const equipmentHourly = (serviceType.equipmentCostHourly || 0) * laborHours;
  const equipmentCost = equipmentFixed + equipmentHourly;

  // Subtotal
  const subtotal = laborCost + materialCost + equipmentCost;

  return {
    id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    serviceTypeId: serviceType.id,
    serviceName: serviceType.name,
    description: description || serviceType.name,
    quantity,
    unit,
    laborHours,
    laborCost,
    materialCost,
    equipmentCost,
    subtotal,
  };
}

/**
 * Recalculate a line item with updated quantity or overrides
 */
export function recalculateLineItem(
  lineItem: BidLineItem,
  serviceType: ServiceType,
  pricingConfig: PricingConfig
): BidLineItem {
  const quantity = lineItem.overrideQuantity ?? lineItem.quantity;
  const calculated = calculateLineItem(serviceType, quantity, pricingConfig, lineItem.description);

  return {
    ...calculated,
    id: lineItem.id, // Keep original ID
    overridePrice: lineItem.overridePrice,
    overrideQuantity: lineItem.overrideQuantity,
    // If there's an override price, use it for subtotal
    subtotal: lineItem.overridePrice ?? calculated.subtotal,
  };
}

/**
 * Calculate bid totals from line items
 */
export function calculateBidTotals(bid: Bid): Bid {
  // Sum all line items (using override price if set)
  const subtotal = bid.lineItems.reduce((sum, li) => {
    return sum + (li.overridePrice ?? li.subtotal);
  }, 0);

  const marginAmount = subtotal * bid.margin;
  const total = subtotal + marginAmount;

  return {
    ...bid,
    subtotal,
    marginAmount,
    total,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Assess risks for a bid
 */
export function assessRisks(bid: Bid, pricingConfig: PricingConfig): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (bid.lineItems.length === 0 || bid.subtotal === 0) {
    return flags;
  }

  // 1. Low margin warning
  if (bid.margin < 0.15) {
    flags.push({
      type: 'low_margin',
      message: `Margin ${(bid.margin * 100).toFixed(0)}% is below recommended 15%`,
      severity: bid.margin < 0.10 ? 'error' : 'warning',
    });
  }

  // 2. Labor-heavy job (>70% of cost is labor)
  const totalLabor = bid.lineItems.reduce((sum, li) => sum + li.laborCost, 0);
  const laborRatio = totalLabor / bid.subtotal;
  if (laborRatio > 0.70) {
    flags.push({
      type: 'labor_heavy',
      message: `Labor is ${(laborRatio * 100).toFixed(0)}% of costs - crew efficiency is critical`,
      severity: 'warning',
    });
  }

  // 3. Material-sensitive job (>40% material cost)
  const totalMaterial = bid.lineItems.reduce((sum, li) => sum + li.materialCost, 0);
  const materialRatio = totalMaterial / bid.subtotal;
  if (materialRatio > 0.40) {
    flags.push({
      type: 'material_sensitive',
      message: `Material costs are ${(materialRatio * 100).toFixed(0)}% - watch for price changes`,
      severity: 'warning',
    });
  }

  // 4. Below minimum job charge
  bid.lineItems.forEach((li) => {
    const serviceType = pricingConfig.serviceTypes.find((s) => s.id === li.serviceTypeId);
    if (serviceType?.minJobCharge) {
      const effectivePrice = li.overridePrice ?? li.subtotal;
      if (effectivePrice < serviceType.minJobCharge) {
        flags.push({
          type: 'below_minimum',
          message: `${serviceType.name}: $${effectivePrice.toFixed(0)} below minimum $${serviceType.minJobCharge}`,
          severity: 'error',
        });
      }
    }
  });

  return flags;
}

/**
 * Create a new bid from measurements
 */
export function createBidFromMeasurements(
  measurements: MeasurementSnapshot,
  pricingConfig: PricingConfig,
  context?: {
    customerId?: string;
    customerName?: string;
    jobId?: string;
    jobName?: string;
    address?: string;
    notes?: string;
  }
): Bid {
  const now = new Date().toISOString();

  const bid: Bid = {
    id: `bid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    customerId: context?.customerId,
    customerName: context?.customerName,
    jobId: context?.jobId,
    jobName: context?.jobName,
    address: context?.address,
    notes: context?.notes,
    measurements,
    pricingConfigId: pricingConfig.id,
    lineItems: [],
    margin: pricingConfig.defaultMargin,
    subtotal: 0,
    marginAmount: 0,
    total: 0,
    riskFlags: [],
  };

  return bid;
}

/**
 * Add a line item to a bid and recalculate totals
 */
export function addLineItemToBid(
  bid: Bid,
  serviceType: ServiceType,
  quantity: number,
  pricingConfig: PricingConfig,
  description?: string
): Bid {
  const lineItem = calculateLineItem(serviceType, quantity, pricingConfig, description);

  const updatedBid: Bid = {
    ...bid,
    lineItems: [...bid.lineItems, lineItem],
  };

  const withTotals = calculateBidTotals(updatedBid);
  return {
    ...withTotals,
    riskFlags: assessRisks(withTotals, pricingConfig),
  };
}

/**
 * Remove a line item from a bid and recalculate
 */
export function removeLineItemFromBid(
  bid: Bid,
  lineItemId: string,
  pricingConfig: PricingConfig
): Bid {
  const updatedBid: Bid = {
    ...bid,
    lineItems: bid.lineItems.filter((li) => li.id !== lineItemId),
  };

  const withTotals = calculateBidTotals(updatedBid);
  return {
    ...withTotals,
    riskFlags: assessRisks(withTotals, pricingConfig),
  };
}

/**
 * Update a line item in a bid and recalculate
 */
export function updateLineItemInBid(
  bid: Bid,
  lineItemId: string,
  updates: Partial<Pick<BidLineItem, 'quantity' | 'description' | 'overridePrice' | 'overrideQuantity'>>,
  pricingConfig: PricingConfig
): Bid {
  const updatedBid: Bid = {
    ...bid,
    lineItems: bid.lineItems.map((li) => {
      if (li.id !== lineItemId) return li;

      const serviceType = pricingConfig.serviceTypes.find((s) => s.id === li.serviceTypeId);
      if (!serviceType) return { ...li, ...updates };

      // Apply updates
      const updatedItem = { ...li, ...updates };

      // If quantity changed, recalculate
      if (updates.quantity !== undefined || updates.overrideQuantity !== undefined) {
        return recalculateLineItem(updatedItem, serviceType, pricingConfig);
      }

      return updatedItem;
    }),
  };

  const withTotals = calculateBidTotals(updatedBid);
  return {
    ...withTotals,
    riskFlags: assessRisks(withTotals, pricingConfig),
  };
}

/**
 * Update bid margin and recalculate
 */
export function updateBidMargin(bid: Bid, margin: number, pricingConfig: PricingConfig): Bid {
  const updatedBid: Bid = {
    ...bid,
    margin: Math.max(0, Math.min(1, margin)), // Clamp 0-100%
  };

  const withTotals = calculateBidTotals(updatedBid);
  return {
    ...withTotals,
    riskFlags: assessRisks(withTotals, pricingConfig),
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h} hr${h !== 1 ? 's' : ''}`;
  }
  return `${h}h ${m}m`;
}

/**
 * Get cost breakdown percentages for a bid
 */
export function getCostBreakdown(bid: Bid): {
  labor: number;
  material: number;
  equipment: number;
  laborPercent: number;
  materialPercent: number;
  equipmentPercent: number;
} {
  const labor = bid.lineItems.reduce((sum, li) => sum + li.laborCost, 0);
  const material = bid.lineItems.reduce((sum, li) => sum + li.materialCost, 0);
  const equipment = bid.lineItems.reduce((sum, li) => sum + li.equipmentCost, 0);
  const total = labor + material + equipment;

  return {
    labor,
    material,
    equipment,
    laborPercent: total > 0 ? (labor / total) * 100 : 0,
    materialPercent: total > 0 ? (material / total) * 100 : 0,
    equipmentPercent: total > 0 ? (equipment / total) * 100 : 0,
  };
}
