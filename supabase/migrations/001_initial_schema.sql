-- Rule Tool Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & ORGANIZATIONS
-- ============================================

-- Organizations (companies using the tool)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user', 'viewer')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITES
-- ============================================

-- Sites (properties being estimated)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),

  -- Basic info
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Location
  coordinates JSONB, -- { lat: number, lng: number }
  bounds JSONB,      -- Map bounds for restoring view

  -- Site settings
  settings JSONB DEFAULT '{
    "defaultUnits": "imperial",
    "mobilizationShared": true,
    "contingencyPercent": 5
  }',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITE OBJECTS
-- ============================================

-- Site Objects (geometries drawn on the site)
CREATE TABLE site_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Classification
  object_type TEXT NOT NULL,
  sub_type TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Geometry (GeoJSON)
  geometry JSONB NOT NULL,

  -- Computed measurements
  measurements JSONB DEFAULT '{}', -- { area, perimeter, length, count }

  -- Object-specific properties
  properties JSONB DEFAULT '{}',

  -- Source tracking
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai-suggested', 'imported')),
  confidence NUMERIC,

  -- Display
  label TEXT,
  color TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valid object types (for reference, not enforced by DB)
COMMENT ON COLUMN site_objects.object_type IS 'Valid types: parking-surface, drive-lane, loading-area, sidewalk, plaza, curb, gutter, edge-line, crack, drain, bollard, light-pole, sign, building-footprint, median, island, ada-ramp, ada-space, fire-lane, crosswalk, parking-stall, stall-group, directional-arrow, symbol';

-- ============================================
-- TRADES
-- ============================================

-- Trade configurations
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- e.g., 'ASPH', 'STRP', 'SEAL'
  description TEXT,
  color TEXT,

  -- What object types this trade consumes
  consumes JSONB NOT NULL DEFAULT '[]',

  -- Trade settings
  settings JSONB DEFAULT '{
    "mobilizationCost": 0,
    "minimumJobCharge": 0,
    "defaultMargin": 0.25
  }',

  -- Is this a system default?
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVICES (Pricing)
-- ============================================

-- Service types with pricing
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,

  -- Unit of measure
  unit TEXT NOT NULL DEFAULT 'sq ft', -- 'sq ft', 'linear ft', 'each'

  -- Production rates
  production_rate NUMERIC, -- units per hour
  crew_size INTEGER DEFAULT 1,

  -- Costs
  labor_rate NUMERIC DEFAULT 0, -- per hour
  material_cost NUMERIC DEFAULT 0, -- per unit
  equipment_cost_fixed NUMERIC DEFAULT 0,
  equipment_cost_hourly NUMERIC DEFAULT 0,

  -- Factors
  waste_factor NUMERIC DEFAULT 1.0,

  -- Minimums
  minimum_charge NUMERIC DEFAULT 0,
  minimum_quantity NUMERIC DEFAULT 0,

  -- Is this a system default?
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ESTIMATES
-- ============================================

-- Trade-specific estimates
CREATE TABLE trade_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES trades(id),

  -- Estimate data (full JSON for flexibility)
  line_items JSONB DEFAULT '[]',

  -- Totals
  subtotal NUMERIC DEFAULT 0,
  mobilization NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0.25,
  margin_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,

  -- Risk assessment
  risk_flags JSONB DEFAULT '[]',

  -- Traceability
  derived_from JSONB DEFAULT '[]', -- Links to source objects

  -- Version tracking
  version INTEGER DEFAULT 1,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified estimates (all trades combined)
CREATE TABLE unified_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Name for this estimate version
  name TEXT,

  -- Totals by trade
  trade_subtotals JSONB DEFAULT '{}',
  combined_subtotal NUMERIC DEFAULT 0,

  -- Shared costs
  shared_mobilization NUMERIC DEFAULT 0,
  shared_contingency NUMERIC DEFAULT 0,

  -- Final total
  grand_total NUMERIC DEFAULT 0,

  -- Summary stats
  total_area NUMERIC DEFAULT 0,
  total_linear_feet NUMERIC DEFAULT 0,
  total_labor_hours NUMERIC DEFAULT 0,

  -- Version tracking
  revision_number INTEGER DEFAULT 1,
  previous_revision_id UUID REFERENCES unified_estimates(id),

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimate revisions (change history)
CREATE TABLE estimate_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unified_estimate_id UUID NOT NULL REFERENCES unified_estimates(id) ON DELETE CASCADE,

  revision_number INTEGER NOT NULL,

  -- What changed
  changes JSONB NOT NULL DEFAULT '[]',

  -- Snapshot of totals
  totals JSONB NOT NULL,

  -- Who made changes
  created_by UUID REFERENCES profiles(id),
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Sites
CREATE INDEX idx_sites_organization ON sites(organization_id);
CREATE INDEX idx_sites_created_by ON sites(created_by);
CREATE INDEX idx_sites_status ON sites(status);

-- Site Objects
CREATE INDEX idx_site_objects_site ON site_objects(site_id);
CREATE INDEX idx_site_objects_type ON site_objects(object_type);

-- Trades
CREATE INDEX idx_trades_organization ON trades(organization_id);
CREATE INDEX idx_trades_code ON trades(code);

-- Services
CREATE INDEX idx_services_organization ON services(organization_id);
CREATE INDEX idx_services_trade ON services(trade_id);

-- Estimates
CREATE INDEX idx_trade_estimates_site ON trade_estimates(site_id);
CREATE INDEX idx_trade_estimates_trade ON trade_estimates(trade_id);
CREATE INDEX idx_unified_estimates_site ON unified_estimates(site_id);
CREATE INDEX idx_estimate_revisions_unified ON estimate_revisions(unified_estimate_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_revisions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Organizations: Members can view their organization
CREATE POLICY "Members can view organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Sites: Organization members can CRUD sites
CREATE POLICY "Members can view sites"
  ON sites FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can create sites"
  ON sites FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can update sites"
  ON sites FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can delete sites"
  ON sites FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Site Objects: Inherit from site permissions
CREATE POLICY "Members can view site objects"
  ON site_objects FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can create site objects"
  ON site_objects FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can update site objects"
  ON site_objects FOR UPDATE
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can delete site objects"
  ON site_objects FOR DELETE
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Trades: View default trades OR organization trades
CREATE POLICY "Users can view trades"
  ON trades FOR SELECT
  USING (
    is_default = true
    OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can manage org trades"
  ON trades FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Services: View default services OR organization services
CREATE POLICY "Users can view services"
  ON services FOR SELECT
  USING (
    is_default = true
    OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can manage org services"
  ON services FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Estimates: Inherit from site permissions
CREATE POLICY "Members can view trade estimates"
  ON trade_estimates FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage trade estimates"
  ON trade_estimates FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can view unified estimates"
  ON unified_estimates FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage unified estimates"
  ON unified_estimates FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can view estimate revisions"
  ON estimate_revisions FOR SELECT
  USING (
    unified_estimate_id IN (
      SELECT id FROM unified_estimates WHERE site_id IN (
        SELECT id FROM sites WHERE organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_site_objects_updated_at
  BEFORE UPDATE ON site_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trade_estimates_updated_at
  BEFORE UPDATE ON trade_estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_unified_estimates_updated_at
  BEFORE UPDATE ON unified_estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
