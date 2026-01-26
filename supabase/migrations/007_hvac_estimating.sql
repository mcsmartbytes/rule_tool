-- ============================================================================
-- HVAC Estimating Platform - Database Schema
-- Migration: 007_hvac_estimating.sql
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE hvac_project_status AS ENUM (
  'draft',
  'in_progress',
  'review',
  'submitted',
  'won',
  'lost',
  'archived'
);

CREATE TYPE hvac_project_type AS ENUM (
  'new_construction',
  'retrofit',
  'change_out',
  'add_on',
  'service',
  'design_build'
);

CREATE TYPE hvac_building_type AS ENUM (
  'single_family',
  'multi_family',
  'office',
  'retail',
  'restaurant',
  'warehouse',
  'school',
  'healthcare',
  'industrial',
  'mixed_use',
  'other'
);

CREATE TYPE hvac_equipment_type AS ENUM (
  'rtu',
  'split_system',
  'heat_pump',
  'minisplit',
  'vrf',
  'chiller',
  'boiler',
  'ahu',
  'fan_coil',
  'unit_heater',
  'makeup_air',
  'erv_hrv',
  'exhaust_fan',
  'other'
);

CREATE TYPE hvac_duct_type AS ENUM (
  'supply',
  'return',
  'exhaust',
  'outside_air',
  'flex',
  'transfer'
);

CREATE TYPE hvac_air_device_type AS ENUM (
  'supply_diffuser',
  'return_grille',
  'register',
  'exhaust_grille',
  'linear_slot',
  'vav_box',
  'fan_powered_box',
  'fan_coil_unit'
);

CREATE TYPE hvac_control_type AS ENUM (
  'thermostat',
  'sensor_temp',
  'sensor_co2',
  'sensor_occupancy',
  'sensor_humidity',
  'control_panel',
  'bas_controller',
  'vfd',
  'damper_actuator'
);

CREATE TYPE hvac_piping_type AS ENUM (
  'refrigerant_suction',
  'refrigerant_liquid',
  'condensate',
  'gas',
  'chilled_water_supply',
  'chilled_water_return',
  'hot_water_supply',
  'hot_water_return',
  'steam',
  'condensate_return'
);

CREATE TYPE hvac_doc_type AS ENUM (
  'mechanical_plan',
  'equipment_schedule',
  'spec_div23',
  'load_calc',
  'detail',
  'riser_diagram',
  'control_diagram',
  'other'
);

CREATE TYPE hvac_page_type AS ENUM (
  'duct_layout',
  'equipment_plan',
  'piping_isometric',
  'schedule',
  'detail',
  'legend',
  'riser',
  'control',
  'general_notes',
  'other'
);

CREATE TYPE hvac_risk_category AS ENUM (
  'design',
  'coordination',
  'logistics',
  'scope',
  'supply_chain',
  'labor',
  'financial'
);

CREATE TYPE hvac_risk_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE hvac_note_type AS ENUM (
  'assumption',
  'exclusion',
  'allowance',
  'clarification',
  'internal',
  'value_engineering'
);

-- ============================================================================
-- HVAC PROJECTS
-- ============================================================================

CREATE TABLE hvac_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Project Info
  name TEXT NOT NULL,
  project_number TEXT,
  description TEXT,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  jurisdiction TEXT,

  -- Building Info
  building_type hvac_building_type,
  total_sqft INTEGER,
  conditioned_sqft INTEGER,
  num_floors INTEGER DEFAULT 1,
  ceiling_height_ft DECIMAL(5,2),
  year_built INTEGER,

  -- Climate & Design
  climate_zone TEXT, -- 1-7 from hvac-rules.ts
  heating_design_temp INTEGER,
  cooling_design_temp INTEGER,

  -- Project Type & Conditions
  project_type hvac_project_type DEFAULT 'new_construction',
  occupied_space BOOLEAN DEFAULT false,
  working_height TEXT DEFAULT 'standard', -- standard, high, very_high
  access_difficulty TEXT DEFAULT 'easy', -- easy, moderate, difficult
  union_labor BOOLEAN DEFAULT false,
  night_work BOOLEAN DEFAULT false,

  -- Client Info
  client_name TEXT,
  client_company TEXT,
  client_email TEXT,
  client_phone TEXT,

  -- General Contractor
  gc_name TEXT,
  gc_company TEXT,
  gc_email TEXT,
  gc_phone TEXT,

  -- Bid Info
  bid_due_date DATE,
  bid_time TIME,
  plan_set_date DATE,
  plan_revision TEXT,

  -- Status
  status hvac_project_status DEFAULT 'draft',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC DOCUMENTS
-- ============================================================================

CREATE TABLE hvac_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,

  -- Document Info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT, -- pdf, dwg, etc.
  page_count INTEGER,

  -- Document Type
  doc_type hvac_doc_type,

  -- Processing Status
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC DOCUMENT PAGES
-- ============================================================================

CREATE TABLE hvac_document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES hvac_documents(id) ON DELETE CASCADE NOT NULL,

  page_number INTEGER NOT NULL,
  page_image_url TEXT,

  -- AI Classification
  page_type hvac_page_type,
  classification_confidence DECIMAL(3,2),
  sheet_number TEXT, -- M-101, M-201, etc.
  sheet_title TEXT,

  -- Extracted Data (JSONB for flexibility)
  extracted_data JSONB DEFAULT '{}',
  extraction_notes TEXT[],

  -- Review Status
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, page_number)
);

