# HVAC Estimating Platform - Comprehensive Implementation Plan

## Executive Summary

Transform the existing Rule Tool architecture into a full-featured HVAC estimating platform with AI-assisted blueprint takeoff, risk scoring, and professional estimate generation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HVAC ESTIMATING PLATFORM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │   UPLOAD    │ → │  AI EXTRACT │ → │   REVIEW    │ → │   ESTIMATE  │    │
│  │  Blueprints │   │  & Takeoff  │   │  & Validate │   │  & Output   │    │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘    │
│         │                 │                 │                 │            │
│         ▼                 ▼                 ▼                 ▼            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        SUPABASE DATABASE                             │  │
│  │  Projects │ Documents │ Takeoffs │ Equipment │ Ductwork │ Estimates │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│         │                 │                 │                 │            │
│         ▼                 ▼                 ▼                 ▼            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │    RULES    │   │    COST     │   │    RISK     │   │   REPORTS   │    │
│  │   ENGINE    │   │   ENGINE    │   │   SCORING   │   │  GENERATOR  │    │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema & Core Models (Week 1-2)

### 1.1 New Supabase Tables

#### `hvac_projects`
```sql
CREATE TABLE hvac_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Project Info
  name TEXT NOT NULL,
  project_number TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Building Info
  building_type TEXT, -- single-family, multi-family, office, retail, etc.
  total_sqft INTEGER,
  conditioned_sqft INTEGER,
  num_floors INTEGER,
  ceiling_height_ft DECIMAL,

  -- Climate & Design
  climate_zone TEXT,
  heating_design_temp INTEGER,
  cooling_design_temp INTEGER,

  -- Project Type
  project_type TEXT, -- new-construction, retrofit, change-out, add-on
  occupied_space BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'draft', -- draft, in-progress, submitted, won, lost
  bid_due_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_documents`
```sql
CREATE TABLE hvac_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,

  -- Document Info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,

  -- Document Type
  doc_type TEXT, -- mechanical-plan, equipment-schedule, spec-div23, load-calc, detail

  -- Processing Status
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_document_pages`
```sql
CREATE TABLE hvac_document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES hvac_documents(id) ON DELETE CASCADE,

  page_number INTEGER NOT NULL,
  page_image_url TEXT,

  -- AI Classification
  page_type TEXT, -- duct-layout, equipment-plan, piping-isometric, schedule, detail, legend
  classification_confidence DECIMAL,

  -- Extracted Data (JSONB for flexibility)
  extracted_data JSONB DEFAULT '{}',

  -- Review Status
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_equipment`
```sql
CREATE TABLE hvac_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,
  source_page_id UUID REFERENCES hvac_document_pages(id),

  -- Equipment Identity
  tag TEXT, -- Equipment tag from drawings (RTU-1, AHU-2, etc.)
  equipment_type TEXT NOT NULL, -- rtu, split-system, heat-pump, minisplit, vrf, chiller, boiler, ahu, fan-coil

  -- Capacity
  cooling_tons DECIMAL,
  cooling_btuh INTEGER,
  heating_btuh INTEGER,
  heating_mbh DECIMAL,
  cfm INTEGER,

  -- Specifications
  manufacturer TEXT,
  model TEXT,
  efficiency_seer DECIMAL,
  efficiency_eer DECIMAL,
  efficiency_hspf DECIMAL,
  efficiency_afue DECIMAL,

  -- Electrical
  voltage INTEGER,
  phase INTEGER,
  mca DECIMAL,
  mocp INTEGER,

  -- Physical
  weight_lbs INTEGER,
  length_in DECIMAL,
  width_in DECIMAL,
  height_in DECIMAL,

  -- Installation
  location TEXT, -- rooftop, ground, indoor, closet, attic, basement
  requires_crane BOOLEAN DEFAULT false,
  requires_curb BOOLEAN DEFAULT false,

  -- Accessories
  economizer BOOLEAN DEFAULT false,
  vfd BOOLEAN DEFAULT false,
  erv_hrv BOOLEAN DEFAULT false,

  -- Pricing
  equipment_cost DECIMAL,
  installation_hours DECIMAL,

  -- AI Extraction
  ai_extracted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL,
  verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_ductwork`
```sql
CREATE TABLE hvac_ductwork (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,
  source_page_id UUID REFERENCES hvac_document_pages(id),

  -- Duct Type
  duct_type TEXT NOT NULL, -- supply, return, exhaust, outside-air, flex

  -- Size (rectangular or round)
  width_in INTEGER,
  height_in INTEGER,
  diameter_in INTEGER,

  -- Quantity
  linear_feet DECIMAL NOT NULL,

  -- Material & Insulation
  material TEXT DEFAULT 'galvanized', -- galvanized, aluminum, stainless, fiberglass
  gauge INTEGER,
  insulation_type TEXT, -- internal-liner, external-wrap, none
  insulation_r_value DECIMAL,

  -- Pricing
  material_cost_per_lf DECIMAL,
  labor_hours_per_lf DECIMAL,

  -- AI Extraction
  ai_extracted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL,
  verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_fittings`
