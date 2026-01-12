-- PDF Blueprint Tables
-- Migration for PDF upload and AI analysis features

-- ============================================
-- PDF DOCUMENTS
-- ============================================

-- PDF Documents (uploaded files)
CREATE TABLE pdf_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),

  -- File info
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,

  -- Processing status
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PDF PAGES
-- ============================================

-- PDF Pages (individual pages extracted from documents)
CREATE TABLE pdf_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,

  -- Rendered images
  image_path TEXT NOT NULL,
  thumbnail_path TEXT,

  -- AI categorization
  category TEXT CHECK (category IN (
    'site-plan', 'floor-plan', 'electrical', 'mechanical',
    'plumbing', 'structural', 'landscape', 'civil',
    'detail', 'schedule', 'cover', 'other'
  )),
  category_confidence REAL,

  -- Scale info (detected or manual)
  scale_info JSONB, -- { ratio: "1:50", units: "feet", pixelsPerUnit: 10.5, calibrated: true }

  -- Analysis status
  ai_analyzed BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMPTZ,

  -- Page metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, page_number)
);

-- ============================================
-- BLUEPRINT FEATURES
-- ============================================

-- Blueprint Features (detected from PDF pages)
CREATE TABLE blueprint_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pdf_pages(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,

  -- Classification (same types as site_objects)
  object_type TEXT NOT NULL,
  sub_type TEXT,

  -- Geometry (in page coordinates - pixels or scaled units)
  geometry JSONB NOT NULL,

  -- Measurements (in blueprint units before geo conversion)
  measurements JSONB DEFAULT '{}', -- { area, perimeter, length, count }

  -- AI detection info
  confidence REAL,
  label TEXT,
  source TEXT DEFAULT 'ai-detected' CHECK (source IN ('ai-detected', 'manual', 'imported')),

  -- Approval workflow
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),

  -- Custom properties
  properties JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PDF SITE LINKS
-- ============================================

-- PDF to Site links (many-to-many relationship)
CREATE TABLE pdf_site_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Link metadata
  linked_by UUID REFERENCES profiles(id),
  linked_at TIMESTAMPTZ DEFAULT NOW(),

  -- How features were imported
  import_settings JSONB DEFAULT '{}', -- { scaleOverride, offsetX, offsetY, rotation }

  UNIQUE(document_id, site_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_pdf_documents_organization ON pdf_documents(organization_id);
CREATE INDEX idx_pdf_documents_status ON pdf_documents(status);
CREATE INDEX idx_pdf_documents_uploaded_by ON pdf_documents(uploaded_by);

CREATE INDEX idx_pdf_pages_document ON pdf_pages(document_id);
CREATE INDEX idx_pdf_pages_category ON pdf_pages(category);
CREATE INDEX idx_pdf_pages_analyzed ON pdf_pages(ai_analyzed);

CREATE INDEX idx_blueprint_features_page ON blueprint_features(page_id);
CREATE INDEX idx_blueprint_features_site ON blueprint_features(site_id);
CREATE INDEX idx_blueprint_features_type ON blueprint_features(object_type);
CREATE INDEX idx_blueprint_features_approved ON blueprint_features(approved);

CREATE INDEX idx_pdf_site_links_document ON pdf_site_links(document_id);
CREATE INDEX idx_pdf_site_links_site ON pdf_site_links(site_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_site_links ENABLE ROW LEVEL SECURITY;

-- PDF Documents: Organization members can CRUD
CREATE POLICY "Members can view pdf documents"
  ON pdf_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can create pdf documents"
  ON pdf_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can update pdf documents"
  ON pdf_documents FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can delete pdf documents"
  ON pdf_documents FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- PDF Pages: Inherit from document permissions
CREATE POLICY "Members can view pdf pages"
  ON pdf_pages FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM pdf_documents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage pdf pages"
  ON pdf_pages FOR ALL
  USING (
    document_id IN (
      SELECT id FROM pdf_documents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Blueprint Features: Inherit from page/document permissions
CREATE POLICY "Members can view blueprint features"
  ON blueprint_features FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM pdf_pages WHERE document_id IN (
        SELECT id FROM pdf_documents WHERE organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Members can manage blueprint features"
  ON blueprint_features FOR ALL
  USING (
    page_id IN (
      SELECT id FROM pdf_pages WHERE document_id IN (
        SELECT id FROM pdf_documents WHERE organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

-- PDF Site Links: Members of the organization can manage
CREATE POLICY "Members can view pdf site links"
  ON pdf_site_links FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM pdf_documents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage pdf site links"
  ON pdf_site_links FOR ALL
  USING (
    document_id IN (
      SELECT id FROM pdf_documents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_pdf_documents_updated_at
  BEFORE UPDATE ON pdf_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