-- ============================================================================
-- HVAC EQUIPMENT
-- ============================================================================

CREATE TABLE hvac_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,
  source_page_id UUID REFERENCES hvac_document_pages(id) ON DELETE SET NULL,

  -- Equipment Identity
  tag TEXT, -- Equipment tag from drawings (RTU-1, AHU-2, etc.)
  equipment_type hvac_equipment_type NOT NULL,
  description TEXT,

  -- Location
  location TEXT, -- rooftop, ground, indoor, closet, attic, basement, mechanical_room
  serves_area TEXT, -- Area/zone served

  -- Capacity - Cooling
  cooling_tons DECIMAL(6,2),
  cooling_btuh INTEGER,
  cooling_mbh DECIMAL(6,2),

  -- Capacity - Heating
  heating_btuh INTEGER,
  heating_mbh DECIMAL(6,2),
  heating_kw DECIMAL(6,2),

  -- Airflow
  cfm INTEGER,
  cfm_min INTEGER,
  cfm_max INTEGER,
  external_static DECIMAL(4,2), -- inches w.g.

  -- Specifications
  manufacturer TEXT,
  model TEXT,
  refrigerant TEXT, -- R-410A, R-32, etc.

  -- Efficiency
  seer DECIMAL(4,1),
  eer DECIMAL(4,1),
  ieer DECIMAL(4,1),
  hspf DECIMAL(4,1),
  afue DECIMAL(5,2),
  cop DECIMAL(4,2),

  -- Electrical
  voltage INTEGER,
  phase INTEGER,
  hertz INTEGER DEFAULT 60,
  fla DECIMAL(5,2), -- Full Load Amps
  mca DECIMAL(5,2), -- Minimum Circuit Ampacity
  mocp INTEGER, -- Maximum Overcurrent Protection

  -- Physical
  weight_lbs INTEGER,
  length_in DECIMAL(6,2),
  width_in DECIMAL(6,2),
  height_in DECIMAL(6,2),

  -- Installation Requirements
  requires_crane BOOLEAN DEFAULT false,
  crane_weight_lbs INTEGER,
  requires_curb BOOLEAN DEFAULT false,
  curb_size TEXT,
  requires_pad BOOLEAN DEFAULT false,
  pad_size TEXT,

  -- Accessories
  economizer BOOLEAN DEFAULT false,
  economizer_type TEXT, -- dry_bulb, enthalpy, differential
  vfd BOOLEAN DEFAULT false,
  erv_hrv BOOLEAN DEFAULT false,
  filter_type TEXT,
  uv_light BOOLEAN DEFAULT false,
  humidifier BOOLEAN DEFAULT false,

  -- Quantity
  quantity INTEGER DEFAULT 1,

  -- Pricing
  equipment_cost DECIMAL(12,2),
  installation_hours DECIMAL(6,2),
  total_cost DECIMAL(12,2),

  -- AI Extraction
  ai_extracted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC DUCTWORK
-- ============================================================================