```sql
CREATE TABLE hvac_fittings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,

  fitting_type TEXT NOT NULL, -- elbow-90, elbow-45, tee, wye, reducer, offset, transition, end-cap

  -- Size
  size_1 TEXT, -- Primary size (e.g., "24x12" or "14")
  size_2 TEXT, -- Secondary size for reducers/transitions

  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  unit_cost DECIMAL,
  labor_hours_each DECIMAL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_air_devices`
```sql
CREATE TABLE hvac_air_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,
  source_page_id UUID REFERENCES hvac_document_pages(id),

  device_type TEXT NOT NULL, -- supply-diffuser, return-grille, register, exhaust-grille, linear-slot, vav-box

  -- Size
  size TEXT, -- "24x24", "12x12", "14" round, etc.
  neck_size TEXT,

  -- Performance
  cfm INTEGER,

  -- VAV Specific
  vav_min_cfm INTEGER,
  vav_max_cfm INTEGER,
  reheat_type TEXT, -- none, electric, hot-water
  reheat_kw DECIMAL,

  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  unit_cost DECIMAL,
  labor_hours_each DECIMAL,

  -- AI Extraction
  ai_extracted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL,
  verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_controls`
```sql
CREATE TABLE hvac_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,

  control_type TEXT NOT NULL, -- thermostat, sensor-temp, sensor-co2, sensor-occupancy, control-panel, bas-point

  -- Specifications
  make TEXT,
  model TEXT,

  -- For thermostats
  thermostat_type TEXT, -- basic, programmable, smart, commercial
  zones_controlled INTEGER,

  -- For BAS
  bas_points INTEGER,
  protocol TEXT, -- bacnet, modbus, lonworks

  quantity INTEGER NOT NULL DEFAULT 1,

  -- Wiring
  wiring_lf DECIMAL,

  -- Pricing
  unit_cost DECIMAL,
  labor_hours_each DECIMAL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_piping`
```sql
CREATE TABLE hvac_piping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,

  piping_type TEXT NOT NULL, -- refrigerant-suction, refrigerant-liquid, condensate, gas, chilled-water, hot-water

  -- Size
  size TEXT NOT NULL, -- "3/4", "1-1/8", "2", etc.

  -- Quantity
  linear_feet DECIMAL NOT NULL,

  -- Material
  material TEXT, -- copper, black-iron, pvc, cpvc, pex

  -- Insulation
  insulation_type TEXT,
  insulation_thickness DECIMAL,

  -- Pricing
  material_cost_per_lf DECIMAL,
  labor_hours_per_lf DECIMAL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_checklist`
```sql
CREATE TABLE hvac_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,

  -- Section A: Project & Document Control
  has_project_name BOOLEAN DEFAULT false,
  has_jurisdiction BOOLEAN DEFAULT false,
  has_plan_set_date BOOLEAN DEFAULT false,
  has_mechanical_drawings BOOLEAN DEFAULT false,
  has_specifications BOOLEAN DEFAULT false,
  has_legends BOOLEAN DEFAULT false,
  has_addenda_reviewed BOOLEAN DEFAULT false,
  has_scope_letter BOOLEAN DEFAULT false,

  -- Section B: Building & Load Assumptions
  has_building_type BOOLEAN DEFAULT false,
  has_total_sf BOOLEAN DEFAULT false,
  has_ceiling_heights BOOLEAN DEFAULT false,
  has_occupancy_loads BOOLEAN DEFAULT false,
  has_operating_hours BOOLEAN DEFAULT false,
  has_insulation_values BOOLEAN DEFAULT false,
  has_climate_zone BOOLEAN DEFAULT false,
  has_load_calc BOOLEAN DEFAULT false,
  load_calc_method TEXT,

  -- Section C: Equipment Takeoff
  has_system_type BOOLEAN DEFAULT false,
  has_manufacturer BOOLEAN DEFAULT false,
  has_tonnage BOOLEAN DEFAULT false,
  has_efficiency BOOLEAN DEFAULT false,
  has_voltage BOOLEAN DEFAULT false,
  has_quantities BOOLEAN DEFAULT false,
  has_accessories BOOLEAN DEFAULT false,
  has_lead_times BOOLEAN DEFAULT false,

  -- Section D: Ductwork Takeoff
  has_supply_duct BOOLEAN DEFAULT false,
  has_return_duct BOOLEAN DEFAULT false,
  has_exhaust_duct BOOLEAN DEFAULT false,
  has_flex_duct BOOLEAN DEFAULT false,
  has_duct_material BOOLEAN DEFAULT false,
  has_insulation BOOLEAN DEFAULT false,
  has_dampers BOOLEAN DEFAULT false,

  -- Section E: Air Devices
  has_supply_diffusers BOOLEAN DEFAULT false,
  has_return_grilles BOOLEAN DEFAULT false,
  has_vav_boxes BOOLEAN DEFAULT false,
  has_fan_coils BOOLEAN DEFAULT false,

  -- Section F: Controls
  has_thermostat_count BOOLEAN DEFAULT false,
  has_zoning_requirements BOOLEAN DEFAULT false,
  has_bas_integration BOOLEAN DEFAULT false,
  has_sensors BOOLEAN DEFAULT false,
  has_control_wiring BOOLEAN DEFAULT false,

  -- Section G: Piping
  has_refrigerant_lines BOOLEAN DEFAULT false,
  has_condensate_drains BOOLEAN DEFAULT false,
  has_gas_piping BOOLEAN DEFAULT false,
  has_hydronic_piping BOOLEAN DEFAULT false,
  has_penetrations BOOLEAN DEFAULT false,

  -- Section H: Electrical
  has_mca_mocp BOOLEAN DEFAULT false,
  has_disconnects BOOLEAN DEFAULT false,
  has_vfds BOOLEAN DEFAULT false,
  electrical_by_others BOOLEAN DEFAULT false,

  -- Section I: Labor & Logistics
  is_new_construction BOOLEAN DEFAULT true,
  is_occupied_space BOOLEAN DEFAULT false,
  working_height TEXT,
  requires_lift BOOLEAN DEFAULT false,
  requires_crane BOOLEAN DEFAULT false,
  has_staging_area BOOLEAN DEFAULT false,
  has_phasing BOOLEAN DEFAULT false,

  -- Section J: Commissioning
  has_permits BOOLEAN DEFAULT false,
  has_tab_scope BOOLEAN DEFAULT false,
  has_startup BOOLEAN DEFAULT false,
  has_commissioning BOOLEAN DEFAULT false,
  has_training BOOLEAN DEFAULT false,
  has_warranty BOOLEAN DEFAULT false,

  -- Section K: Exclusions & Risk
  has_exclusions_listed BOOLEAN DEFAULT false,
  has_allowances BOOLEAN DEFAULT false,
  has_risk_flags BOOLEAN DEFAULT false,

  -- Overall
  checklist_complete BOOLEAN DEFAULT false,
  estimator_sign_off UUID REFERENCES auth.users(id),
  sign_off_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_risk_flags`
