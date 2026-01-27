/**
 * @rule-tool/industry-core
 *
 * Core types and utilities for Rule Tool industry packages.
 * All industry packages depend on this package.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface IndustryConfig {
  /** Unique identifier for the industry */
  id: string;

  /** Display name for the industry suite */
  name: string;

  /** Marketing tagline */
  tagline: string;

  /** Branding configuration */
  branding: BrandingConfig;

  /** Terminology overrides for UI labels */
  terminology: TerminologyConfig;

  /** Feature toggles - enable/disable modules */
  features: FeaturesConfig;

  /** Default workflow phases for jobs */
  phases: Phase[];

  /** Default services with pricing */
  services: Service[];

  /** Custom fields for job forms */
  customFields: CustomField[];

  /** Available report types */
  reports: ReportDefinition[];

  /** Navigation menu items */
  navigation: NavigationItem[];
}

export interface BrandingConfig {
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary/dark color (hex) */
  secondaryColor: string;
  /** Accent/highlight color (hex) */
  accentColor: string;
  /** Path to logo file */
  logo: string;
  /** Path to favicon */
  favicon: string;
  /** Path to hero/banner image */
  heroImage: string;
}

export interface TerminologyConfig {
  /** What to call a job/project */
  job: string;
  /** Plural form of job */
  jobPlural: string;
  /** What to call a client/customer */
  client: string;
  /** Plural form of client */
  clientPlural: string;
  /** What to call an estimate/quote/bid */
  estimate: string;
  /** Plural form of estimate */
  estimatePlural: string;
  /** What to call crew/team */
  crew: string;
  /** What to call a phase/stage */
  phase: string;
  /** Plural form of phase */
  phasePlural: string;
}

export interface FeaturesConfig {
  /** Job/project management */
  jobs: boolean;
  /** Estimate/quote builder */
  estimates: boolean;
  /** Schedule of Values (progress billing) */
  sov: boolean;
  /** Contact/company management */
  crm: boolean;
  /** Expense tracking */
  expenses: boolean;
  /** Invoice generation */
  invoicing: boolean;
  /** Crew/job scheduling */
  scheduling: boolean;
  /** Crew member management */
  crew: boolean;
  /** Mileage tracking */
  mileage: boolean;
  /** Receipt scanning/OCR */
  receipts: boolean;
  /** Reports and analytics */
  reports: boolean;
  /** Area measurement tool (maps) */
  areaMeasurement: boolean;
  /** Parking lot stall striping tool */
  stallTool: boolean;
  /** Concrete slab/flatwork tool */
  concreteTool: boolean;
  /** Roofing measurement tool */
  roofingTool: boolean;
}

export interface Phase {
  /** Phase name */
  name: string;
  /** Default tasks within this phase */
  tasks: string[];
  /** Display color (hex) */
  color: string;
}

export interface Service {
  /** Unique service identifier */
  id: string;
  /** Display name */
  name: string;
  /** How this service is measured */
  measurementType: 'area' | 'length' | 'count' | 'time';
  /** Unit label (sqft, ft, each, hour) */
  unit: string;
  /** Default rate per unit */
  defaultRate: number;
  /** Minimum charge for this service */
  minimumCharge: number;
  /** Optional description */
  description?: string;
}

export interface CustomField {
  /** Field key (used in database/forms) */
  key: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'textarea';
  /** Options for select fields */
  options?: string[];
  /** Is this field required? */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Help text */
  helpText?: string;
}

export interface ReportDefinition {
  /** Report identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Icon name (from lucide-react) */
  icon?: string;
}

export interface NavigationItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Icon name (from lucide-react) */
  icon: string;
  /** Optional badge count */
  badge?: number;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type TerminologyKey = keyof TerminologyConfig;
export type FeatureKey = keyof FeaturesConfig;
export type MeasurementType = Service['measurementType'];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate price for a service based on measurement
 */
export function calculateServicePrice(
  service: Service,
  quantity: number,
  customRate?: number
): { price: number; breakdown: string } {
  const rate = customRate ?? service.defaultRate;
  const calculatedPrice = quantity * rate;
  const finalPrice = Math.max(calculatedPrice, service.minimumCharge);

  const breakdown = calculatedPrice < service.minimumCharge
    ? `${quantity} ${service.unit} × $${rate}/${service.unit} = $${calculatedPrice.toFixed(2)} (min $${service.minimumCharge})`
    : `${quantity} ${service.unit} × $${rate}/${service.unit} = $${finalPrice.toFixed(2)}`;

  return { price: finalPrice, breakdown };
}

/**
 * Get a service from a config by ID
 */
export function getService(config: IndustryConfig, serviceId: string): Service | undefined {
  return config.services.find(s => s.id === serviceId);
}

/**
 * Get terminology with fallback
 */
export function getTerminology(config: IndustryConfig, key: TerminologyKey): string {
  return config.terminology[key];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(config: IndustryConfig, feature: FeatureKey): boolean {
  return config.features[feature];
}

/**
 * Get industry display info for selection UI
 */
export function getIndustryDisplayInfo(config: IndustryConfig) {
  return {
    id: config.id,
    name: config.name,
    tagline: config.tagline,
    primaryColor: config.branding.primaryColor,
    accentColor: config.branding.accentColor,
  };
}