CREATE TABLE hvac_ductwork (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,
  source_page_id UUID REFERENCES hvac_document_pages(id) ON DELETE SET NULL,

  -- Duct Type
  duct_type hvac_duct_type NOT NULL,

  -- Size (rectangular)
  width_in INTEGER,
  height_in INTEGER,

  -- Size (round)
  diameter_in INTEGER,

  -- Size display (for convenience)
  size_display TEXT, -- "24x12" or "14 RD"

  -- Quantity
  linear_feet DECIMAL(8,2) NOT NULL,

  -- Material & Construction
  material TEXT DEFAULT 'galvanized', -- galvanized, aluminum, stainless, fiberglass, pvc
  gauge INTEGER, -- 26, 24, 22, 20, 18
  seam_type TEXT, -- pittsburgh, snaplock, welded
  spiral BOOLEAN DEFAULT false,

  -- Insulation
  insulation_type TEXT, -- internal_liner, external_wrap, none
  insulation_thickness DECIMAL(3,1),
  insulation_r_value DECIMAL(3,1),
  insulation_facing TEXT, -- fsk, plain, none

  -- System Reference
  system_tag TEXT, -- Which equipment this serves

  -- Pricing
  material_cost_per_lf DECIMAL(8,2),
  labor_hours_per_lf DECIMAL(4,2),
  total_cost DECIMAL(12,2),

  -- AI Extraction
  ai_extracted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  verified BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC FITTINGS
-- ============================================================================

CREATE TABLE hvac_fittings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,

  fitting_type TEXT NOT NULL, -- elbow_90, elbow_45, tee, wye, reducer, offset, transition, end_cap, takeoff, collar

  -- Size
  size_1 TEXT, -- Primary size (e.g., "24x12" or "14")
  size_2 TEXT, -- Secondary size for reducers/transitions

  -- Material
  material TEXT DEFAULT 'galvanized',

  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  unit_cost DECIMAL(8,2),
  labor_hours_each DECIMAL(4,2),
  total_cost DECIMAL(12,2),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC AIR DEVICES
-- ============================================================================

CREATE TABLE hvac_air_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,
  source_page_id UUID REFERENCES hvac_document_pages(id) ON DELETE SET NULL,

  device_type hvac_air_device_type NOT NULL,

  -- Size
  size TEXT, -- "24x24", "12x12", "14 RD", "4ft"
  neck_size TEXT,

  -- Performance
  cfm INTEGER,
  cfm_min INTEGER,
  cfm_max INTEGER,

  -- VAV/Fan Powered Box Specific
  vav_type TEXT, -- pressure_independent, pressure_dependent
  reheat_type TEXT, -- none, electric, hot_water
  reheat_kw DECIMAL(5,2),
  reheat_mbh DECIMAL(5,2),
  fan_motor_hp DECIMAL(4,3),

  -- Specifications
  manufacturer TEXT,
  model TEXT,
  material TEXT, -- steel, aluminum
  finish TEXT, -- white, mill, custom

  quantity INTEGER NOT NULL DEFAULT 1,

  -- Location/System
  system_tag TEXT,
  room_served TEXT,

  -- Pricing
  unit_cost DECIMAL(8,2),
  labor_hours_each DECIMAL(4,2),
  total_cost DECIMAL(12,2),

  -- AI Extraction
  ai_extracted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  verified BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC CONTROLS
-- ============================================================================

CREATE TABLE hvac_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,

  control_type hvac_control_type NOT NULL,

  -- Specifications
  manufacturer TEXT,
  model TEXT,
  description TEXT,

  -- For thermostats
  thermostat_type TEXT, -- basic, programmable, smart, commercial
  stages_cool INTEGER,
  stages_heat INTEGER,
  zones_controlled INTEGER,

  -- For sensors
  sensor_range TEXT,
  sensor_accuracy TEXT,

  -- For BAS
  bas_points INTEGER,
  protocol TEXT, -- bacnet, modbus, lonworks, proprietary

  -- For VFDs
  vfd_hp DECIMAL(5,2),
  vfd_voltage INTEGER,

  quantity INTEGER NOT NULL DEFAULT 1,

  -- Wiring
  wiring_type TEXT,
  wiring_lf DECIMAL(8,2),

  -- Pricing
  unit_cost DECIMAL(8,2),
  wiring_cost DECIMAL(8,2),
  labor_hours_each DECIMAL(4,2),
  total_cost DECIMAL(12,2),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC PIPING
-- ============================================================================

CREATE TABLE hvac_piping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,

  piping_type hvac_piping_type NOT NULL,

  -- Size
  size TEXT NOT NULL, -- "3/4", "1-1/8", "2", etc.
  size_inches DECIMAL(4,3), -- Numeric for calculations

  -- Quantity
  linear_feet DECIMAL(8,2) NOT NULL,

  -- Material
  material TEXT, -- copper, black_iron, pvc, cpvc, pex, steel
  schedule TEXT, -- 40, 80, etc. for steel/pvc

  -- Insulation
  insulation_type TEXT, -- armaflex, fiberglass, none
  insulation_thickness DECIMAL(3,1),

  -- Fittings (estimated)
  fittings_count INTEGER,
  fittings_allowance_percent DECIMAL(4,1),

  -- System Reference
  system_tag TEXT,

  -- Pricing
  material_cost_per_lf DECIMAL(8,2),
  insulation_cost_per_lf DECIMAL(8,2),
  labor_hours_per_lf DECIMAL(4,2),
  total_cost DECIMAL(12,2),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC DAMPERS
-- ============================================================================

CREATE TABLE hvac_dampers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,

  damper_type TEXT NOT NULL, -- fire, smoke, fire_smoke, volume, backdraft, balancing, motorized

  -- Size
  size TEXT, -- "24x12", "14 RD"

  -- Specifications
  manufacturer TEXT,
  model TEXT,
  rating TEXT, -- 1.5hr, 3hr, UL555, UL555S

  -- For motorized
  actuator_type TEXT, -- electric, pneumatic
  actuator_voltage INTEGER,
  fail_position TEXT, -- open, closed, last

  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  unit_cost DECIMAL(8,2),
  labor_hours_each DECIMAL(4,2),
  total_cost DECIMAL(12,2),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC CHECKLIST
-- ============================================================================

CREATE TABLE hvac_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Section A: Project & Document Control
  a_project_name BOOLEAN DEFAULT false,
  a_jurisdiction BOOLEAN DEFAULT false,
  a_plan_set_date BOOLEAN DEFAULT false,
  a_mechanical_drawings BOOLEAN DEFAULT false,
  a_specifications BOOLEAN DEFAULT false,
  a_legends BOOLEAN DEFAULT false,
  a_addenda_reviewed BOOLEAN DEFAULT false,
  a_scope_letter BOOLEAN DEFAULT false,
  a_notes TEXT,

  -- Section B: Building & Load Assumptions
  b_building_type BOOLEAN DEFAULT false,
  b_total_sf BOOLEAN DEFAULT false,
  b_ceiling_heights BOOLEAN DEFAULT false,
  b_occupancy_loads BOOLEAN DEFAULT false,
  b_operating_hours BOOLEAN DEFAULT false,
  b_insulation_values BOOLEAN DEFAULT false,
  b_climate_zone BOOLEAN DEFAULT false,
  b_load_calc BOOLEAN DEFAULT false,
  b_load_calc_method TEXT, -- manual_j, manual_n, ashrae
  b_notes TEXT,

  -- Section C: Equipment Takeoff
  c_system_type BOOLEAN DEFAULT false,
  c_manufacturer BOOLEAN DEFAULT false,
  c_tonnage BOOLEAN DEFAULT false,
  c_efficiency BOOLEAN DEFAULT false,
  c_voltage BOOLEAN DEFAULT false,
  c_quantities BOOLEAN DEFAULT false,
  c_accessories BOOLEAN DEFAULT false,
  c_lead_times BOOLEAN DEFAULT false,
  c_notes TEXT,

  -- Section D: Ductwork Takeoff
  d_supply_duct BOOLEAN DEFAULT false,
  d_return_duct BOOLEAN DEFAULT false,
  d_exhaust_duct BOOLEAN DEFAULT false,
  d_flex_duct BOOLEAN DEFAULT false,
  d_duct_material BOOLEAN DEFAULT false,
  d_insulation BOOLEAN DEFAULT false,
  d_dampers BOOLEAN DEFAULT false,
  d_notes TEXT,

  -- Section E: Air Devices
  e_supply_diffusers BOOLEAN DEFAULT false,
  e_return_grilles BOOLEAN DEFAULT false,
  e_vav_boxes BOOLEAN DEFAULT false,
  e_fan_coils BOOLEAN DEFAULT false,
  e_notes TEXT,

  -- Section F: Controls
  f_thermostat_count BOOLEAN DEFAULT false,
  f_zoning_requirements BOOLEAN DEFAULT false,
  f_bas_integration BOOLEAN DEFAULT false,
  f_sensors BOOLEAN DEFAULT false,
  f_control_wiring BOOLEAN DEFAULT false,
  f_notes TEXT,

  -- Section G: Piping
  g_refrigerant_lines BOOLEAN DEFAULT false,
  g_condensate_drains BOOLEAN DEFAULT false,
  g_gas_piping BOOLEAN DEFAULT false,
  g_hydronic_piping BOOLEAN DEFAULT false,
  g_penetrations BOOLEAN DEFAULT false,
  g_notes TEXT,

  -- Section H: Electrical Coordination
  h_mca_mocp BOOLEAN DEFAULT false,
  h_disconnects BOOLEAN DEFAULT false,
  h_vfds BOOLEAN DEFAULT false,
  h_electrical_by_others BOOLEAN DEFAULT false,
  h_electrical_confirmed TEXT,
  h_notes TEXT,

  -- Section I: Labor & Logistics
  i_new_construction BOOLEAN DEFAULT true,
  i_occupied_space BOOLEAN DEFAULT false,
  i_working_height TEXT,
  i_requires_lift BOOLEAN DEFAULT false,
  i_requires_crane BOOLEAN DEFAULT false,
  i_staging_area BOOLEAN DEFAULT false,
  i_phasing BOOLEAN DEFAULT false,
  i_notes TEXT,

  -- Section J: Commissioning & Closeout
  j_permits BOOLEAN DEFAULT false,
  j_tab_scope BOOLEAN DEFAULT false,
  j_startup BOOLEAN DEFAULT false,
  j_commissioning BOOLEAN DEFAULT false,
  j_training BOOLEAN DEFAULT false,
  j_warranty BOOLEAN DEFAULT false,
  j_notes TEXT,

  -- Section K: Exclusions & Risk
  k_exclusions_listed BOOLEAN DEFAULT false,
  k_allowances BOOLEAN DEFAULT false,
  k_risk_flags BOOLEAN DEFAULT false,
  k_notes TEXT,

  -- Overall Completion
  completion_percent INTEGER DEFAULT 0,
  checklist_complete BOOLEAN DEFAULT false,

  -- Sign-off
  estimator_sign_off UUID REFERENCES auth.users(id),
  sign_off_date TIMESTAMPTZ,
  reviewer_sign_off UUID REFERENCES auth.users(id),
  reviewer_sign_off_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC RISK FLAGS
-- ============================================================================

CREATE TABLE hvac_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,

  risk_category hvac_risk_category NOT NULL,
  severity hvac_risk_severity NOT NULL,

  title TEXT NOT NULL,
  description TEXT,

  -- Source
  source TEXT, -- manual, ai_detected, checklist
  source_reference TEXT, -- Which checklist item, page, etc.

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Impact
  cost_impact DECIMAL(12,2),
  schedule_impact_days INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC ESTIMATES
-- ============================================================================

CREATE TABLE hvac_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE NOT NULL,

  estimate_number TEXT,
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,

  -- Material Costs
  equipment_material DECIMAL(12,2) DEFAULT 0,
  ductwork_material DECIMAL(12,2) DEFAULT 0,
  fittings_material DECIMAL(12,2) DEFAULT 0,
  air_devices_material DECIMAL(12,2) DEFAULT 0,
  controls_material DECIMAL(12,2) DEFAULT 0,
  piping_material DECIMAL(12,2) DEFAULT 0,
  dampers_material DECIMAL(12,2) DEFAULT 0,
  insulation_material DECIMAL(12,2) DEFAULT 0,
  misc_material DECIMAL(12,2) DEFAULT 0,
  material_subtotal DECIMAL(12,2) DEFAULT 0,

  -- Labor
  equipment_labor_hours DECIMAL(8,2) DEFAULT 0,
  ductwork_labor_hours DECIMAL(8,2) DEFAULT 0,
  air_devices_labor_hours DECIMAL(8,2) DEFAULT 0,
  controls_labor_hours DECIMAL(8,2) DEFAULT 0,
  piping_labor_hours DECIMAL(8,2) DEFAULT 0,
  misc_labor_hours DECIMAL(8,2) DEFAULT 0,
  total_labor_hours DECIMAL(8,2) DEFAULT 0,

  -- Labor Rates
  labor_rate_journeyman DECIMAL(8,2),
  labor_rate_apprentice DECIMAL(8,2),
  labor_rate_foreman DECIMAL(8,2),
  labor_rate_blended DECIMAL(8,2),

  -- Labor Adjustments
  difficulty_multiplier DECIMAL(4,2) DEFAULT 1.0,
  retrofit_multiplier DECIMAL(4,2) DEFAULT 1.0,
  height_multiplier DECIMAL(4,2) DEFAULT 1.0,
  access_multiplier DECIMAL(4,2) DEFAULT 1.0,
  union_multiplier DECIMAL(4,2) DEFAULT 1.0,
  night_multiplier DECIMAL(4,2) DEFAULT 1.0,
  combined_multiplier DECIMAL(4,2) DEFAULT 1.0,

  adjusted_labor_hours DECIMAL(8,2) DEFAULT 0,
  labor_subtotal DECIMAL(12,2) DEFAULT 0,

  -- Other Direct Costs
  permits_fees DECIMAL(12,2) DEFAULT 0,
  crane_rigging DECIMAL(12,2) DEFAULT 0,
  equipment_rental DECIMAL(12,2) DEFAULT 0,
  freight_shipping DECIMAL(12,2) DEFAULT 0,
  subcontractors DECIMAL(12,2) DEFAULT 0,
  tab_testing DECIMAL(12,2) DEFAULT 0,
  commissioning DECIMAL(12,2) DEFAULT 0,
  startup_training DECIMAL(12,2) DEFAULT 0,
  bonds_insurance DECIMAL(12,2) DEFAULT 0,
  other_direct DECIMAL(12,2) DEFAULT 0,
  direct_costs_subtotal DECIMAL(12,2) DEFAULT 0,

  -- Subtotal
  subtotal DECIMAL(12,2) DEFAULT 0,

  -- Markups
  contingency_percent DECIMAL(5,2) DEFAULT 10,
  contingency_amount DECIMAL(12,2) DEFAULT 0,
  overhead_percent DECIMAL(5,2) DEFAULT 10,
  overhead_amount DECIMAL(12,2) DEFAULT 0,
  profit_percent DECIMAL(5,2) DEFAULT 10,
  profit_amount DECIMAL(12,2) DEFAULT 0,

  -- Grand Total
  grand_total DECIMAL(12,2) DEFAULT 0,

  -- Per Unit Metrics
  cost_per_sqft DECIMAL(8,2),
  cost_per_ton DECIMAL(8,2),

  -- Risk Scoring (0-100)
  design_completeness_score INTEGER,
  coordination_risk_score INTEGER,
  logistics_risk_score INTEGER,
  scope_clarity_score INTEGER,
  supply_chain_risk_score INTEGER,
  overall_risk_score INTEGER,
  risk_level hvac_risk_severity,

  -- Status
  status TEXT DEFAULT 'draft', -- draft, review, approved, submitted, revised

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- ============================================================================
-- HVAC ESTIMATE NOTES
-- ============================================================================

CREATE TABLE hvac_estimate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES hvac_estimates(id) ON DELETE CASCADE NOT NULL,

  note_type hvac_note_type NOT NULL,

  content TEXT NOT NULL,

  -- For internal notes (not shown to owner)
  internal_only BOOLEAN DEFAULT false,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- HVAC PRICING DATABASE
-- ============================================================================

CREATE TABLE hvac_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- NULL for system defaults

  category TEXT NOT NULL, -- equipment, ductwork, fittings, air_devices, controls, piping, dampers, labor
  item_type TEXT NOT NULL,
  item_subtype TEXT,

  -- Description
  description TEXT,

  -- Sizing (for range-based pricing)
  size TEXT,
  size_min DECIMAL(8,2),
  size_max DECIMAL(8,2),
  capacity_min DECIMAL(8,2),
  capacity_max DECIMAL(8,2),

  -- Costs
  material_cost DECIMAL(12,2),
  material_unit TEXT, -- each, lf, sqft, ton, etc.

  -- Labor
  labor_hours DECIMAL(6,2),
  labor_unit TEXT,

  -- Factors
  difficulty_factor DECIMAL(4,2) DEFAULT 1.0,

  -- Metadata
  source TEXT, -- manual, vendor, historical, rs_means
  effective_date DATE,
  expiration_date DATE,
  region TEXT,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HVAC USER SETTINGS
-- ============================================================================

CREATE TABLE hvac_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Labor Rates
  labor_rate_journeyman DECIMAL(8,2) DEFAULT 75.00,
  labor_rate_apprentice DECIMAL(8,2) DEFAULT 45.00,
  labor_rate_foreman DECIMAL(8,2) DEFAULT 95.00,
  labor_rate_sheet_metal DECIMAL(8,2) DEFAULT 80.00,
  labor_rate_pipefitter DECIMAL(8,2) DEFAULT 85.00,

  -- Default Markups
  default_contingency DECIMAL(5,2) DEFAULT 10,
  default_overhead DECIMAL(5,2) DEFAULT 10,
  default_profit DECIMAL(5,2) DEFAULT 10,

  -- Regional Settings
  region TEXT,
  union_shop BOOLEAN DEFAULT false,

  -- Company Info
  company_name TEXT,
  company_logo_url TEXT,
  company_address TEXT,
  company_city TEXT,
  company_state TEXT,
  company_zip TEXT,
  company_phone TEXT,
  company_email TEXT,
  license_number TEXT,

  -- Preferences
  default_building_type hvac_building_type,
  default_climate_zone TEXT,
  auto_calculate_fittings BOOLEAN DEFAULT true,
  fittings_percent_of_duct DECIMAL(5,2) DEFAULT 15,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Projects
CREATE INDEX idx_hvac_projects_user ON hvac_projects(user_id);
CREATE INDEX idx_hvac_projects_status ON hvac_projects(status);
CREATE INDEX idx_hvac_projects_bid_date ON hvac_projects(bid_due_date);

-- Documents
CREATE INDEX idx_hvac_documents_project ON hvac_documents(project_id);
CREATE INDEX idx_hvac_documents_status ON hvac_documents(processing_status);

-- Pages
CREATE INDEX idx_hvac_pages_document ON hvac_document_pages(document_id);
CREATE INDEX idx_hvac_pages_type ON hvac_document_pages(page_type);

-- Equipment
CREATE INDEX idx_hvac_equipment_project ON hvac_equipment(project_id);
CREATE INDEX idx_hvac_equipment_type ON hvac_equipment(equipment_type);
CREATE INDEX idx_hvac_equipment_tag ON hvac_equipment(tag);

-- Ductwork
CREATE INDEX idx_hvac_ductwork_project ON hvac_ductwork(project_id);
CREATE INDEX idx_hvac_ductwork_type ON hvac_ductwork(duct_type);

-- Air Devices
CREATE INDEX idx_hvac_air_devices_project ON hvac_air_devices(project_id);
CREATE INDEX idx_hvac_air_devices_type ON hvac_air_devices(device_type);

-- Controls
CREATE INDEX idx_hvac_controls_project ON hvac_controls(project_id);

-- Piping
CREATE INDEX idx_hvac_piping_project ON hvac_piping(project_id);
CREATE INDEX idx_hvac_piping_type ON hvac_piping(piping_type);

-- Dampers
CREATE INDEX idx_hvac_dampers_project ON hvac_dampers(project_id);

-- Checklist
CREATE INDEX idx_hvac_checklists_project ON hvac_checklists(project_id);

-- Risk Flags
CREATE INDEX idx_hvac_risk_flags_project ON hvac_risk_flags(project_id);
CREATE INDEX idx_hvac_risk_flags_severity ON hvac_risk_flags(severity);
CREATE INDEX idx_hvac_risk_flags_resolved ON hvac_risk_flags(resolved);

-- Estimates
CREATE INDEX idx_hvac_estimates_project ON hvac_estimates(project_id);
CREATE INDEX idx_hvac_estimates_status ON hvac_estimates(status);
CREATE INDEX idx_hvac_estimates_current ON hvac_estimates(is_current);

-- Notes
CREATE INDEX idx_hvac_estimate_notes_estimate ON hvac_estimate_notes(estimate_id);
CREATE INDEX idx_hvac_estimate_notes_type ON hvac_estimate_notes(note_type);

-- Pricing
CREATE INDEX idx_hvac_pricing_category ON hvac_pricing(category);
CREATE INDEX idx_hvac_pricing_item ON hvac_pricing(item_type);
CREATE INDEX idx_hvac_pricing_user ON hvac_pricing(user_id);
CREATE INDEX idx_hvac_pricing_active ON hvac_pricing(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE hvac_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_ductwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_fittings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_air_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_piping ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_dampers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_estimate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_user_settings ENABLE ROW LEVEL SECURITY;

-- Projects: Users see only their own
CREATE POLICY "Users manage own HVAC projects" ON hvac_projects
  FOR ALL USING (user_id = auth.uid());

-- Documents: Users see documents for their projects
CREATE POLICY "Users manage own project documents" ON hvac_documents
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Pages: Users see pages for their documents
CREATE POLICY "Users manage own document pages" ON hvac_document_pages
  FOR ALL USING (
    document_id IN (
      SELECT d.id FROM hvac_documents d
      JOIN hvac_projects p ON d.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Equipment: Users manage their project equipment
CREATE POLICY "Users manage own project equipment" ON hvac_equipment
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Ductwork: Users manage their project ductwork
CREATE POLICY "Users manage own project ductwork" ON hvac_ductwork
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Fittings: Users manage their project fittings
CREATE POLICY "Users manage own project fittings" ON hvac_fittings
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Air Devices: Users manage their project air devices
CREATE POLICY "Users manage own project air devices" ON hvac_air_devices
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Controls: Users manage their project controls
CREATE POLICY "Users manage own project controls" ON hvac_controls
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Piping: Users manage their project piping
CREATE POLICY "Users manage own project piping" ON hvac_piping
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Dampers: Users manage their project dampers
CREATE POLICY "Users manage own project dampers" ON hvac_dampers
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Checklists: Users manage their project checklists
CREATE POLICY "Users manage own project checklists" ON hvac_checklists
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Risk Flags: Users manage their project risk flags
CREATE POLICY "Users manage own project risk flags" ON hvac_risk_flags
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Estimates: Users manage their project estimates
CREATE POLICY "Users manage own project estimates" ON hvac_estimates
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );

-- Estimate Notes: Users manage notes for their estimates
CREATE POLICY "Users manage own estimate notes" ON hvac_estimate_notes
  FOR ALL USING (
    estimate_id IN (
      SELECT e.id FROM hvac_estimates e
      JOIN hvac_projects p ON e.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Pricing: Users see system defaults + their own
CREATE POLICY "Users see system and own pricing" ON hvac_pricing
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users manage own pricing" ON hvac_pricing
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own pricing" ON hvac_pricing
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users delete own pricing" ON hvac_pricing
  FOR DELETE USING (user_id = auth.uid());

-- User Settings: Users manage their own settings
CREATE POLICY "Users manage own settings" ON hvac_user_settings
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hvac_projects_updated_at
    BEFORE UPDATE ON hvac_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvac_equipment_updated_at
    BEFORE UPDATE ON hvac_equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvac_checklists_updated_at
    BEFORE UPDATE ON hvac_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvac_estimates_updated_at
    BEFORE UPDATE ON hvac_estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvac_pricing_updated_at
    BEFORE UPDATE ON hvac_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvac_user_settings_updated_at
    BEFORE UPDATE ON hvac_user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate checklist completion percentage
CREATE OR REPLACE FUNCTION calculate_checklist_completion(checklist_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_items INTEGER := 0;
    checked_items INTEGER := 0;
    rec RECORD;
BEGIN
    SELECT * INTO rec FROM hvac_checklists WHERE id = checklist_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Count all boolean fields and checked ones
    -- Section A
    total_items := total_items + 8;
    IF rec.a_project_name THEN checked_items := checked_items + 1; END IF;
    IF rec.a_jurisdiction THEN checked_items := checked_items + 1; END IF;
    IF rec.a_plan_set_date THEN checked_items := checked_items + 1; END IF;
    IF rec.a_mechanical_drawings THEN checked_items := checked_items + 1; END IF;
    IF rec.a_specifications THEN checked_items := checked_items + 1; END IF;
    IF rec.a_legends THEN checked_items := checked_items + 1; END IF;
    IF rec.a_addenda_reviewed THEN checked_items := checked_items + 1; END IF;
    IF rec.a_scope_letter THEN checked_items := checked_items + 1; END IF;

    -- Section B
    total_items := total_items + 8;
    IF rec.b_building_type THEN checked_items := checked_items + 1; END IF;
    IF rec.b_total_sf THEN checked_items := checked_items + 1; END IF;
    IF rec.b_ceiling_heights THEN checked_items := checked_items + 1; END IF;
    IF rec.b_occupancy_loads THEN checked_items := checked_items + 1; END IF;
    IF rec.b_operating_hours THEN checked_items := checked_items + 1; END IF;
    IF rec.b_insulation_values THEN checked_items := checked_items + 1; END IF;
    IF rec.b_climate_zone THEN checked_items := checked_items + 1; END IF;
    IF rec.b_load_calc THEN checked_items := checked_items + 1; END IF;

    -- Section C
    total_items := total_items + 8;
    IF rec.c_system_type THEN checked_items := checked_items + 1; END IF;
    IF rec.c_manufacturer THEN checked_items := checked_items + 1; END IF;
    IF rec.c_tonnage THEN checked_items := checked_items + 1; END IF;
    IF rec.c_efficiency THEN checked_items := checked_items + 1; END IF;
    IF rec.c_voltage THEN checked_items := checked_items + 1; END IF;
    IF rec.c_quantities THEN checked_items := checked_items + 1; END IF;
    IF rec.c_accessories THEN checked_items := checked_items + 1; END IF;
    IF rec.c_lead_times THEN checked_items := checked_items + 1; END IF;

    -- Section D
    total_items := total_items + 7;
    IF rec.d_supply_duct THEN checked_items := checked_items + 1; END IF;
    IF rec.d_return_duct THEN checked_items := checked_items + 1; END IF;
    IF rec.d_exhaust_duct THEN checked_items := checked_items + 1; END IF;
    IF rec.d_flex_duct THEN checked_items := checked_items + 1; END IF;
    IF rec.d_duct_material THEN checked_items := checked_items + 1; END IF;
    IF rec.d_insulation THEN checked_items := checked_items + 1; END IF;
    IF rec.d_dampers THEN checked_items := checked_items + 1; END IF;

    -- Section E
    total_items := total_items + 4;
    IF rec.e_supply_diffusers THEN checked_items := checked_items + 1; END IF;
    IF rec.e_return_grilles THEN checked_items := checked_items + 1; END IF;
    IF rec.e_vav_boxes THEN checked_items := checked_items + 1; END IF;
    IF rec.e_fan_coils THEN checked_items := checked_items + 1; END IF;

    -- Section F
    total_items := total_items + 5;
    IF rec.f_thermostat_count THEN checked_items := checked_items + 1; END IF;
    IF rec.f_zoning_requirements THEN checked_items := checked_items + 1; END IF;
    IF rec.f_bas_integration THEN checked_items := checked_items + 1; END IF;
    IF rec.f_sensors THEN checked_items := checked_items + 1; END IF;
    IF rec.f_control_wiring THEN checked_items := checked_items + 1; END IF;

    -- Section G
    total_items := total_items + 5;
    IF rec.g_refrigerant_lines THEN checked_items := checked_items + 1; END IF;
    IF rec.g_condensate_drains THEN checked_items := checked_items + 1; END IF;
    IF rec.g_gas_piping THEN checked_items := checked_items + 1; END IF;
    IF rec.g_hydronic_piping THEN checked_items := checked_items + 1; END IF;
    IF rec.g_penetrations THEN checked_items := checked_items + 1; END IF;

    -- Section H
    total_items := total_items + 4;
    IF rec.h_mca_mocp THEN checked_items := checked_items + 1; END IF;
    IF rec.h_disconnects THEN checked_items := checked_items + 1; END IF;
    IF rec.h_vfds THEN checked_items := checked_items + 1; END IF;
    IF rec.h_electrical_by_others THEN checked_items := checked_items + 1; END IF;

    -- Section I
    total_items := total_items + 7;
    IF rec.i_new_construction THEN checked_items := checked_items + 1; END IF;
    IF rec.i_occupied_space THEN checked_items := checked_items + 1; END IF;
    IF rec.i_working_height IS NOT NULL THEN checked_items := checked_items + 1; END IF;
    IF rec.i_requires_lift THEN checked_items := checked_items + 1; END IF;
    IF rec.i_requires_crane THEN checked_items := checked_items + 1; END IF;
    IF rec.i_staging_area THEN checked_items := checked_items + 1; END IF;
    IF rec.i_phasing THEN checked_items := checked_items + 1; END IF;

    -- Section J
    total_items := total_items + 6;
    IF rec.j_permits THEN checked_items := checked_items + 1; END IF;
    IF rec.j_tab_scope THEN checked_items := checked_items + 1; END IF;
    IF rec.j_startup THEN checked_items := checked_items + 1; END IF;
    IF rec.j_commissioning THEN checked_items := checked_items + 1; END IF;
    IF rec.j_training THEN checked_items := checked_items + 1; END IF;
    IF rec.j_warranty THEN checked_items := checked_items + 1; END IF;

    -- Section K
    total_items := total_items + 3;
    IF rec.k_exclusions_listed THEN checked_items := checked_items + 1; END IF;
    IF rec.k_allowances THEN checked_items := checked_items + 1; END IF;
    IF rec.k_risk_flags THEN checked_items := checked_items + 1; END IF;

    IF total_items = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND((checked_items::DECIMAL / total_items::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update completion percentage
CREATE OR REPLACE FUNCTION update_checklist_completion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.completion_percent := calculate_checklist_completion(NEW.id);
    NEW.checklist_complete := NEW.completion_percent >= 90;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hvac_checklist_completion
    BEFORE INSERT OR UPDATE ON hvac_checklists
    FOR EACH ROW EXECUTE FUNCTION update_checklist_completion();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hvac_projects IS 'Main HVAC estimating projects table';
COMMENT ON TABLE hvac_documents IS 'Uploaded blueprint documents (PDFs, DWGs)';
COMMENT ON TABLE hvac_document_pages IS 'Individual pages with AI classification and extraction';
COMMENT ON TABLE hvac_equipment IS 'HVAC equipment takeoff (RTUs, splits, chillers, etc.)';
COMMENT ON TABLE hvac_ductwork IS 'Ductwork takeoff by type and size';
COMMENT ON TABLE hvac_fittings IS 'Duct fittings (elbows, tees, reducers, etc.)';
COMMENT ON TABLE hvac_air_devices IS 'Air distribution devices (diffusers, grilles, VAV boxes)';
COMMENT ON TABLE hvac_controls IS 'Controls and instrumentation';
COMMENT ON TABLE hvac_piping IS 'Piping takeoff (refrigerant, condensate, gas, hydronic)';
COMMENT ON TABLE hvac_dampers IS 'Dampers (fire, smoke, volume, balancing)';
COMMENT ON TABLE hvac_checklists IS 'Master estimating checklist (A-K sections)';
COMMENT ON TABLE hvac_risk_flags IS 'Risk flags and red flags for estimates';
COMMENT ON TABLE hvac_estimates IS 'Estimate summaries with cost roll-up and risk scoring';
COMMENT ON TABLE hvac_estimate_notes IS 'Assumptions, exclusions, and clarifications';
COMMENT ON TABLE hvac_pricing IS 'Material and labor pricing database';
COMMENT ON TABLE hvac_user_settings IS 'User-specific settings (labor rates, markups, company info)';