```sql
CREATE TABLE hvac_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,

  risk_category TEXT NOT NULL, -- design, coordination, logistics, scope, supply-chain
  severity TEXT NOT NULL, -- low, medium, high, critical

  title TEXT NOT NULL,
  description TEXT,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `hvac_estimates`
```sql
CREATE TABLE hvac_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hvac_projects(id) ON DELETE CASCADE,

  estimate_number TEXT,
  version INTEGER DEFAULT 1,

  -- Costs
  equipment_total DECIMAL DEFAULT 0,
  ductwork_total DECIMAL DEFAULT 0,
  air_devices_total DECIMAL DEFAULT 0,
  controls_total DECIMAL DEFAULT 0,
  piping_total DECIMAL DEFAULT 0,

  -- Labor
  labor_hours_total DECIMAL DEFAULT 0,
  labor_rate DECIMAL,
  labor_total DECIMAL DEFAULT 0,

  -- Other Costs
  permits_fees DECIMAL DEFAULT 0,
  crane_rigging DECIMAL DEFAULT 0,
  tab_commissioning DECIMAL DEFAULT 0,
  startup_training DECIMAL DEFAULT 0,

  -- Adjustments
  difficulty_multiplier DECIMAL DEFAULT 1.0,
  contingency_percent DECIMAL DEFAULT 10,
  overhead_percent DECIMAL DEFAULT 10,
  profit_percent DECIMAL DEFAULT 10,

  -- Totals
  subtotal DECIMAL DEFAULT 0,
  contingency_amount DECIMAL DEFAULT 0,
  overhead_amount DECIMAL DEFAULT 0,
  profit_amount DECIMAL DEFAULT 0,
  grand_total DECIMAL DEFAULT 0,

  -- Risk Scoring
  design_completeness_score INTEGER, -- 0-100
  coordination_risk_score INTEGER,
  logistics_risk_score INTEGER,
  scope_clarity_score INTEGER,
  overall_risk_level TEXT, -- low, medium, high

  -- Status
  status TEXT DEFAULT 'draft', -- draft, review, approved, submitted

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

#### `hvac_estimate_notes`
```sql
CREATE TABLE hvac_estimate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES hvac_estimates(id) ON DELETE CASCADE,

  note_type TEXT NOT NULL, -- assumption, exclusion, allowance, clarification, internal

  content TEXT NOT NULL,

  -- For internal notes (not shown to owner)
  internal_only BOOLEAN DEFAULT false,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_hvac_projects_user ON hvac_projects(user_id);
CREATE INDEX idx_hvac_projects_status ON hvac_projects(status);
CREATE INDEX idx_hvac_documents_project ON hvac_documents(project_id);
CREATE INDEX idx_hvac_equipment_project ON hvac_equipment(project_id);
CREATE INDEX idx_hvac_ductwork_project ON hvac_ductwork(project_id);
CREATE INDEX idx_hvac_air_devices_project ON hvac_air_devices(project_id);
CREATE INDEX idx_hvac_estimates_project ON hvac_estimates(project_id);
```

