-- Rule Tool - Seed Default Trades and Services
-- Run this after 001_initial_schema.sql

-- ============================================
-- DEFAULT TRADES
-- ============================================

INSERT INTO trades (id, name, code, description, color, consumes, settings, is_default, sort_order) VALUES

-- Asphalt Trade
(
  'a1000000-0000-0000-0000-000000000001',
  'Asphalt Paving',
  'ASPH',
  'Asphalt paving, patching, and repair services',
  '#1e293b',
  '[
    {"objectType": "parking-surface", "subTypes": ["asphalt"], "quantitySource": "area", "serviceId": "asphalt-overlay", "wasteFactor": 1.03},
    {"objectType": "drive-lane", "quantitySource": "area", "serviceId": "asphalt-overlay", "wasteFactor": 1.03},
    {"objectType": "loading-area", "quantitySource": "area", "serviceId": "asphalt-overlay", "wasteFactor": 1.03},
    {"objectType": "crack", "quantitySource": "length", "serviceId": "crack-seal", "wasteFactor": 1.10}
  ]'::jsonb,
  '{"mobilizationCost": 850, "minimumJobCharge": 2500, "defaultMargin": 0.25}'::jsonb,
  true,
  1
),

-- Sealcoating Trade
(
  'a1000000-0000-0000-0000-000000000002',
  'Sealcoating',
  'SEAL',
  'Asphalt sealcoating and surface protection',
  '#475569',
  '[
    {"objectType": "parking-surface", "subTypes": ["asphalt"], "quantitySource": "area", "serviceId": "sealcoat", "wasteFactor": 1.05},
    {"objectType": "drive-lane", "quantitySource": "area", "serviceId": "sealcoat", "wasteFactor": 1.05}
  ]'::jsonb,
  '{"mobilizationCost": 450, "minimumJobCharge": 800, "defaultMargin": 0.30}'::jsonb,
  true,
  2
),

-- Concrete Trade
(
  'a1000000-0000-0000-0000-000000000003',
  'Concrete',
  'CONC',
  'Concrete flatwork, curbs, and sidewalks',
  '#6b7280',
  '[
    {"objectType": "parking-surface", "subTypes": ["concrete"], "quantitySource": "area", "serviceId": "concrete-flatwork", "wasteFactor": 1.05},
    {"objectType": "sidewalk", "quantitySource": "area", "serviceId": "concrete-sidewalk", "wasteFactor": 1.05},
    {"objectType": "plaza", "quantitySource": "area", "serviceId": "concrete-flatwork", "wasteFactor": 1.05},
    {"objectType": "curb", "quantitySource": "length", "serviceId": "concrete-curb", "wasteFactor": 1.02},
    {"objectType": "ada-ramp", "quantitySource": "count", "serviceId": "ada-ramp-install"}
  ]'::jsonb,
  '{"mobilizationCost": 650, "minimumJobCharge": 1500, "defaultMargin": 0.25}'::jsonb,
  true,
  3
),

-- Striping Trade
(
  'a1000000-0000-0000-0000-000000000004',
  'Striping',
  'STRP',
  'Parking lot striping.and pavement markings',
  '#fbbf24',
  '[
    {"objectType": "parking-stall", "quantitySource": "count", "serviceId": "stall-striping"},
    {"objectType": "stall-group", "quantitySource": "custom", "customFormula": "properties.stallCount", "serviceId": "stall-striping"},
    {"objectType": "ada-space", "quantitySource": "count", "serviceId": "ada-marking"},
    {"objectType": "fire-lane", "quantitySource": "length", "serviceId": "fire-lane-marking"},
    {"objectType": "directional-arrow", "quantitySource": "count", "serviceId": "arrow-stencil"},
    {"objectType": "curb", "quantitySource": "length", "serviceId": "curb-paint"},
    {"objectType": "crosswalk", "quantitySource": "count", "serviceId": "crosswalk-marking"},
    {"objectType": "symbol", "quantitySource": "count", "serviceId": "symbol-stencil"}
  ]'::jsonb,
  '{"mobilizationCost": 350, "minimumJobCharge": 450, "defaultMargin": 0.30}'::jsonb,
  true,
  4
);

-- ============================================
-- DEFAULT SERVICES
-- ============================================

INSERT INTO services (id, trade_id, name, code, description, unit, production_rate, crew_size, labor_rate, material_cost, equipment_cost_fixed, equipment_cost_hourly, waste_factor, minimum_charge, is_default) VALUES

