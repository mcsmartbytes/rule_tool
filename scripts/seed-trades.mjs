import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Trades data - using valid hex UUIDs (b for services instead of s)
const trades = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    name: 'Asphalt Paving',
    code: 'ASPH',
    description: 'Hot mix asphalt installation and repair',
    color: '#374151',
    is_default: true,
    sort_order: 1,
    consumes: [
      { objectType: 'parking-surface', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000001', wasteFactor: 1.05 },
      { objectType: 'drive-lane', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000001', wasteFactor: 1.05 },
      { objectType: 'loading-area', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000001', wasteFactor: 1.05 }
    ],
    settings: { mobilizationCost: 1500, minimumJobCharge: 5000, defaultMargin: 0.25 }
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    name: 'Sealcoating',
    code: 'SEAL',
    description: 'Asphalt sealcoat application',
    color: '#1f2937',
    is_default: true,
    sort_order: 2,
    consumes: [
      { objectType: 'parking-surface', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000002', wasteFactor: 1.0 },
      { objectType: 'drive-lane', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000002', wasteFactor: 1.0 }
    ],
    settings: { mobilizationCost: 500, minimumJobCharge: 1500, defaultMargin: 0.30 }
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    name: 'Striping & Markings',
    code: 'STRP',
    description: 'Parking lot striping and pavement markings',
    color: '#fbbf24',
    is_default: true,
    sort_order: 3,
    consumes: [
      { objectType: 'parking-stall', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000003' },
      { objectType: 'stall-group', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000003' },
      { objectType: 'ada-space', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000004' },
      { objectType: 'fire-lane', quantitySource: 'length', serviceId: 'b1000000-0000-0000-0000-000000000005' },
      { objectType: 'crosswalk', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000006' },
      { objectType: 'directional-arrow', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000007' },
      { objectType: 'edge-line', quantitySource: 'length', serviceId: 'b1000000-0000-0000-0000-000000000008' }
    ],
    settings: { mobilizationCost: 350, minimumJobCharge: 800, defaultMargin: 0.35 }
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    name: 'Concrete',
    code: 'CONC',
    description: 'Concrete flatwork and repairs',
    color: '#9ca3af',
    is_default: true,
    sort_order: 4,
    consumes: [
      { objectType: 'sidewalk', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000009', wasteFactor: 1.0 },
      { objectType: 'curb', quantitySource: 'length', serviceId: 'b1000000-0000-0000-0000-000000000010' },
      { objectType: 'gutter', quantitySource: 'length', serviceId: 'b1000000-0000-0000-0000-000000000011' },
      { objectType: 'ada-ramp', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000012' },
      { objectType: 'median', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000009' },
      { objectType: 'island', quantitySource: 'area', serviceId: 'b1000000-0000-0000-0000-000000000009' }
    ],
    settings: { mobilizationCost: 800, minimumJobCharge: 2500, defaultMargin: 0.25 }
  },
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    name: 'Crack Repair',
    code: 'CRCK',
    description: 'Asphalt crack sealing and repair',
    color: '#ef4444',
    is_default: true,
    sort_order: 5,
    consumes: [
      { objectType: 'crack', quantitySource: 'length', serviceId: 'b1000000-0000-0000-0000-000000000013' }
    ],
    settings: { mobilizationCost: 300, minimumJobCharge: 500, defaultMargin: 0.40 }
  },
  {
    id: 'a1000000-0000-0000-0000-000000000006',
    name: 'Site Work',
    code: 'SITE',
    description: 'General site improvements and accessories',
    color: '#10b981',
    is_default: true,
    sort_order: 6,
    consumes: [
      { objectType: 'bollard', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000014' },
      { objectType: 'light-pole', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000015' },
      { objectType: 'sign', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000016' },
      { objectType: 'drain', quantitySource: 'count', serviceId: 'b1000000-0000-0000-0000-000000000017' }
    ],
    settings: { mobilizationCost: 500, minimumJobCharge: 1000, defaultMargin: 0.30 }
  }
];

// Services data - using 'b' prefix for valid hex UUIDs
const services = [
  // Asphalt Services
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    trade_id: 'a1000000-0000-0000-0000-000000000001',
    name: 'HMA Overlay 2"',
    code: 'ASPH-OVL2',
    description: 'Hot mix asphalt overlay 2 inch thickness',
    unit: 'sq ft',
    labor_rate: 0.85,
    material_cost: 1.45,
    equipment_cost_hourly: 0.35,
    production_rate: 500,
    crew_size: 4,
    waste_factor: 1.05
  },
  // Sealcoat Services
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    trade_id: 'a1000000-0000-0000-0000-000000000002',
    name: 'Coal Tar Sealcoat 2-Coat',
    code: 'SEAL-2CT',
    description: 'Two coat coal tar emulsion sealcoat',
    unit: 'sq ft',
    labor_rate: 0.04,
    material_cost: 0.08,
    equipment_cost_hourly: 0.02,
    production_rate: 3000,
    crew_size: 3,
    waste_factor: 1.0
  },
  // Striping Services
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    trade_id: 'a1000000-0000-0000-0000-000000000003',
    name: 'Standard Stall Striping',
    code: 'STRP-STL',
    description: 'Standard parking stall striping (4" lines)',
    unit: 'each',
    labor_rate: 3.50,
    material_cost: 1.25,
    equipment_cost_hourly: 0.50,
    production_rate: 30,
    crew_size: 2,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    trade_id: 'a1000000-0000-0000-0000-000000000003',
    name: 'ADA Stall Complete',
    code: 'STRP-ADA',
    description: 'ADA compliant stall with logo, hash marks, and signage',
    unit: 'each',
    labor_rate: 45.00,
    material_cost: 35.00,
    equipment_cost_hourly: 5.00,
    production_rate: 4,
    crew_size: 2,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    trade_id: 'a1000000-0000-0000-0000-000000000003',
    name: 'Fire Lane Curb Paint',
    code: 'STRP-FLN',
    description: 'Red curb paint with "NO PARKING FIRE LANE" stencil',
    unit: 'lin ft',
    labor_rate: 0.75,
    material_cost: 0.45,
    equipment_cost_hourly: 0.15,
    production_rate: 200,
    crew_size: 2,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    trade_id: 'a1000000-0000-0000-0000-000000000003',
    name: 'Crosswalk Striping',
    code: 'STRP-CRW',
    description: 'Standard crosswalk with 24" bars',
    unit: 'sq ft',
    labor_rate: 0.85,
    material_cost: 0.65,
    equipment_cost_hourly: 0.20,
    production_rate: 150,
    crew_size: 2,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000007',
    trade_id: 'a1000000-0000-0000-0000-000000000003',
    name: 'Directional Arrow',
    code: 'STRP-ARW',
    description: 'Standard directional arrow (straight, turn, combo)',
    unit: 'each',
    labor_rate: 18.00,
    material_cost: 8.00,
    equipment_cost_hourly: 2.00,
    production_rate: 8,
    crew_size: 2,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000008',
    trade_id: 'a1000000-0000-0000-0000-000000000003',
    name: '4" Edge Line',
    code: 'STRP-EDG',
    description: '4 inch edge line striping',
    unit: 'lin ft',
    labor_rate: 0.15,
    material_cost: 0.08,
    equipment_cost_hourly: 0.03,
    production_rate: 500,
    crew_size: 2,
    waste_factor: 1.0
  },
  // Concrete Services
  {
    id: 'b1000000-0000-0000-0000-000000000009',
    trade_id: 'a1000000-0000-0000-0000-000000000004',
    name: 'Concrete Flatwork 4"',
    code: 'CONC-FLT4',
    description: '4 inch concrete flatwork with wire mesh',
    unit: 'sq ft',
    labor_rate: 3.50,
    material_cost: 4.25,
    equipment_cost_hourly: 1.00,
    production_rate: 100,
    crew_size: 4,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000010',
    trade_id: 'a1000000-0000-0000-0000-000000000004',
    name: 'Concrete Curb',
    code: 'CONC-CRB',
    description: '6" x 18" extruded concrete curb',
    unit: 'lin ft',
    labor_rate: 8.50,
    material_cost: 6.00,
    equipment_cost_hourly: 2.50,
    production_rate: 50,
    crew_size: 3,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000011',
    trade_id: 'a1000000-0000-0000-0000-000000000004',
    name: 'Concrete Gutter',
    code: 'CONC-GTR',
    description: 'Concrete valley gutter',
    unit: 'lin ft',
    labor_rate: 12.00,
    material_cost: 8.50,
    equipment_cost_hourly: 3.00,
    production_rate: 40,
    crew_size: 3,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000012',
    trade_id: 'a1000000-0000-0000-0000-000000000004',
    name: 'ADA Ramp',
    code: 'CONC-ADA',
    description: 'ADA compliant concrete ramp with truncated domes',
    unit: 'each',
    labor_rate: 450.00,
    material_cost: 380.00,
    equipment_cost_hourly: 75.00,
    production_rate: 2,
    crew_size: 4,
    waste_factor: 1.0
  },
  // Crack Repair Services
  {
    id: 'b1000000-0000-0000-0000-000000000013',
    trade_id: 'a1000000-0000-0000-0000-000000000005',
    name: 'Hot Rubberized Crack Seal',
    code: 'CRCK-HOT',
    description: 'Hot pour rubberized crack sealant',
    unit: 'lin ft',
    labor_rate: 0.45,
    material_cost: 0.35,
    equipment_cost_hourly: 0.15,
    production_rate: 300,
    crew_size: 2,
    waste_factor: 1.0
  },
  // Site Work Services
  {
    id: 'b1000000-0000-0000-0000-000000000014',
    trade_id: 'a1000000-0000-0000-0000-000000000006',
    name: 'Steel Bollard Install',
    code: 'SITE-BLR',
    description: '4" diameter steel bollard, concrete set',
    unit: 'each',
    labor_rate: 125.00,
    material_cost: 185.00,
    equipment_cost_hourly: 35.00,
    production_rate: 4,
    crew_size: 2,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000015',
    trade_id: 'a1000000-0000-0000-0000-000000000006',
    name: 'Light Pole Base Repair',
    code: 'SITE-LPL',
    description: 'Light pole concrete base repair',
    unit: 'each',
    labor_rate: 350.00,
    material_cost: 275.00,
    equipment_cost_hourly: 85.00,
    production_rate: 2,
    crew_size: 3,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000016',
    trade_id: 'a1000000-0000-0000-0000-000000000006',
    name: 'Sign Post Install',
    code: 'SITE-SGN',
    description: 'Standard sign post with concrete base',
    unit: 'each',
    labor_rate: 85.00,
    material_cost: 120.00,
    equipment_cost_hourly: 25.00,
    production_rate: 6,
    crew_size: 2,
    waste_factor: 1.0
  },
  {
    id: 'b1000000-0000-0000-0000-000000000017',
    trade_id: 'a1000000-0000-0000-0000-000000000006',
    name: 'Catch Basin Repair',
    code: 'SITE-DRN',
    description: 'Catch basin frame and grate adjustment',
    unit: 'each',
    labor_rate: 225.00,
    material_cost: 185.00,
    equipment_cost_hourly: 65.00,
    production_rate: 3,
    crew_size: 2,
    waste_factor: 1.0
  }
];

async function seed() {
  console.log('Seeding trades and services...\n');

  // Insert trades
  console.log('Inserting trades...');
  const { error: tradesError } = await supabase
    .from('trades')
    .upsert(trades, { onConflict: 'id' });

  if (tradesError) {
    console.error('Error inserting trades:', tradesError);
    process.exit(1);
  }
  console.log(`Inserted ${trades.length} trades\n`);

  // Insert services
  console.log('Inserting services...');
  const { error: servicesError } = await supabase
    .from('services')
    .upsert(services, { onConflict: 'id' });

  if (servicesError) {
    console.error('Error inserting services:', servicesError);
    process.exit(1);
  }
  console.log(`Inserted ${services.length} services\n`);

  // Verify
  const { data: tradeCount } = await supabase.from('trades').select('*', { count: 'exact', head: true });
  const { data: serviceCount } = await supabase.from('services').select('*', { count: 'exact', head: true });

  console.log('Seed complete!');
  console.log('Trades:', trades.length);
  console.log('Services:', services.length);
}

seed().catch(console.error);