### 1.3 Row Level Security

```sql
-- Enable RLS on all HVAC tables
ALTER TABLE hvac_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_documents ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Users can only see their own projects
CREATE POLICY "Users see own projects" ON hvac_projects
  FOR ALL USING (user_id = auth.uid());

-- Users can see documents for their projects
CREATE POLICY "Users see own project documents" ON hvac_documents
  FOR ALL USING (
    project_id IN (SELECT id FROM hvac_projects WHERE user_id = auth.uid())
  );
-- ... similar policies for all related tables
```

---

## Phase 2: Core UI Components (Week 2-3)

### 2.1 New Routes

```
/hvac                           → HVAC Dashboard
/hvac/projects                  → Project List
/hvac/projects/new              → New Project Wizard
/hvac/projects/[id]             → Project Detail
/hvac/projects/[id]/documents   → Document Upload & Review
/hvac/projects/[id]/takeoff     → Takeoff Editor
/hvac/projects/[id]/checklist   → Estimating Checklist
/hvac/projects/[id]/estimate    → Estimate Builder
/hvac/projects/[id]/output      → Reports & Output
```

### 2.2 Component Hierarchy

```
apps/web/src/
├── app/
│   └── hvac/
│       ├── page.tsx                    # Dashboard
│       ├── layout.tsx                  # HVAC Layout with sidebar
│       ├── projects/
│       │   ├── page.tsx                # Project list
│       │   ├── new/
│       │   │   └── page.tsx            # New project wizard
│       │   └── [id]/
│       │       ├── page.tsx            # Project overview
│       │       ├── documents/
│       │       │   └── page.tsx        # Document management
│       │       ├── takeoff/
│       │       │   └── page.tsx        # Takeoff editor
│       │       ├── checklist/
│       │       │   └── page.tsx        # Master checklist
│       │       ├── estimate/
│       │       │   └── page.tsx        # Estimate builder
│       │       └── output/
│       │           └── page.tsx        # Reports & export
│       └── settings/
│           └── page.tsx                # HVAC settings (labor rates, etc.)
│
├── components/
│   └── hvac/
│       ├── ProjectCard.tsx
│       ├── ProjectWizard/
│       │   ├── Step1ProjectInfo.tsx
│       │   ├── Step2BuildingInfo.tsx
│       │   ├── Step3SystemType.tsx
│       │   └── ProjectWizard.tsx
│       ├── DocumentUploader/
│       │   ├── DropZone.tsx
│       │   ├── PagePreview.tsx
│       │   ├── PageClassifier.tsx
│       │   └── DocumentUploader.tsx
│       ├── Takeoff/
│       │   ├── EquipmentTable.tsx
│       │   ├── DuctworkTable.tsx
│       │   ├── AirDevicesTable.tsx
│       │   ├── ControlsTable.tsx
│       │   ├── PipingTable.tsx
│       │   ├── TakeoffSummary.tsx
│       │   └── AIExtractionPanel.tsx
│       ├── Checklist/
│       │   ├── ChecklistSection.tsx
│       │   ├── ChecklistProgress.tsx
│       │   └── MasterChecklist.tsx
│       ├── Estimate/
│       │   ├── CostSummary.tsx
│       │   ├── LaborCalculator.tsx
│       │   ├── RiskScoreCard.tsx
│       │   ├── AdjustmentsPanel.tsx
│       │   ├── NotesEditor.tsx
│       │   └── EstimateBuilder.tsx
│       └── Output/
│           ├── TakeoffReport.tsx
│           ├── ProposalGenerator.tsx
│           ├── ScopeLetterGenerator.tsx
│           └── ExportOptions.tsx
```

### 2.3 Key UI Components

#### Project Wizard (4-step)
1. **Project Info**: Name, address, bid date, project type
2. **Building Info**: Type, sqft, floors, ceiling height, climate zone
3. **System Type**: Equipment type, new vs retrofit, occupied space
4. **Documents**: Initial document upload

#### Document Processor
- Drag-and-drop PDF upload
- Page-by-page preview
- AI classification of page types
- Manual override capability
- Link pages to takeoff items

#### Takeoff Editor
- Tabbed interface for each category
- Inline editing
- AI extraction suggestions
- Quantity calculator helpers
- Real-time cost preview

#### Master Checklist
- Interactive checklist with A-K sections
- Progress indicator
- Auto-populate from extracted data
- Risk flag integration
- Sign-off workflow

#### Estimate Builder
- Cost roll-up from takeoff
- Labor calculator with difficulty adjustments
- Margin controls
- Risk scoring display
- Notes/exclusions editor

---

## Phase 3: AI Extraction Engine (Week 3-4)

