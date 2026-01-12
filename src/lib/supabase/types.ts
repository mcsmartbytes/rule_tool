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
// PDF Blueprint Types
// ============================================

export type PDFDocumentStatus = 'processing' | 'ready' | 'error';

export type PDFPageCategory =
  | 'site-plan'
  | 'floor-plan'
  | 'electrical'
  | 'mechanical'
  | 'plumbing'
  | 'structural'
  | 'landscape'
  | 'civil'
  | 'detail'
  | 'schedule'
  | 'cover'
  | 'other';

export type BlueprintFeatureSource = 'ai-detected' | 'manual' | 'imported';

export interface ScaleInfo {
  ratio: string; // e.g., "1:50"
  units: 'feet' | 'meters' | 'inches';
  pixelsPerUnit: number;
  calibrated: boolean;
}

export interface PDFDocument {
  id: string;
  organization_id: string | null;
  uploaded_by: string | null;
  name: string;
  storage_path: string;
  file_size: number | null;
  page_count: number | null;
  status: PDFDocumentStatus;
  error_message: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PDFPage {
  id: string;
  document_id: string;
  page_number: number;
  image_path: string;
  thumbnail_path: string | null;
  category: PDFPageCategory | null;
  category_confidence: number | null;
  scale_info: ScaleInfo | null;
  ai_analyzed: boolean;
  analyzed_at: string | null;
  metadata: Json;
  created_at: string;
}

export interface BlueprintFeature {
  id: string;
  page_id: string;
  site_id: string | null;
  object_type: SiteObjectType;
  sub_type: string | null;
  geometry: Json; // Page coordinates (pixels or scaled)
  measurements: ObjectMeasurements;
  confidence: number | null;
  label: string | null;
  source: BlueprintFeatureSource;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  properties: Json;
  created_at: string;
}

export interface PDFSiteLink {
  id: string;
  document_id: string;
  site_id: string;
  linked_by: string | null;
  linked_at: string;
  import_settings: Json;
}

// PDF Insert Types
export type PDFDocumentInsert = Omit<PDFDocument, 'id' | 'created_at' | 'updated_at'>;
export type PDFPageInsert = Omit<PDFPage, 'id' | 'created_at'>;
export type BlueprintFeatureInsert = Omit<BlueprintFeature, 'id' | 'created_at'>;
export type PDFSiteLinkInsert = Omit<PDFSiteLink, 'id' | 'linked_at'>;

// PDF Update Types
export type PDFDocumentUpdate = Partial<PDFDocumentInsert>;
export type PDFPageUpdate = Partial<PDFPageInsert>;
export type BlueprintFeatureUpdate = Partial<BlueprintFeatureInsert>;

// ============================================
// Bid Dashboard Types
// ============================================

export type BidStage =
  | 'lead'
  | 'qualifying'
  | 'proposal'
  | 'submitted'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'archived';

export type BidPriority = 'low' | 'medium' | 'high' | 'urgent';

export type BidActivityType =
  | 'stage_change'
  | 'note'
  | 'call'
  | 'email'
  | 'meeting'
  | 'site_visit'
  | 'rfi'
  | 'addendum'
  | 'file_upload'
  | 'estimate_updated'
  | 'team_change'
  | 'created';

export type RFIStatus = 'open' | 'answered' | 'closed' | 'void';
export type RFIPriority = 'low' | 'normal' | 'high' | 'critical';

export type BidNotificationType =
  | 'due_date_reminder'
  | 'due_date_passed'
  | 'rfi_created'
  | 'rfi_answered'
  | 'addendum_issued'
  | 'stage_change'
  | 'assignment'
  | 'mention'
  | 'estimate_ready'
  | 'site_visit_reminder';

export type BidDocumentCategory =
  | 'proposal'
  | 'contract'
  | 'plans'
  | 'specs'
  | 'photos'
  | 'correspondence'
  | 'insurance'
  | 'permits'
  | 'other';

export interface Bid {
  id: string;
  organization_id: string | null;
  site_id: string | null;
  name: string;
  description: string | null;
  bid_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_company: string | null;
  customer_address: string | null;
  stage: BidStage;
  stage_updated_at: string;
  loss_reason: string | null;
  owner_id: string | null;
  team_members: string[];
  bid_due_date: string | null;
  site_visit_date: string | null;
  project_start_date: string | null;
  project_end_date: string | null;
  estimated_value: number | null;
  final_value: number | null;
  probability: number;
  priority: BidPriority;
  tags: string[];
  source: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface BidActivity {
  id: string;
  bid_id: string;
  user_id: string | null;
  activity_type: BidActivityType;
  title: string;
  description: string | null;
  metadata: Json;
  created_at: string;
}

export interface BidRFI {
  id: string;
  bid_id: string;
  number: number;
  subject: string;
  question: string;
  answer: string | null;
  submitted_by: string | null;
  submitted_at: string;
  answered_by: string | null;
  answered_at: string | null;
  status: RFIStatus;
  due_date: string | null;
  attachments: Array<{ name: string; path: string; size: number }>;
  priority: RFIPriority;
  created_at: string;
  updated_at: string;
}

export interface BidAddendum {
  id: string;
  bid_id: string;
  number: number;
  title: string;
  description: string | null;
  issued_date: string;
  document_path: string | null;
  document_name: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  cost_impact: number | null;
  schedule_impact: number | null;
  created_at: string;
  updated_at: string;
}

export interface BidNotification {
  id: string;
  bid_id: string | null;
  user_id: string;
  type: BidNotificationType;
  title: string;
  message: string | null;
  read: boolean;
  read_at: string | null;
  action_url: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
}

export interface BidDocument {
  id: string;
  bid_id: string;
  uploaded_by: string | null;
  name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: BidDocumentCategory | null;
  version: number;
  previous_version_id: string | null;
  description: string | null;
  metadata: Json;
  created_at: string;
}

// Bid Insert Types
export type BidInsert = Omit<Bid, 'id' | 'created_at' | 'updated_at' | 'stage_updated_at'>;
export type BidActivityInsert = Omit<BidActivity, 'id' | 'created_at'>;
export type BidRFIInsert = Omit<BidRFI, 'id' | 'created_at' | 'updated_at' | 'number'>;
export type BidAddendumInsert = Omit<BidAddendum, 'id' | 'created_at' | 'updated_at' | 'number'>;
export type BidNotificationInsert = Omit<BidNotification, 'id' | 'created_at'>;
export type BidDocumentInsert = Omit<BidDocument, 'id' | 'created_at'>;

// Bid Update Types
export type BidUpdate = Partial<BidInsert>;
export type BidRFIUpdate = Partial<Omit<BidRFIInsert, 'bid_id'>>;
export type BidAddendumUpdate = Partial<Omit<BidAddendumInsert, 'bid_id'>>;
export type BidNotificationUpdate = Partial<Pick<BidNotification, 'read' | 'read_at'>>;

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
      // PDF Blueprint Tables
      pdf_documents: {
        Row: PDFDocument;
        Insert: PDFDocumentInsert;
        Update: PDFDocumentUpdate;
      };
      pdf_pages: {
        Row: PDFPage;
        Insert: PDFPageInsert;
        Update: PDFPageUpdate;
      };
      blueprint_features: {
        Row: BlueprintFeature;
        Insert: BlueprintFeatureInsert;
        Update: BlueprintFeatureUpdate;
      };
      pdf_site_links: {
        Row: PDFSiteLink;
        Insert: PDFSiteLinkInsert;
        Update: never;
      };
      // Bid Dashboard Tables
      bids: {
        Row: Bid;
        Insert: BidInsert;
        Update: BidUpdate;
      };
      bid_activities: {
        Row: BidActivity;
        Insert: BidActivityInsert;
        Update: never;
      };
      bid_rfis: {
        Row: BidRFI;
        Insert: BidRFIInsert;
        Update: BidRFIUpdate;
      };
      bid_addenda: {
        Row: BidAddendum;
        Insert: BidAddendumInsert;
        Update: BidAddendumUpdate;
      };
      bid_notifications: {
        Row: BidNotification;
        Insert: BidNotificationInsert;
        Update: BidNotificationUpdate;
      };
      bid_documents: {
        Row: BidDocument;
        Insert: BidDocumentInsert;
        Update: never;
      };
    };
  };
}
