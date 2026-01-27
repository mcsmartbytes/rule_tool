/**
 * Industry Options for Area Bid Helper
 *
 * This file bridges the detailed industry configs to the quote system.
 * The full industry configs are in /lib/industries/
 */

import type { ServiceTemplate, MeasurementType } from './types'
import {
  industries,
  getIndustryConfig,
  type IndustryConfig,
  type Service,
} from '../industries'

// Convert new service format to legacy ServiceTemplate format
function serviceToTemplate(service: Service): ServiceTemplate {
  const measurementTypeMap: Record<string, MeasurementType> = {
    'area': 'AREA',
    'length': 'LENGTH',
    'count': 'COUNT',
    'time': 'COUNT', // treat time as count for now
  }

  const unitLabelMap: Record<string, 'sqft' | 'ft' | 'ea'> = {
    'sqft': 'sqft',
    'square': 'sqft',
    'sqft face': 'sqft',
    'ft': 'ft',
    'each': 'ea',
    'stall': 'ea',
    'space': 'ea',
    'arrow': 'ea',
    'stencil': 'ea',
    'tree': 'ea',
    'shrub': 'ea',
    'zone': 'ea',
    'fixture': 'ea',
    'project': 'ea',
    'hour': 'ea',
  }

  return {
    id: service.id,
    name: service.name,
    measurementType: measurementTypeMap[service.measurementType] || 'AREA',
    unitLabel: unitLabelMap[service.unit] || 'sqft',
    defaultRate: service.defaultRate,
    minimumCharge: service.minimumCharge,
  }
}

// Legacy IndustryDefinition type for backward compatibility
export type IndustryDefinition = {
  id: string
  name: string
  description: string
  hero: string
  templates: ServiceTemplate[]
  // New: reference to full config
  fullConfig: IndustryConfig
}

// Build industry options from the detailed configs
export const industryOptions: IndustryDefinition[] = Object.values(industries).map((config) => ({
  id: config.id,
  name: config.name,
  description: config.tagline,
  hero: config.tagline,
  templates: config.services.map(serviceToTemplate),
  fullConfig: config,
}))

/**
 * Get service templates for an industry (for the quote map interface)
 */
export function getIndustryTemplates(industryId?: string): ServiceTemplate[] {
  if (!industryId) {
    return industryOptions[0]?.templates ?? []
  }
  const match = industryOptions.find((option) => option.id === industryId)
  return match?.templates ?? industryOptions[0]?.templates ?? []
}

/**
 * Get the full industry config (for detailed industry-specific UI)
 */
export function getFullIndustryConfig(industryId: string): IndustryConfig | undefined {
  return getIndustryConfig(industryId)
}

/**
 * Get industry branding colors
 */
export function getIndustryBranding(industryId: string) {
  const config = getIndustryConfig(industryId)
  return config?.branding ?? {
    primaryColor: '#1e3a8a',
    secondaryColor: '#1e293b',
    accentColor: '#fbbf24',
  }
}

/**
 * Get industry terminology (what to call jobs, clients, etc.)
 */
export function getIndustryTerminology(industryId: string) {
  const config = getIndustryConfig(industryId)
  return config?.terminology ?? {
    job: 'Job',
    jobPlural: 'Jobs',
    client: 'Customer',
    clientPlural: 'Customers',
    estimate: 'Quote',
    estimatePlural: 'Quotes',
    crew: 'Crew',
    phase: 'Phase',
    phasePlural: 'Phases',
  }
}

/**
 * Get industry phases (for workflow display)
 */
export function getIndustryPhases(industryId: string) {
  const config = getIndustryConfig(industryId)
  return config?.phases ?? []
}

/**
 * Get industry custom fields (for job forms)
 */
export function getIndustryCustomFields(industryId: string) {
  const config = getIndustryConfig(industryId)
  return config?.customFields ?? []
}

/**
 * Check if an industry feature is enabled
 */
export function isFeatureEnabled(industryId: string, feature: keyof IndustryConfig['features']): boolean {
  const config = getIndustryConfig(industryId)
  return config?.features[feature] ?? false
}