### 3.1 Blueprint Processing Pipeline

```typescript
// packages/industry-hvac/src/ai/pipeline.ts

interface BlueprintProcessingPipeline {
  // Step 1: Upload & Split
  uploadPdf(file: File): Promise<Document>;
  splitPages(document: Document): Promise<Page[]>;

  // Step 2: Classify Pages
  classifyPage(page: Page): Promise<PageClassification>;

  // Step 3: Extract by Page Type
  extractFromDuctLayout(page: Page): Promise<DuctExtractionResult>;
  extractFromEquipmentSchedule(page: Page): Promise<EquipmentExtractionResult>;
  extractFromPipingIsometric(page: Page): Promise<PipingExtractionResult>;
  extractFromLegend(page: Page): Promise<LegendExtractionResult>;

  // Step 4: Validate & Merge
  validateExtractions(results: ExtractionResult[]): Promise<ValidationResult>;
  mergeWithManualInput(ai: TakeoffData, manual: TakeoffData): Promise<TakeoffData>;

  // Step 5: Generate Quantities
  generateQuantities(data: TakeoffData): Promise<QuantityReport>;
}
```

### 3.2 AI Prompts by Page Type

#### Duct Layout Extraction Prompt
```typescript
const DUCT_LAYOUT_PROMPT = `You are an HVAC estimator analyzing a duct layout drawing.

EXTRACT THE FOLLOWING:

1. DUCTWORK
For each duct run, identify:
- Type: supply, return, exhaust, outside-air
- Size: WxH for rectangular, diameter for round
- Approximate length in linear feet
- Material if noted (galvanized, spiral, flex)
- Insulation if noted

2. AIR DEVICES
For each diffuser/grille/register:
- Type: supply diffuser, return grille, exhaust grille, linear slot
- Size (e.g., 24x24, 12x12)
- CFM if noted
- Count

3. EQUIPMENT CONNECTIONS
- Equipment tags connected to ductwork
- Duct sizes at equipment connections

4. SPECIAL ITEMS
- Fire/smoke dampers
- Volume dampers
- Turning vanes
- Access doors

OUTPUT FORMAT:
{
  "ductwork": [
    {"type": "supply", "size": "24x12", "length_ft": 45, "insulation": "R-8"},
    ...
  ],
  "air_devices": [
    {"type": "supply-diffuser", "size": "24x24", "cfm": 400, "quantity": 1},
    ...
  ],
  "dampers": [
    {"type": "fire-smoke", "size": "24x12", "quantity": 2},
    ...
  ],
  "confidence": 0.85,
  "notes": ["Some duct sizes unclear in section B", ...]
}`;
```

#### Equipment Schedule Extraction Prompt
```typescript
const EQUIPMENT_SCHEDULE_PROMPT = `You are an HVAC estimator analyzing an equipment schedule.

EXTRACT THE FOLLOWING FOR EACH UNIT:

1. IDENTIFICATION
- Tag (RTU-1, AHU-2, etc.)
- Equipment type

2. CAPACITY
- Cooling: tons or BTU/h
- Heating: BTU/h or MBH
- Airflow: CFM

3. SPECIFICATIONS
- Manufacturer (if specified)
- Model (if specified)
- Efficiency (SEER, EER, AFUE)
- Refrigerant type

4. ELECTRICAL
- Voltage/Phase/Hz
- MCA
- MOCP

5. PHYSICAL
- Weight
- Dimensions

6. ACCESSORIES
- Economizer
- VFD
- ERV/HRV
- Disconnect

OUTPUT FORMAT:
{
  "equipment": [
    {
      "tag": "RTU-1",
      "type": "rtu",
      "cooling_tons": 10,
      "heating_btuh": 120000,
      "cfm": 4000,
      "seer": 14,
      "voltage": 460,
      "phase": 3,
      "mca": 28,
      "mocp": 40,
      "economizer": true,
      "vfd": false
    },
    ...
  ],
  "confidence": 0.92,
  "notes": ["MCA/MOCP not listed for FCU-3", ...]
}`;
```

### 3.3 API Routes for AI Extraction

```typescript
// app/api/hvac/extract/route.ts

POST /api/hvac/extract/duct-layout
POST /api/hvac/extract/equipment-schedule
POST /api/hvac/extract/piping-isometric
POST /api/hvac/extract/legend
POST /api/hvac/extract/auto-classify
```

### 3.4 Extraction Validation Rules

```typescript
// packages/industry-hvac/src/ai/validation.ts

const validationRules = {
  equipment: [
    { rule: 'tonnage-cfm-ratio', check: (e) => e.cfm / e.cooling_tons >= 350 && e.cfm / e.cooling_tons <= 450 },
    { rule: 'mca-mocp-relationship', check: (e) => e.mocp >= e.mca * 1.25 },
    { rule: 'voltage-valid', check: (e) => [120, 208, 230, 240, 277, 460, 480].includes(e.voltage) },
  ],
  ductwork: [
    { rule: 'aspect-ratio', check: (d) => d.width / d.height <= 4 },
    { rule: 'velocity-check', check: (d, cfm) => calculateVelocity(d, cfm) <= 1500 },
  ],
  airDevices: [
    { rule: 'cfm-size-match', check: (ad) => checkCfmForSize(ad.size, ad.cfm) },
  ],
};
```

