// Database types for Rule Tool
// Generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================
// Enums
// ============================================

export type UserRole = 'owner' | 'admin' | 'user' | 'viewer';
export type SiteStatus = 'draft' | 'active' | 'archived';
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type ObjectSource = 'manual' | 'ai-suggested' | 'imported';
export type UnitType = 'imperial' | 'metric';

// Site object types
export type SiteObjectType =
  // Surfaces
  | 'parking-surface'
  | 'drive-lane'
  | 'loading-area'
  | 'sidewalk'
  | 'plaza'
  // Linear features
  | 'curb'
  | 'gutter'
  | 'edge-line'
  | 'crack'
  // Point features
  | 'drain'
  | 'bollard'
  | 'light-pole'
  | 'sign'
  // Structures
  | 'building-footprint'
  | 'median'
  | 'island'
  // ADA / Markings
  | 'ada-ramp'
  | 'ada-space'
  | 'fire-lane'
  | 'crosswalk'
  // Striping-specific
  | 'parking-stall'
  | 'stall-group'
  | 'directional-arrow'
  | 'symbol';

// ============================================
// Base Types
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SiteSettings {
  defaultUnits: UnitType;
  mobilizationShared: boolean;
  contingencyPercent: number;
  defaultElevation?: number;
}

export interface TradeSettings {
  mobilizationCost: number;
  minimumJobCharge: number;
  defaultMargin: number;
}

export interface ObjectMeasurements {
  area?: number;
  perimeter?: number;
  length?: number;
  count?: number;
  slope?: number;
  elevation?: number;
}

export interface TradeObjectMapping {
  objectType: SiteObjectType;
  subTypes?: string[];
  quantitySource: 'area' | 'perimeter' | 'length' | 'count' | 'custom';
  serviceId: string;
  customFormula?: string;
  wasteFactor?: number;
  coverageRate?: number;
}

export interface RiskFlag {
  type: 'low-margin' | 'labor-heavy' | 'material-sensitive' | 'below-minimum';
  severity: 'warning' | 'error';
  message: string;
}

// ============================================
// Database Tables
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  role: UserRole;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  organization_id: string | null;
  created_by: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  coordinates: Coordinates | null;
  bounds: MapBounds | null;
  settings: SiteSettings;
  status: SiteStatus;
  created_at: string;
  updated_at: string;
}

export interface SiteObject {
  id: string;
  site_id: string;
  object_type: SiteObjectType;
  sub_type: string | null;
  tags: string[];
  geometry: GeoJSON.Geometry;
  measurements: ObjectMeasurements;
  properties: Json;
  source: ObjectSource;
  confidence: number | null;
  label: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  consumes: TradeObjectMapping[];
  settings: TradeSettings;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  organization_id: string | null;
  trade_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  unit: string;
  production_rate: number | null;
  crew_size: number;
  labor_rate: number;
  material_cost: number;
  equipment_cost_fixed: number;
  equipment_cost_hourly: number;
  waste_factor: number;
  minimum_charge: number;
  minimum_quantity: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstimateLineItem {
  id: string;
  serviceId: string;
  serviceName: string;
  description: string;
  quantity: number;
  unit: string;
  laborHours: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subtotal: number;
  overrideQuantity?: number;
  overridePrice?: number;
  sourceObjects: Array<{
    objectId: string;
    objectType: SiteObjectType;
    contribution: number;
  }>;
}

export interface ObjectDerivation {
  objectId: string;
  objectType: SiteObjectType;
  measurement: number;
  unit: string;
  contributesToLineItems: string[];
}

export interface TradeEstimate {
  id: string;
  site_id: string;
  trade_id: string;
  line_items: EstimateLineItem[];
  subtotal: number;
  mobilization: number;
  margin_percent: number;
  margin_amount: number;
  total: number;
  risk_flags: RiskFlag[];
  derived_from: ObjectDerivation[];
  version: number;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface UnifiedEstimate {
  id: string;
  site_id: string;
  name: string | null;
  trade_subtotals: Record<string, number>;
  combined_subtotal: number;
  shared_mobilization: number;
  shared_contingency: number;
  grand_total: number;
  total_area: number;
  total_linear_feet: number;
  total_labor_hours: number;
  revision_number: number;
  previous_revision_id: string | null;
  status: EstimateStatus;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface RevisionChange {
  type: 'object-added' | 'object-modified' | 'object-removed' | 'rate-changed' | 'override-applied';
  objectId?: string;
  tradeId?: string;
  description: string;
  impact: {
    previousValue: number;
    newValue: number;
    delta: number;
    deltaPercent: number;
  };
}

export interface EstimateRevision {
  id: string;
  unified_estimate_id: string;
  revision_number: number;
  changes: RevisionChange[];
  totals: {
    grandTotal: number;
    byTrade: Record<string, number>;
  };
  created_by: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// Insert Types (without auto-generated fields)
// ============================================

export type OrganizationInsert = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type SiteInsert = Omit<Site, 'id' | 'created_at' | 'updated_at'>;
export type SiteObjectInsert = Omit<SiteObject, 'id' | 'created_at' | 'updated_at'>;
export type TradeInsert = Omit<Trade, 'id' | 'created_at' | 'updated_at'>;
export type ServiceInsert = Omit<Service, 'id' | 'created_at' | 'updated_at'>;
export type TradeEstimateInsert = Omit<TradeEstimate, 'id' | 'created_at' | 'updated_at'>;
export type UnifiedEstimateInsert = Omit<UnifiedEstimate, 'id' | 'created_at' | 'updated_at'>;
export type EstimateRevisionInsert = Omit<EstimateRevision, 'id' | 'created_at'>;

// ============================================
// Update Types (all fields optional)
// ============================================

export type OrganizationUpdate = Partial<OrganizationInsert>;
export type ProfileUpdate = Partial<ProfileInsert>;
export type SiteUpdate = Partial<SiteInsert>;
export type SiteObjectUpdate = Partial<SiteObjectInsert>;
export type TradeUpdate = Partial<TradeInsert>;
export type ServiceUpdate = Partial<ServiceInsert>;
export type TradeEstimateUpdate = Partial<TradeEstimateInsert>;
export type UnifiedEstimateUpdate = Partial<UnifiedEstimateInsert>;

// ============================================
// Database Schema Type
// ============================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      sites: {
        Row: Site;
        Insert: SiteInsert;
        Update: SiteUpdate;
      };
      site_objects: {
        Row: SiteObject;
        Insert: SiteObjectInsert;
        Update: SiteObjectUpdate;
      };
      trades: {
        Row: Trade;
        Insert: TradeInsert;
        Update: TradeUpdate;
      };
      services: {
        Row: Service;
        Insert: ServiceInsert;
        Update: ServiceUpdate;
      };
      trade_estimates: {
        Row: TradeEstimate;
        Insert: TradeEstimateInsert;
        Update: TradeEstimateUpdate;
      };
      unified_estimates: {
        Row: UnifiedEstimate;
        Insert: UnifiedEstimateInsert;
        Update: UnifiedEstimateUpdate;
      };
      estimate_revisions: {
        Row: EstimateRevision;
        Insert: EstimateRevisionInsert;
        Update: never;
      };
    };
  };
}
