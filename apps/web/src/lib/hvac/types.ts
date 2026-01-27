/**
 * HVAC Estimating Platform - TypeScript Types
 * Matches the Supabase schema in 007_hvac_estimating.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type HvacProjectStatus =
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'submitted'
  | 'won'
  | 'lost'
  | 'archived';

export type HvacProjectType =
  | 'new_construction'
  | 'retrofit'
  | 'change_out'
  | 'add_on'
  | 'service'
  | 'design_build';

export type HvacBuildingType =
  | 'single_family'
  | 'multi_family'
  | 'office'
  | 'retail'
  | 'restaurant'
  | 'warehouse'
  | 'school'
  | 'healthcare'
  | 'industrial'
  | 'mixed_use'
  | 'other';

export type HvacEquipmentType =
  | 'rtu'
  | 'split_system'
  | 'heat_pump'
  | 'minisplit'
  | 'vrf'
  | 'chiller'
  | 'boiler'
  | 'ahu'
  | 'fan_coil'
  | 'unit_heater'
  | 'makeup_air'
  | 'erv_hrv'
  | 'exhaust_fan'
  | 'other';

export type HvacDuctType =
  | 'supply'
  | 'return'
  | 'exhaust'
  | 'outside_air'
  | 'flex'
  | 'transfer';

export type HvacAirDeviceType =
  | 'supply_diffuser'
  | 'return_grille'
  | 'register'
  | 'exhaust_grille'
  | 'linear_slot'
  | 'vav_box'
  | 'fan_powered_box'
  | 'fan_coil_unit';

export type HvacControlType =
  | 'thermostat'
  | 'sensor_temp'
  | 'sensor_co2'
  | 'sensor_occupancy'
  | 'sensor_humidity'
  | 'control_panel'
  | 'bas_controller'
  | 'vfd'
  | 'damper_actuator';

export type HvacPipingType =
  | 'refrigerant_suction'
  | 'refrigerant_liquid'
  | 'condensate'
  | 'gas'
  | 'chilled_water_supply'
  | 'chilled_water_return'
  | 'hot_water_supply'
  | 'hot_water_return'
  | 'steam'
  | 'condensate_return';

export type HvacDocType =
  | 'mechanical_plan'
  | 'equipment_schedule'
  | 'spec_div23'
  | 'load_calc'
  | 'detail'
  | 'riser_diagram'
  | 'control_diagram'
  | 'other';

export type HvacPageType =
  | 'duct_layout'
  | 'equipment_plan'
  | 'piping_isometric'
  | 'schedule'
  | 'detail'
  | 'legend'
  | 'riser'
  | 'control'
  | 'general_notes'
  | 'other';

export type HvacRiskCategory =
  | 'design'
  | 'coordination'
  | 'logistics'
  | 'scope'
  | 'supply_chain'
  | 'labor'
  | 'financial';

export type HvacRiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type HvacNoteType =
  | 'assumption'
  | 'exclusion'
  | 'allowance'
  | 'clarification'
  | 'internal'
  | 'value_engineering';

// ============================================================================
// DATABASE ENTITIES
// ============================================================================

export interface HvacProject {
  id: string;
  user_id: string;

  // Project Info
  name: string;
  project_number?: string;
  description?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  jurisdiction?: string;

  // Building Info
  building_type?: HvacBuildingType;
  total_sqft?: number;
  conditioned_sqft?: number;
  num_floors?: number;
  ceiling_height_ft?: number;
  year_built?: number;

  // Climate & Design
  climate_zone?: string;
  heating_design_temp?: number;
  cooling_design_temp?: number;

  // Project Type & Conditions
  project_type?: HvacProjectType;
  occupied_space?: boolean;
  working_height?: 'standard' | 'high' | 'very_high';
  access_difficulty?: 'easy' | 'moderate' | 'difficult';
  union_labor?: boolean;
  night_work?: boolean;

  // Client Info
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;

  // General Contractor
  gc_name?: string;
  gc_company?: string;
  gc_email?: string;
  gc_phone?: string;

  // Bid Info
  bid_due_date?: string;
  bid_time?: string;
  plan_set_date?: string;
  plan_revision?: string;

  // Status
  status: HvacProjectStatus;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface HvacDocument {
  id: string;
  project_id: string;

  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  page_count?: number;

  doc_type?: HvacDocType;

  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  processed_at?: string;

  uploaded_by?: string;
  created_at: string;
}

export interface HvacDocumentPage {
  id: string;
  document_id: string;

  page_number: number;
  page_image_url?: string;

  page_type?: HvacPageType;
  classification_confidence?: number;
  sheet_number?: string;
  sheet_title?: string;

  extracted_data: Record<string, unknown>;
  extraction_notes?: string[];

  reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;

  created_at: string;
}

export interface HvacEquipment {
  id: string;
  project_id: string;
  source_page_id?: string;

  tag?: string;
  equipment_type: HvacEquipmentType;
  description?: string;

  location?: string;
  serves_area?: string;

  // Cooling
  cooling_tons?: number;
  cooling_btuh?: number;
  cooling_mbh?: number;

  // Heating
  heating_btuh?: number;
  heating_mbh?: number;
  heating_kw?: number;

  // Airflow
  cfm?: number;
  cfm_min?: number;
  cfm_max?: number;
  external_static?: number;

  // Specs
  manufacturer?: string;
  model?: string;
  refrigerant?: string;

  // Efficiency
  seer?: number;
  eer?: number;
  ieer?: number;
  hspf?: number;
  afue?: number;
  cop?: number;

  // Electrical
  voltage?: number;
  phase?: number;
  hertz?: number;
  fla?: number;
  mca?: number;
  mocp?: number;

  // Physical
  weight_lbs?: number;
  length_in?: number;
  width_in?: number;
  height_in?: number;

  // Installation
  requires_crane?: boolean;
  crane_weight_lbs?: number;
  requires_curb?: boolean;
  curb_size?: string;
  requires_pad?: boolean;
  pad_size?: string;

  // Accessories
  economizer?: boolean;
  economizer_type?: string;
  vfd?: boolean;
  erv_hrv?: boolean;
  filter_type?: string;
  uv_light?: boolean;
  humidifier?: boolean;

  quantity: number;

  // Pricing
  equipment_cost?: number;
  installation_hours?: number;
  total_cost?: number;

  // AI
  ai_extracted?: boolean;
  ai_confidence?: number;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;

  notes?: string;

  created_at: string;
  updated_at: string;
}

export interface HvacDuctwork {
  id: string;
  project_id: string;
  source_page_id?: string;

  duct_type: HvacDuctType;

  width_in?: number;
  height_in?: number;
  diameter_in?: number;
  size_display?: string;

  linear_feet: number;

  material?: string;
  gauge?: number;
  seam_type?: string;
  spiral?: boolean;

  insulation_type?: string;
  insulation_thickness?: number;
  insulation_r_value?: number;
  insulation_facing?: string;

  system_tag?: string;

  material_cost_per_lf?: number;
  labor_hours_per_lf?: number;
  total_cost?: number;

  ai_extracted?: boolean;
  ai_confidence?: number;
  verified?: boolean;

  notes?: string;

  created_at: string;
}

export interface HvacFitting {
  id: string;
  project_id: string;

  fitting_type: string;
  size_1?: string;
  size_2?: string;
  material?: string;

  quantity: number;

  unit_cost?: number;
  labor_hours_each?: number;
  total_cost?: number;

  notes?: string;

  created_at: string;
}

export interface HvacAirDevice {
  id: string;
  project_id: string;
  source_page_id?: string;

  device_type: HvacAirDeviceType;

  size?: string;
  neck_size?: string;

  cfm?: number;
  cfm_min?: number;
  cfm_max?: number;

  // VAV specific
  vav_type?: string;
  reheat_type?: string;
  reheat_kw?: number;
  reheat_mbh?: number;
  fan_motor_hp?: number;

  manufacturer?: string;
  model?: string;
  material?: string;
  finish?: string;

  quantity: number;

  system_tag?: string;
  room_served?: string;

  unit_cost?: number;
  labor_hours_each?: number;
  total_cost?: number;

  ai_extracted?: boolean;
  ai_confidence?: number;
  verified?: boolean;

  notes?: string;

  created_at: string;
}

export interface HvacControl {
  id: string;
  project_id: string;

  control_type: HvacControlType;

  manufacturer?: string;
  model?: string;
  description?: string;

  thermostat_type?: string;
  stages_cool?: number;
  stages_heat?: number;
  zones_controlled?: number;

  sensor_range?: string;
  sensor_accuracy?: string;

  bas_points?: number;
  protocol?: string;

  vfd_hp?: number;
  vfd_voltage?: number;

  quantity: number;

  wiring_type?: string;
  wiring_lf?: number;

  unit_cost?: number;
  wiring_cost?: number;
  labor_hours_each?: number;
  total_cost?: number;

  notes?: string;

  created_at: string;
}

export interface HvacPiping {
  id: string;
  project_id: string;

  piping_type: HvacPipingType;

  size: string;
  size_inches?: number;

  linear_feet: number;

  material?: string;
  schedule?: string;

  insulation_type?: string;
  insulation_thickness?: number;

  fittings_count?: number;
  fittings_allowance_percent?: number;

  system_tag?: string;

  material_cost_per_lf?: number;
  insulation_cost_per_lf?: number;
  labor_hours_per_lf?: number;
  total_cost?: number;

  notes?: string;

  created_at: string;
}

export interface HvacDamper {
  id: string;
  project_id: string;

  damper_type: string;
  size?: string;

  manufacturer?: string;
  model?: string;
  rating?: string;

  actuator_type?: string;
  actuator_voltage?: number;
  fail_position?: string;

  quantity: number;

  unit_cost?: number;
  labor_hours_each?: number;
  total_cost?: number;

  notes?: string;

  created_at: string;
}

export interface HvacChecklist {
  id: string;
  project_id: string;

  // Section A
  a_project_name: boolean;
  a_jurisdiction: boolean;
  a_plan_set_date: boolean;
  a_mechanical_drawings: boolean;
  a_specifications: boolean;
  a_legends: boolean;
  a_addenda_reviewed: boolean;
  a_scope_letter: boolean;
  a_notes?: string;

  // Section B
  b_building_type: boolean;
  b_total_sf: boolean;
  b_ceiling_heights: boolean;
  b_occupancy_loads: boolean;
  b_operating_hours: boolean;
  b_insulation_values: boolean;
  b_climate_zone: boolean;
  b_load_calc: boolean;
  b_load_calc_method?: string;
  b_notes?: string;

  // Section C
  c_system_type: boolean;
  c_manufacturer: boolean;
  c_tonnage: boolean;
  c_efficiency: boolean;
  c_voltage: boolean;
  c_quantities: boolean;
  c_accessories: boolean;
  c_lead_times: boolean;
  c_notes?: string;

  // Section D
  d_supply_duct: boolean;
  d_return_duct: boolean;
  d_exhaust_duct: boolean;
  d_flex_duct: boolean;
  d_duct_material: boolean;
  d_insulation: boolean;
  d_dampers: boolean;
  d_notes?: string;

  // Section E
  e_supply_diffusers: boolean;
  e_return_grilles: boolean;
  e_vav_boxes: boolean;
  e_fan_coils: boolean;
  e_notes?: string;

  // Section F
  f_thermostat_count: boolean;
  f_zoning_requirements: boolean;
  f_bas_integration: boolean;
  f_sensors: boolean;
  f_control_wiring: boolean;
  f_notes?: string;

  // Section G
  g_refrigerant_lines: boolean;
  g_condensate_drains: boolean;
  g_gas_piping: boolean;
  g_hydronic_piping: boolean;
  g_penetrations: boolean;
  g_notes?: string;

  // Section H
  h_mca_mocp: boolean;
  h_disconnects: boolean;
  h_vfds: boolean;
  h_electrical_by_others: boolean;
  h_electrical_confirmed?: string;
  h_notes?: string;

  // Section I
  i_new_construction: boolean;
  i_occupied_space: boolean;
  i_working_height?: string;
  i_requires_lift: boolean;
  i_requires_crane: boolean;
  i_staging_area: boolean;
  i_phasing: boolean;
  i_notes?: string;

  // Section J
  j_permits: boolean;
  j_tab_scope: boolean;
  j_startup: boolean;
  j_commissioning: boolean;
  j_training: boolean;
  j_warranty: boolean;
  j_notes?: string;

  // Section K
  k_exclusions_listed: boolean;
  k_allowances: boolean;
  k_risk_flags: boolean;
  k_notes?: string;

  completion_percent: number;
  checklist_complete: boolean;

  estimator_sign_off?: string;
  sign_off_date?: string;
  reviewer_sign_off?: string;
  reviewer_sign_off_date?: string;

  created_at: string;
  updated_at: string;
}

export interface HvacRiskFlag {
  id: string;
  project_id: string;

  risk_category: HvacRiskCategory;
  severity: HvacRiskSeverity;

  title: string;
  description?: string;

  source?: string;
  source_reference?: string;

  resolved: boolean;
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;

  cost_impact?: number;
  schedule_impact_days?: number;

  created_at: string;
}

export interface HvacEstimate {
  id: string;
  project_id: string;

  estimate_number?: string;
  version: number;
  is_current: boolean;

  // Material Costs
  equipment_material: number;
  ductwork_material: number;
  fittings_material: number;
  air_devices_material: number;
  controls_material: number;
  piping_material: number;
  dampers_material: number;
  insulation_material: number;
  misc_material: number;
  material_subtotal: number;

  // Labor Hours
  equipment_labor_hours: number;
  ductwork_labor_hours: number;
  air_devices_labor_hours: number;
  controls_labor_hours: number;
  piping_labor_hours: number;
  misc_labor_hours: number;
  total_labor_hours: number;

  // Labor Rates
  labor_rate_journeyman?: number;
  labor_rate_apprentice?: number;
  labor_rate_foreman?: number;
  labor_rate_blended?: number;

  // Labor Adjustments
  difficulty_multiplier: number;
  retrofit_multiplier: number;
  height_multiplier: number;
  access_multiplier: number;
  union_multiplier: number;
  night_multiplier: number;
  combined_multiplier: number;

  adjusted_labor_hours: number;
  labor_subtotal: number;

  // Other Direct Costs
  permits_fees: number;
  crane_rigging: number;
  equipment_rental: number;
  freight_shipping: number;
  subcontractors: number;
  tab_testing: number;
  commissioning: number;
  startup_training: number;
  bonds_insurance: number;
  other_direct: number;
  direct_costs_subtotal: number;

  // Subtotal
  subtotal: number;

  // Markups
  contingency_percent: number;
  contingency_amount: number;
  overhead_percent: number;
  overhead_amount: number;
  profit_percent: number;
  profit_amount: number;

  // Grand Total
  grand_total: number;

  // Metrics
  cost_per_sqft?: number;
  cost_per_ton?: number;

  // Risk Scoring
  design_completeness_score?: number;
  coordination_risk_score?: number;
  logistics_risk_score?: number;
  scope_clarity_score?: number;
  supply_chain_risk_score?: number;
  overall_risk_score?: number;
  risk_level?: HvacRiskSeverity;

  status: 'draft' | 'review' | 'approved' | 'submitted' | 'revised';

  created_at: string;
  updated_at: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface HvacEstimateNote {
  id: string;
  estimate_id: string;

  note_type: HvacNoteType;
  content: string;
  internal_only: boolean;
  sort_order: number;

  created_at: string;
  created_by?: string;
}

export interface HvacPricing {
  id: string;
  user_id?: string;

  category: string;
  item_type: string;
  item_subtype?: string;

  description?: string;

  size?: string;
  size_min?: number;
  size_max?: number;
  capacity_min?: number;
  capacity_max?: number;

  material_cost?: number;
  material_unit?: string;

  labor_hours?: number;
  labor_unit?: string;

  difficulty_factor: number;

  source?: string;
  effective_date?: string;
  expiration_date?: string;
  region?: string;

  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface HvacUserSettings {
  id: string;
  user_id: string;

  // Labor Rates
  labor_rate_journeyman: number;
  labor_rate_apprentice: number;
  labor_rate_foreman: number;
  labor_rate_sheet_metal: number;
  labor_rate_pipefitter: number;

  // Default Markups
  default_contingency: number;
  default_overhead: number;
  default_profit: number;

  // Regional
  region?: string;
  union_shop: boolean;

  // Company Info
  company_name?: string;
  company_logo_url?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_zip?: string;
  company_phone?: string;
  company_email?: string;
  license_number?: string;

  // Preferences
  default_building_type?: HvacBuildingType;
  default_climate_zone?: string;
  auto_calculate_fittings: boolean;
  fittings_percent_of_duct: number;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPOSITE TYPES (for UI/API)
// ============================================================================

export interface HvacProjectWithDetails extends HvacProject {
  documents?: HvacDocument[];
  equipment?: HvacEquipment[];
  checklist?: HvacChecklist;
  estimate?: HvacEstimate;
  risk_flags?: HvacRiskFlag[];
}

export interface HvacTakeoffSummary {
  equipment: {
    total_units: number;
    total_tons: number;
    total_cfm: number;
    by_type: Record<HvacEquipmentType, number>;
  };
  ductwork: {
    total_lf: number;
    by_type: Record<HvacDuctType, number>;
    by_size: Record<string, number>;
  };
  air_devices: {
    total_count: number;
    by_type: Record<HvacAirDeviceType, number>;
  };
  controls: {
    total_count: number;
    by_type: Record<HvacControlType, number>;
  };
  piping: {
    total_lf: number;
    by_type: Record<HvacPipingType, number>;
  };
}

export interface HvacRiskScoring {
  design_completeness: {
    score: number;
    factors: Record<string, boolean | number>;
  };
  coordination_risk: {
    score: number;
    factors: Record<string, boolean | number>;
  };
  logistics_risk: {
    score: number;
    factors: Record<string, boolean | number>;
  };
  scope_clarity: {
    score: number;
    factors: Record<string, boolean | number>;
  };
  supply_chain: {
    score: number;
    factors: Record<string, boolean | number>;
  };
  overall_score: number;
  risk_level: HvacRiskSeverity;
  recommendations: string[];
  red_flags: string[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateHvacProjectRequest {
  name: string;
  project_number?: string;
  building_type?: HvacBuildingType;
  project_type?: HvacProjectType;
  total_sqft?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  climate_zone?: string;
  bid_due_date?: string;
}

export interface UpdateHvacProjectRequest extends Partial<HvacProject> {
  id: string;
}

export interface HvacExtractionRequest {
  page_id: string;
  page_type: HvacPageType;
  image_url: string;
}

export interface HvacExtractionResponse {
  success: boolean;
  data?: Record<string, unknown>;
  confidence?: number;
  notes?: string[];
  error?: string;
}

export interface GenerateEstimateRequest {
  project_id: string;
  labor_rates?: {
    journeyman: number;
    apprentice: number;
    foreman: number;
  };
  markups?: {
    contingency: number;
    overhead: number;
    profit: number;
  };
}

// ============================================================================
// TYPE ALIASES (for form compatibility)
// ============================================================================

// Extended building types for the project wizard form
export type BuildingType =
  | 'office'
  | 'retail'
  | 'healthcare'
  | 'education'
  | 'industrial'
  | 'warehouse'
  | 'residential_multi'
  | 'hospitality'
  | 'restaurant'
  | 'data_center'
  | 'laboratory'
  | 'mixed_use'
  | 'other';

// System archetype for HVAC system selection
export type SystemArchetype =
  | 'vav_central'
  | 'vrf'
  | 'rooftop_units'
  | 'split_systems'
  | 'chilled_beams'
  | 'doas_radiant'
  | 'geothermal'
  | 'district'
  | 'hybrid';

// ASHRAE climate zones
export type ClimateZone =
  | '1a' | '1b'
  | '2a' | '2b'
  | '3a' | '3b' | '3c'
  | '4a' | '4b' | '4c'
  | '5a' | '5b' | '5c'
  | '6a' | '6b'
  | '7'
  | '8';

// Checklist item status for the master HVAC estimating checklist
export type ChecklistStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'not_applicable';