---

## Phase 4: Cost & Labor Engine (Week 4-5)

### 4.1 Pricing Database

```sql
CREATE TABLE hvac_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category TEXT NOT NULL, -- equipment, ductwork, air-devices, controls, piping, fittings
  item_type TEXT NOT NULL,

  -- Sizing
  size TEXT,
  capacity_min DECIMAL,
  capacity_max DECIMAL,

  -- Costs
  material_cost DECIMAL,
  material_unit TEXT,

  -- Labor
  labor_hours DECIMAL,
  labor_unit TEXT,

  -- Factors
  difficulty_base DECIMAL DEFAULT 1.0,

  -- Metadata
  source TEXT, -- manual, vendor-feed, historical
  effective_date DATE,
  region TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Labor Calculation Engine

```typescript
// packages/industry-hvac/src/cost/labor.ts

interface LaborCalculationInput {
  equipment: EquipmentItem[];
  ductwork: DuctworkItem[];
  airDevices: AirDeviceItem[];
  controls: ControlItem[];
  piping: PipingItem[];

  conditions: {
    projectType: 'new' | 'retrofit' | 'change-out';
    occupiedSpace: boolean;
    workingHeight: 'standard' | 'high' | 'very-high';
    accessDifficulty: 'easy' | 'moderate' | 'difficult';
    unionLabor: boolean;
    nightWork: boolean;
  };

  laborRates: {
    journeyman: number;
    apprentice: number;
    foreman: number;
  };
}

interface LaborCalculationResult {
  categories: {
    equipment: { hours: number; cost: number };
    ductwork: { hours: number; cost: number };
    airDevices: { hours: number; cost: number };
    controls: { hours: number; cost: number };
    piping: { hours: number; cost: number };
  };

  adjustments: {
    retrofitMultiplier: number;
    heightMultiplier: number;
    accessMultiplier: number;
    unionMultiplier: number;
    nightMultiplier: number;
    totalMultiplier: number;
  };

  totals: {
    baseHours: number;
    adjustedHours: number;
    blendedRate: number;
    totalCost: number;
  };

  crewRecommendation: {
    journeymen: number;
    apprentices: number;
    foremen: number;
    estimatedDays: number;
  };
}

function calculateLabor(input: LaborCalculationInput): LaborCalculationResult {
  // Implementation using hvac-rules.ts LABOR_NORMS
}
```

### 4.3 Cost Roll-up

```typescript
// packages/industry-hvac/src/cost/estimate.ts

function generateEstimate(project: HvacProject): HvacEstimate {
  const equipment = calculateEquipmentCosts(project.equipment);
  const ductwork = calculateDuctworkCosts(project.ductwork);
  const airDevices = calculateAirDeviceCosts(project.airDevices);
  const controls = calculateControlsCosts(project.controls);
  const piping = calculatePipingCosts(project.piping);

  const labor = calculateLabor({
    equipment: project.equipment,
    ductwork: project.ductwork,
    airDevices: project.airDevices,
    controls: project.controls,
    piping: project.piping,
    conditions: project.conditions,
    laborRates: project.laborRates,
  });

  const subtotal =
    equipment.total +
    ductwork.total +
    airDevices.total +
    controls.total +
    piping.total +
    labor.totals.totalCost;

  const contingency = subtotal * (project.contingencyPercent / 100);
  const overhead = subtotal * (project.overheadPercent / 100);
  const profit = subtotal * (project.profitPercent / 100);

  return {
    equipment,
    ductwork,
    airDevices,
    controls,
    piping,
    labor,
    subtotal,
    contingency,
    overhead,
    profit,
    grandTotal: subtotal + contingency + overhead + profit,
  };
}
```

---

## Phase 5: Risk Scoring Module (Week 5-6)

### 5.1 Risk Categories

```typescript
// packages/industry-hvac/src/risk/scoring.ts

interface RiskScoring {
  designCompleteness: {
    score: number; // 0-100
    factors: {
      hasLoadCalc: boolean;
      hasEquipmentSchedule: boolean;
      hasControlSequence: boolean;
      hasMechanicalDetails: boolean;
      hasSpecifications: boolean;
      conflictingNotes: number;
      missingDetails: number;
    };
  };

  coordinationRisk: {
    score: number;
    factors: {
      structuralConflicts: number;
      electricalClarityScore: number;
      plumbingConflicts: number;
      fireProtectionInterface: boolean;
      ceilingSpaceAdequate: boolean;
      shaftSpaceAdequate: boolean;
    };
  };

  logisticsRisk: {
    score: number;
    factors: {
      craneRequired: boolean;
      roofAccessLimited: boolean;
      occupiedSpace: boolean;
      phasingRequired: boolean;
      stagingAreaAvailable: boolean;
      nightWorkRequired: boolean;
    };
  };