-- Asphalt Services
(
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Asphalt Overlay',
  'asphalt-overlay',
  '2" hot mix asphalt overlay',
  'sq ft',
  500,
  4,
  35.00,
  2.50,
  500,
  75,
  1.03,
  2500,
  true
),
(
  'b1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  'Asphalt Patching',
  'asphalt-patching',
  'Remove and replace damaged asphalt',
  'sq ft',
  100,
  3,
  35.00,
  4.00,
  350,
  50,
  1.05,
  800,
  true
),
(
  'b1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000001',
  'Crack Sealing',
  'crack-seal',
  'Hot rubber crack sealing',
  'linear ft',
  300,
  2,
  30.00,
  0.35,
  200,
  25,
  1.10,
  350,
  true
),

-- Sealcoating Services
(
  'b1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000002',
  'Sealcoat Application',
  'sealcoat',
  'Coal tar or asphalt emulsion sealcoat - 2 coats',
  'sq ft',
  2000,
  3,
  28.00,
  0.08,
  300,
  40,
  1.05,
  800,
  true
),

-- Concrete Services
(
  'b1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000003',
  'Concrete Flatwork',
  'concrete-flatwork',
  '4" concrete slab with wire mesh',
  'sq ft',
  150,
  4,
  38.00,
  6.50,
  400,
  60,
  1.05,
  1500,
  true
),
(
  'b1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000003',
  'Concrete Curb',
  'concrete-curb',
  'Standard 6" x 18" curb and gutter',
  'linear ft',
  40,
  3,
  38.00,
  12.00,
  300,
  45,
  1.02,
  800,
  true
),
(
  'b1000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000003',
  'Concrete Sidewalk',
  'concrete-sidewalk',
  '4" concrete sidewalk',
  'sq ft',
  200,
  3,
  36.00,
  5.50,
  250,
  40,
  1.05,
  600,
  true
),
(
  'b1000000-0000-0000-0000-000000000008',
  'a1000000-0000-0000-0000-000000000003',
  'ADA Ramp Installation',
  'ada-ramp-install',
  'ADA compliant curb ramp with detectable warnings',
  'each',
  0.5,
  3,
  38.00,
  450.00,
  200,
  30,
  1.0,
  800,
  true
),

-- Striping Services
(
  'b1000000-0000-0000-0000-000000000009',
  'a1000000-0000-0000-0000-000000000004',
  'Stall Striping',
  'stall-striping',
  'Standard parking stall (3 lines)',
  'each',
  30,
  2,
  25.00,
  1.50,
  150,
  20,
  1.0,
  450,
  true
),
(
  'b1000000-0000-0000-0000-000000000010',
  'a1000000-0000-0000-0000-000000000004',
  'Line Striping',
  'line-striping',
  '4" traffic paint line',
  'linear ft',
  500,
  2,
  25.00,
  0.15,
  150,
  20,
  1.0,
  350,
  true
),
(
  'b1000000-0000-0000-0000-000000000011',
  'a1000000-0000-0000-0000-000000000004',
  'ADA Marking',
  'ada-marking',
  'ADA accessible space with logo and access aisle',
  'each',
  4,
  2,
  25.00,
  35.00,
  150,
  20,
  1.0,
  150,
  true
),
(
  'b1000000-0000-0000-0000-000000000012',
  'a1000000-0000-0000-0000-000000000004',
  'Fire Lane Marking',
  'fire-lane-marking',
  'Fire lane curb painting and lettering',
  'linear ft',
  100,
  2,
  25.00,
  0.50,
  150,
  20,
  1.0,
  250,
  true
),
(
  'b1000000-0000-0000-0000-000000000013',
  'a1000000-0000-0000-0000-000000000004',
  'Arrow Stencil',
  'arrow-stencil',
  'Directional arrow (straight, turn, combo)',
  'each',
  8,
  2,
  25.00,
  8.00,
  150,
  20,
  1.0,
  75,
  true
),
(
  'b1000000-0000-0000-0000-000000000014',
  'a1000000-0000-0000-0000-000000000004',
  'Curb Paint',
  'curb-paint',
  'Curb painting (yellow, red, white)',
  'linear ft',
  200,
  2,
  25.00,
  0.25,
  150,
  20,
  1.0,
  150,
  true
),
(
  'b1000000-0000-0000-0000-000000000015',
  'a1000000-0000-0000-0000-000000000004',
  'Crosswalk Marking',
  'crosswalk-marking',
  'Standard ladder-style crosswalk',
  'each',
  2,
  2,
  25.00,
  45.00,
  150,
  20,
  1.0,
  200,
  true
),
(
  'b1000000-0000-0000-0000-000000000016',
  'a1000000-0000-0000-0000-000000000004',
  'Symbol Stencil',
  'symbol-stencil',
  'Custom symbol or text stencil',
  'each',
  6,
  2,
  25.00,
  12.00,
  150,
  20,
  1.0,
  100,
  true
);
