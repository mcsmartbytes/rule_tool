-- Seed trades and services for site estimating
-- Run this after the initial schema migration

-- ============================================
-- TRADES
-- ============================================

-- Asphalt Paving
INSERT INTO trades (id, name, code, description, color, is_default, sort_order, consumes, settings)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Asphalt Paving',
  'ASPH',
  'Hot mix asphalt installation and repair',
  '#374151',
  true,
  1,
  '[
    {"objectType": "parking-surface", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000001", "wasteFactor": 1.05},
    {"objectType": "drive-lane", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000001", "wasteFactor": 1.05},
    {"objectType": "loading-area", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000001", "wasteFactor": 1.05}
  ]'::jsonb,
  '{"mobilizationCost": 1500, "minimumJobCharge": 5000, "defaultMargin": 0.25}'::jsonb
);

-- Sealcoating
INSERT INTO trades (id, name, code, description, color, is_default, sort_order, consumes, settings)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'Sealcoating',
  'SEAL',
  'Asphalt sealcoat application',
  '#1f2937',
  true,
  2,
  '[
    {"objectType": "parking-surface", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000002", "wasteFactor": 1.0},
    {"objectType": "drive-lane", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000002", "wasteFactor": 1.0}
  ]'::jsonb,
  '{"mobilizationCost": 500, "minimumJobCharge": 1500, "defaultMargin": 0.30}'::jsonb
);

-- Striping
INSERT INTO trades (id, name, code, description, color, is_default, sort_order, consumes, settings)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  'Striping & Markings',
  'STRP',
  'Parking lot striping and pavement markings',
  '#fbbf24',
  true,
  3,
  '[
    {"objectType": "parking-stall", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000003"},
    {"objectType": "stall-group", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000003"},
    {"objectType": "ada-space", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000004"},
    {"objectType": "fire-lane", "quantitySource": "length", "serviceId": "b1000000-0000-0000-0000-000000000005"},
    {"objectType": "crosswalk", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000006"},
    {"objectType": "directional-arrow", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000007"},
    {"objectType": "edge-line", "quantitySource": "length", "serviceId": "b1000000-0000-0000-0000-000000000008"}
  ]'::jsonb,
  '{"mobilizationCost": 350, "minimumJobCharge": 800, "defaultMargin": 0.35}'::jsonb
);

-- Concrete
INSERT INTO trades (id, name, code, description, color, is_default, sort_order, consumes, settings)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  'Concrete',
  'CONC',
  'Concrete flatwork and repairs',
  '#9ca3af',
  true,
  4,
  '[
    {"objectType": "sidewalk", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000009", "wasteFactor": 1.0},
    {"objectType": "curb", "quantitySource": "length", "serviceId": "b1000000-0000-0000-0000-000000000010"},
    {"objectType": "gutter", "quantitySource": "length", "serviceId": "b1000000-0000-0000-0000-000000000011"},
    {"objectType": "ada-ramp", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000012"},
    {"objectType": "median", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000009"},
    {"objectType": "island", "quantitySource": "area", "serviceId": "b1000000-0000-0000-0000-000000000009"}
  ]'::jsonb,
  '{"mobilizationCost": 800, "minimumJobCharge": 2500, "defaultMargin": 0.25}'::jsonb
);

-- Crack Repair
INSERT INTO trades (id, name, code, description, color, is_default, sort_order, consumes, settings)
VALUES (
  'a1000000-0000-0000-0000-000000000005',
  'Crack Repair',
  'CRCK',
  'Asphalt crack sealing and repair',
  '#ef4444',
  true,
  5,
  '[
    {"objectType": "crack", "quantitySource": "length", "serviceId": "b1000000-0000-0000-0000-000000000013"}
  ]'::jsonb,
  '{"mobilizationCost": 300, "minimumJobCharge": 500, "defaultMargin": 0.40}'::jsonb
);

-- Site Work
INSERT INTO trades (id, name, code, description, color, is_default, sort_order, consumes, settings)
VALUES (
  'a1000000-0000-0000-0000-000000000006',
  'Site Work',
  'SITE',
  'General site improvements and accessories',
  '#10b981',
  true,
  6,
  '[
    {"objectType": "bollard", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000014"},
    {"objectType": "light-pole", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000015"},
    {"objectType": "sign", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000016"},
    {"objectType": "drain", "quantitySource": "count", "serviceId": "b1000000-0000-0000-0000-000000000017"}
  ]'::jsonb,
  '{"mobilizationCost": 500, "minimumJobCharge": 1000, "defaultMargin": 0.30}'::jsonb
);


-- ============================================
-- SERVICES
-- ============================================

-- Asphalt Services
INSERT INTO services (id, trade_id, name, code, description, unit, labor_rate, material_cost, equipment_cost_hourly, production_rate, crew_size, waste_factor)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'HMA Overlay 2"', 'ASPH-OVL2', 'Hot mix asphalt overlay 2 inch thickness',
   'sq ft', 0.85, 1.45, 0.35, 500, 4, 1.05);

-- Sealcoat Services
INSERT INTO services (id, trade_id, name, code, description, unit, labor_rate, material_cost, equipment_cost_hourly, production_rate, crew_size, waste_factor)
VALUES
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
   'Coal Tar Sealcoat 2-Coat', 'SEAL-2CT', 'Two coat coal tar emulsion sealcoat',
   'sq ft', 0.04, 0.08, 0.02, 3000, 3, 1.0);

-- Striping Services
INSERT INTO services (id, trade_id, name, code, description, unit, labor_rate, material_cost, equipment_cost_hourly, production_rate, crew_size, waste_factor)
VALUES
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003',
   'Standard Stall Striping', 'STRP-STL', 'Standard parking stall striping (4" lines)',
   'each', 3.50, 1.25, 0.50, 30, 2, 1.0),

  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003',
   'ADA Stall Complete', 'STRP-ADA', 'ADA compliant stall with logo, hash marks, and signage',
   'each', 45.00, 35.00, 5.00, 4, 2, 1.0),

  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003',
   'Fire Lane Curb Paint', 'STRP-FLN', 'Red curb paint with "NO PARKING FIRE LANE" stencil',
   'lin ft', 0.75, 0.45, 0.15, 200, 2, 1.0),

  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003',
   'Crosswalk Striping', 'STRP-CRW', 'Standard crosswalk with 24" bars',
   'sq ft', 0.85, 0.65, 0.20, 150, 2, 1.0),

  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003',
   'Directional Arrow', 'STRP-ARW', 'Standard directional arrow (straight, turn, combo)',
   'each', 18.00, 8.00, 2.00, 8, 2, 1.0),

  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003',
   '4" Edge Line', 'STRP-EDG', '4 inch edge line striping',
   'lin ft', 0.15, 0.08, 0.03, 500, 2, 1.0);