  scopeClarityRisk: {
    score: number;
    factors: {
      byOthersAmbiguity: number;
      tabScopeDefined: boolean;
      commissioningScopeDefined: boolean;
      electricalScopeDefined: boolean;
      exclusionsDocumented: boolean;
    };
  };

  supplyChainRisk: {
    score: number;
    factors: {
      longLeadItems: number;
      singleSourceItems: number;
      escalationClausesNeeded: boolean;
      alternatesAvailable: boolean;
    };
  };

  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  recommendations: string[];
  redFlags: string[];
}
```

### 5.2 Risk Calculation

```typescript
function calculateRiskScore(project: HvacProject, checklist: HvacChecklist): RiskScoring {
  // Design Completeness (25% weight)
  const designScore = calculateDesignScore(project, checklist);

  // Coordination Risk (25% weight)
  const coordScore = calculateCoordinationScore(project, checklist);

  // Logistics Risk (20% weight)
  const logisticsScore = calculateLogisticsScore(project, checklist);

  // Scope Clarity (20% weight)
  const scopeScore = calculateScopeScore(project, checklist);

  // Supply Chain (10% weight)
  const supplyScore = calculateSupplyChainScore(project);

  const overall =
    designScore.score * 0.25 +
    coordScore.score * 0.25 +
    logisticsScore.score * 0.20 +
    scopeScore.score * 0.20 +
    supplyScore.score * 0.10;

  return {
    designCompleteness: designScore,
    coordinationRisk: coordScore,
    logisticsRisk: logisticsScore,
    scopeClarityRisk: scopeScore,
    supplyChainRisk: supplyScore,
    overallScore: overall,
    riskLevel: getRiskLevel(overall),
    recommendations: generateRecommendations(/* all scores */),
    redFlags: identifyRedFlags(/* all scores */),
  };
}
```

### 5.3 Risk Display Component

```typescript
// components/hvac/Estimate/RiskScoreCard.tsx

function RiskScoreCard({ risk }: { risk: RiskScoring }) {
  return (
    <div className="risk-score-card">
      <div className="overall-score">
        <CircularProgress value={risk.overallScore} />
        <span className={`risk-level ${risk.riskLevel}`}>
          {risk.riskLevel.toUpperCase()} RISK
        </span>
      </div>

      <div className="score-breakdown">
        <ScoreBar label="Design Completeness" score={risk.designCompleteness.score} />
        <ScoreBar label="Coordination" score={risk.coordinationRisk.score} />
        <ScoreBar label="Logistics" score={risk.logisticsRisk.score} />
        <ScoreBar label="Scope Clarity" score={risk.scopeClarityRisk.score} />
        <ScoreBar label="Supply Chain" score={risk.supplyChainRisk.score} />
      </div>

      {risk.redFlags.length > 0 && (
        <div className="red-flags">
          <h4>Red Flags</h4>
          {risk.redFlags.map(flag => <RedFlagItem key={flag} text={flag} />)}
        </div>
      )}

      <div className="recommendations">
        <h4>Recommendations</h4>
        {risk.recommendations.map(rec => <RecommendationItem key={rec} text={rec} />)}
      </div>
    </div>
  );
}
```

---

## Phase 6: Output Generation (Week 6-7)

### 6.1 Report Types

| Report | Purpose | Format |
|--------|---------|--------|
| Takeoff Report | Detailed quantities | Excel / PDF |
| Bid Summary | One-page cost summary | PDF |
| Scope Letter | What's included/excluded | Word / PDF |
| Proposal | Owner-facing document | PDF |
| Internal Notes | Risk flags & assumptions | PDF |
| Equipment Schedule | Submittal-ready schedule | Excel |

### 6.2 Excel Export

```typescript
// packages/industry-hvac/src/output/excel.ts

async function generateTakeoffExcel(project: HvacProject): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  // Cover Sheet
  const cover = workbook.addWorksheet('Cover');
  addCoverSheet(cover, project);

  // Equipment
  const equipment = workbook.addWorksheet('Equipment');
  addEquipmentSheet(equipment, project.equipment);

  // Ductwork
  const ductwork = workbook.addWorksheet('Ductwork');
  addDuctworkSheet(ductwork, project.ductwork);

  // Air Devices
  const airDevices = workbook.addWorksheet('Air Devices');
  addAirDevicesSheet(airDevices, project.airDevices);

  // Controls
  const controls = workbook.addWorksheet('Controls');
  addControlsSheet(controls, project.controls);

  // Piping
  const piping = workbook.addWorksheet('Piping');
  addPipingSheet(piping, project.piping);

  // Summary
  const summary = workbook.addWorksheet('Summary');
  addSummarySheet(summary, project.estimate);

  return workbook.xlsx.writeBuffer();
}
```

### 6.3 PDF Generation

```typescript
// packages/industry-hvac/src/output/pdf.ts

