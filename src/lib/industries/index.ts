/**
 * Area Bid Helper Industry Configurations
 *
 * This module provides industry-specific configurations that control
 * branding, terminology, features, services, and workflows.
 *
 * Each industry has:
 * - Branding (colors, logos)
 * - Terminology (what to call jobs, clients, estimates)
 * - Feature flags (which modules to show)
 * - Phases (workflow stages with tasks)
 * - Services (with measurement types and rates)
 * - Custom fields (for job forms)
 * - Reports and navigation
 */

// Type exports
export * from './types';

// Industry config exports
export { sealingStripingConfig, default as sealingStriping } from './sealing-striping';
export { roofingConfig, default as roofing } from './roofing';
export { concreteConfig, default as concrete } from './concrete';
export { landscapingConfig, default as landscaping } from './landscaping';
export { generalContractorConfig, default as generalContractor } from './general-contractor';
export { fencingConfig, default as fencing } from './fencing';
export { paintingConfig, default as painting } from './painting';
export { hvacConfig, default as hvac } from './hvac';

// HVAC rules engine exports
export * from './hvac-rules';

// All configs as a map
import { sealingStripingConfig } from './sealing-striping';
import { roofingConfig } from './roofing';
import { concreteConfig } from './concrete';
import { landscapingConfig } from './landscaping';
import { generalContractorConfig } from './general-contractor';
import { fencingConfig } from './fencing';
import { paintingConfig } from './painting';
import { hvacConfig } from './hvac';
import type { IndustryConfig, Service } from './types';

export const industries: Record<string, IndustryConfig> = {
  'sealing-striping': sealingStripingConfig,
  'roofing': roofingConfig,
  'concrete': concreteConfig,
  'landscaping': landscapingConfig,
  'general-contractor': generalContractorConfig,
  'fencing': fencingConfig,
  'painting': paintingConfig,
  'hvac': hvacConfig,
};

/**
 * Get an industry configuration by ID
 */
export function getIndustryConfig(industryId: string): IndustryConfig | undefined {
  return industries[industryId];
}

/**
 * Get all available industry IDs
 */
export function getAvailableIndustries(): string[] {
  return Object.keys(industries);
}

/**
 * Get industry display info for selection UI (onboarding)
 */
export function getIndustryList() {
  return Object.values(industries).map((config) => ({
    id: config.id,
    name: config.name,
    tagline: config.tagline,
    primaryColor: config.branding.primaryColor,
    accentColor: config.branding.accentColor,
  }));
}

/**
 * Get services for an industry (for quote/pricing)
 */
export function getIndustryServices(industryId: string): Service[] {
  const config = industries[industryId];
  return config?.services ?? [];
}

/**
 * Get a specific service from an industry
 */
export function getService(industryId: string, serviceId: string): Service | undefined {
  const services = getIndustryServices(industryId);
  return services.find(s => s.id === serviceId);
}

/**
 * Calculate price for a service based on measurement
 */
export function calculateServicePrice(
  industryId: string,
  serviceId: string,
  quantity: number,
  customRate?: number
): { price: number; breakdown: string } {
  const service = getService(industryId, serviceId);
  if (!service) {
    return { price: 0, breakdown: 'Service not found' };
  }

  const rate = customRate ?? service.defaultRate;
  const calculatedPrice = quantity * rate;
  const finalPrice = Math.max(calculatedPrice, service.minimumCharge);

  const breakdown = calculatedPrice < service.minimumCharge
    ? `${quantity} ${service.unit} × $${rate}/${service.unit} = $${calculatedPrice.toFixed(2)} (min $${service.minimumCharge})`
    : `${quantity} ${service.unit} × $${rate}/${service.unit} = $${finalPrice.toFixed(2)}`;

  return { price: finalPrice, breakdown };
}