-- Concrete Services
INSERT INTO services (id, trade_id, name, code, description, unit, labor_rate, material_cost, equipment_cost_hourly, production_rate, crew_size, waste_factor)
VALUES
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000004',
   'Concrete Flatwork 4"', 'CONC-FLT4', '4 inch concrete flatwork with wire mesh',
   'sq ft', 3.50, 4.25, 1.00, 100, 4, 1.0),

  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004',
   'Concrete Curb', 'CONC-CRB', '6" x 18" extruded concrete curb',
   'lin ft', 8.50, 6.00, 2.50, 50, 3, 1.0),

  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000004',
   'Concrete Gutter', 'CONC-GTR', 'Concrete valley gutter',
   'lin ft', 12.00, 8.50, 3.00, 40, 3, 1.0),

  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000004',
   'ADA Ramp', 'CONC-ADA', 'ADA compliant concrete ramp with truncated domes',
   'each', 450.00, 380.00, 75.00, 2, 4, 1.0);

-- Crack Repair Services
INSERT INTO services (id, trade_id, name, code, description, unit, labor_rate, material_cost, equipment_cost_hourly, production_rate, crew_size, waste_factor)
VALUES
  ('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000005',
   'Hot Rubberized Crack Seal', 'CRCK-HOT', 'Hot pour rubberized crack sealant',
   'lin ft', 0.45, 0.35, 0.15, 300, 2, 1.0);

-- Site Work Services
INSERT INTO services (id, trade_id, name, code, description, unit, labor_rate, material_cost, equipment_cost_hourly, production_rate, crew_size, waste_factor)
VALUES
  ('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000006',
   'Steel Bollard Install', 'SITE-BLR', '4" diameter steel bollard, concrete set',
   'each', 125.00, 185.00, 35.00, 4, 2, 1.0),

  ('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000006',
   'Light Pole Base Repair', 'SITE-LPL', 'Light pole concrete base repair',
   'each', 350.00, 275.00, 85.00, 2, 3, 1.0),

  ('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000006',
   'Sign Post Install', 'SITE-SGN', 'Standard sign post with concrete base',
   'each', 85.00, 120.00, 25.00, 6, 2, 1.0),

  ('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000006',
   'Catch Basin Repair', 'SITE-DRN', 'Catch basin frame and grate adjustment',
   'each', 225.00, 185.00, 65.00, 3, 2, 1.0);


-- ============================================
-- Summary of pricing (for reference)
-- ============================================
--
-- ASPHALT:
--   HMA Overlay 2" = $2.65/sq ft (labor $0.85 + material $1.45 + equip $0.35)
--
-- SEALCOAT:
--   2-Coat Sealcoat = $0.14/sq ft (labor $0.04 + material $0.08 + equip $0.02)
--
-- STRIPING:
--   Standard Stall = $5.25/each
--   ADA Stall Complete = $85.00/each
--   Fire Lane = $1.35/lin ft
--   Crosswalk = $1.70/sq ft
--   Arrow = $28.00/each
--   Edge Line = $0.26/lin ft
--
-- CONCRETE:
--   Flatwork 4" = $8.75/sq ft
--   Curb = $17.00/lin ft
--   Gutter = $23.50/lin ft
--   ADA Ramp = $905.00/each
--
-- CRACK REPAIR:
--   Hot Pour = $0.95/lin ft
--
-- SITE WORK:
--   Bollard = $345.00/each
--   Light Pole Base = $710.00/each
--   Sign Post = $230.00/each
--   Catch Basin = $475.00/each