async function generateProposalPdf(project: HvacProject, estimate: HvacEstimate): Promise<Blob> {
  const doc = new PDFDocument();

  // Header with logo
  addHeader(doc, project);

  // Project Summary
  addProjectSummary(doc, project);

  // Scope of Work
  addScopeOfWork(doc, project, estimate);

  // Pricing Summary (owner-facing)
  addPricingSummary(doc, estimate);

  // Exclusions
  addExclusions(doc, estimate.notes.filter(n => n.type === 'exclusion'));

  // Terms & Conditions
  addTerms(doc);

  // Signature Block
  addSignatureBlock(doc);

  return doc.output('blob');
}
```

### 6.4 Scope Letter Generator

```typescript
async function generateScopeLetter(project: HvacProject, estimate: HvacEstimate): Promise<string> {
  const included = [];
  const excluded = [];
  const clarifications = [];

  // Auto-generate based on takeoff
  if (project.equipment.length > 0) {
    included.push(`Furnish and install (${project.equipment.length}) HVAC units as scheduled`);
  }

  if (project.ductwork.length > 0) {
    const totalLf = project.ductwork.reduce((sum, d) => sum + d.linear_feet, 0);
    included.push(`Furnish and install approximately ${totalLf} LF of ductwork`);
  }

  // Add standard exclusions
  excluded.push('Electrical work beyond equipment disconnects');
  excluded.push('Structural modifications');
  excluded.push('Asbestos abatement');
  excluded.push('Fire alarm interface wiring');

  // Add from notes
  estimate.notes
    .filter(n => n.type === 'exclusion')
    .forEach(n => excluded.push(n.content));

  return formatScopeLetter({ project, included, excluded, clarifications });
}
```

---

## Phase 7: Integration & Polish (Week 7-8)

### 7.1 Integration with Existing Rule Tool

- Share authentication with main app
- Link HVAC projects to sites (optional)
- Unified navigation
- Consistent styling

### 7.2 Settings & Configuration

```typescript
// User-configurable settings
interface HvacSettings {
  // Labor Rates
  laborRates: {
    journeyman: number;
    apprentice: number;
    foreman: number;
    sheetMetal: number;
  };

  // Default Markup
  defaultContingency: number;
  defaultOverhead: number;
  defaultProfit: number;

  // Regional Adjustments
  region: string;
  unionShop: boolean;

  // Company Info
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  licenseNumber: string;
}
```

### 7.3 Mobile Considerations

- Responsive design for tablet use on job sites
- Photo capture for field conditions
- Quick quantity adjustments
- Offline capability for document viewing

---

## File Structure Summary

```
rule_tool/
├── apps/
│   └── web/
│       └── src/
│           ├── app/
│           │   └── hvac/                    # All HVAC routes
│           └── components/
│               └── hvac/                    # All HVAC components
│
├── packages/
│   └── industry-hvac/
│       └── src/
│           ├── ai/
│           │   ├── pipeline.ts              # Blueprint processing
│           │   ├── prompts.ts               # AI extraction prompts
│           │   ├── validation.ts            # Extraction validation
│           │   └── types.ts
│           ├── cost/
│           │   ├── labor.ts                 # Labor calculations
│           │   ├── materials.ts             # Material pricing
│           │   ├── estimate.ts              # Cost roll-up
│           │   └── types.ts
│           ├── risk/
│           │   ├── scoring.ts               # Risk calculations
│           │   └── types.ts
│           ├── output/
│           │   ├── excel.ts                 # Excel generation
│           │   ├── pdf.ts                   # PDF generation
│           │   └── scope-letter.ts          # Scope letter
│           ├── rules.ts                     # (existing) HVAC rules engine
│           ├── config.ts                    # (existing) Industry config
│           └── index.ts
│
└── supabase/
    └── migrations/
        └── 00X_hvac_estimating.sql          # All HVAC tables
```

---

## Timeline Summary

| Phase | Description | Duration |
|-------|-------------|----------|
| 1 | Database Schema & Core Models | Week 1-2 |
| 2 | Core UI Components | Week 2-3 |
| 3 | AI Extraction Engine | Week 3-4 |
| 4 | Cost & Labor Engine | Week 4-5 |
| 5 | Risk Scoring Module | Week 5-6 |
| 6 | Output Generation | Week 6-7 |
| 7 | Integration & Polish | Week 7-8 |

---

## Success Metrics

1. **Takeoff Speed**: 70% reduction in manual takeoff time
2. **Accuracy**: AI extraction accuracy > 85%
3. **Risk Identification**: 90% of risk flags identified before bid
4. **Estimate Quality**: Margin protection improved by 5%+
5. **User Adoption**: Estimators complete full workflow without support

---

## Next Steps

1. Review and approve this plan
2. Create Supabase migration for Phase 1 tables
3. Begin UI component development
4. Set up AI extraction API routes
5. Implement cost engine with existing hvac-rules.ts

Ready to proceed with Phase 1?
