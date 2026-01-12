-- Bid Dashboard Tables
-- Migration for bid pipeline, activities, RFIs, and notifications

-- ============================================
-- BIDS
-- ============================================

-- Bids (pipeline tracking for projects)
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  bid_number TEXT, -- Optional internal reference number

  -- Customer info
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_company TEXT,
  customer_address TEXT,

  -- Pipeline stage
  stage TEXT DEFAULT 'lead' CHECK (stage IN (
    'lead', 'qualifying', 'proposal', 'submitted',
    'negotiation', 'won', 'lost', 'archived'
  )),
  stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  loss_reason TEXT, -- Populated when stage = 'lost'

  -- Team assignments
  owner_id UUID REFERENCES profiles(id),
  team_members UUID[] DEFAULT '{}',

  -- Important dates
  bid_due_date TIMESTAMPTZ,
  site_visit_date TIMESTAMPTZ,
  project_start_date TIMESTAMPTZ,
  project_end_date TIMESTAMPTZ,

  -- Financials
  estimated_value NUMERIC(12,2),
  final_value NUMERIC(12,2),
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),

  -- Priority and tags
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  tags TEXT[] DEFAULT '{}',

  -- Source tracking
  source TEXT, -- How the lead came in: 'website', 'referral', 'cold-call', etc.

  -- Custom fields
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BID ACTIVITIES
-- ============================================

-- Bid Activities (timeline of events)
CREATE TABLE bid_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),

  -- Activity type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'stage_change', 'note', 'call', 'email', 'meeting',
    'site_visit', 'rfi', 'addendum', 'file_upload',
    'estimate_updated', 'team_change', 'created'
  )),

  -- Activity content
  title TEXT NOT NULL,
  description TEXT,

  -- Type-specific data
  metadata JSONB DEFAULT '{}',
  -- For stage_change: { from: 'lead', to: 'proposal', reason: '...' }
  -- For call/meeting: { duration: 30, outcome: '...' }
  -- For file_upload: { fileName: '...', fileSize: 1234, storagePath: '...' }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BID RFIS
-- ============================================

-- RFIs (Request for Information)
CREATE TABLE bid_rfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,

  -- RFI number (auto-increment per bid)
  number INTEGER NOT NULL,

  -- Content
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,

  -- Tracking
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  answered_by UUID REFERENCES profiles(id),
  answered_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed', 'void')),
  due_date TIMESTAMPTZ,

  -- Attachments
  attachments JSONB DEFAULT '[]', -- [{ name, path, size }]

  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BID ADDENDA
-- ============================================

-- Addenda (contract modifications)
CREATE TABLE bid_addenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,

  -- Addendum number
  number INTEGER NOT NULL,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  issued_date TIMESTAMPTZ DEFAULT NOW(),

  -- Document
  document_path TEXT,
  document_name TEXT,

  -- Acknowledgment tracking
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),

  -- Impact
  cost_impact NUMERIC(12,2), -- Positive = increase, negative = decrease
  schedule_impact INTEGER, -- Days: positive = delay, negative = acceleration

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BID NOTIFICATIONS
-- ============================================

-- Notifications (in-app alerts)
CREATE TABLE bid_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
    'due_date_reminder', 'due_date_passed', 'rfi_created', 'rfi_answered',
    'addendum_issued', 'stage_change', 'assignment', 'mention',
    'estimate_ready', 'site_visit_reminder'
  )),

  -- Content
  title TEXT NOT NULL,
  message TEXT,

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Action
  action_url TEXT,

  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BID DOCUMENTS
-- ============================================

-- Documents attached to bids
CREATE TABLE bid_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),

  -- File info
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Categorization
  category TEXT CHECK (category IN (
    'proposal', 'contract', 'plans', 'specs', 'photos',
    'correspondence', 'insurance', 'permits', 'other'
  )),

  -- Version tracking
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES bid_documents(id),

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Bids
CREATE INDEX idx_bids_organization ON bids(organization_id);
CREATE INDEX idx_bids_site ON bids(site_id);
CREATE INDEX idx_bids_stage ON bids(stage);
CREATE INDEX idx_bids_owner ON bids(owner_id);
CREATE INDEX idx_bids_due_date ON bids(bid_due_date);
CREATE INDEX idx_bids_priority ON bids(priority);

-- Activities
CREATE INDEX idx_bid_activities_bid ON bid_activities(bid_id);
CREATE INDEX idx_bid_activities_user ON bid_activities(user_id);
CREATE INDEX idx_bid_activities_type ON bid_activities(activity_type);
CREATE INDEX idx_bid_activities_created ON bid_activities(created_at DESC);

-- RFIs
CREATE INDEX idx_bid_rfis_bid ON bid_rfis(bid_id);
CREATE INDEX idx_bid_rfis_status ON bid_rfis(status);
CREATE INDEX idx_bid_rfis_due_date ON bid_rfis(due_date);

-- Addenda
CREATE INDEX idx_bid_addenda_bid ON bid_addenda(bid_id);
CREATE INDEX idx_bid_addenda_acknowledged ON bid_addenda(acknowledged);

-- Notifications
CREATE INDEX idx_bid_notifications_user ON bid_notifications(user_id);
CREATE INDEX idx_bid_notifications_bid ON bid_notifications(bid_id);
CREATE INDEX idx_bid_notifications_read ON bid_notifications(read);
CREATE INDEX idx_bid_notifications_created ON bid_notifications(created_at DESC);

-- Documents
CREATE INDEX idx_bid_documents_bid ON bid_documents(bid_id);
CREATE INDEX idx_bid_documents_category ON bid_documents(category);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_addenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_documents ENABLE ROW LEVEL SECURITY;

-- Bids: Organization members can CRUD
CREATE POLICY "Members can view bids"
  ON bids FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can create bids"
  ON bids FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can update bids"
  ON bids FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Members can delete bids"
  ON bids FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Bid Activities: Inherit from bid permissions
CREATE POLICY "Members can view bid activities"
  ON bid_activities FOR SELECT
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage bid activities"
  ON bid_activities FOR ALL
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Bid RFIs: Inherit from bid permissions
CREATE POLICY "Members can view bid rfis"
  ON bid_rfis FOR SELECT
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage bid rfis"
  ON bid_rfis FOR ALL
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Bid Addenda: Inherit from bid permissions
CREATE POLICY "Members can view bid addenda"
  ON bid_addenda FOR SELECT
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage bid addenda"
  ON bid_addenda FOR ALL
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Bid Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications"
  ON bid_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON bid_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- System can create notifications for any user in the org
CREATE POLICY "Members can create notifications"
  ON bid_notifications FOR INSERT
  WITH CHECK (
    bid_id IS NULL OR bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Bid Documents: Inherit from bid permissions
CREATE POLICY "Members can view bid documents"
  ON bid_documents FOR SELECT
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage bid documents"
  ON bid_documents FOR ALL
  USING (
    bid_id IN (
      SELECT id FROM bids WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_bids_updated_at
  BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bid_rfis_updated_at
  BEFORE UPDATE ON bid_rfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bid_addenda_updated_at
  BEFORE UPDATE ON bid_addenda
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate RFI number within a bid
CREATE OR REPLACE FUNCTION generate_rfi_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO NEW.number
    FROM bid_rfis
    WHERE bid_id = NEW.bid_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_rfi_number
  BEFORE INSERT ON bid_rfis
  FOR EACH ROW EXECUTE FUNCTION generate_rfi_number();

-- Auto-generate Addendum number within a bid
CREATE OR REPLACE FUNCTION generate_addendum_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO NEW.number
    FROM bid_addenda
    WHERE bid_id = NEW.bid_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_addendum_number
  BEFORE INSERT ON bid_addenda
  FOR EACH ROW EXECUTE FUNCTION generate_addendum_number();

-- Auto-create activity on stage change
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO bid_activities (bid_id, activity_type, title, metadata)
    VALUES (
      NEW.id,
      'stage_change',
      'Stage changed to ' || NEW.stage,
      jsonb_build_object('from', OLD.stage, 'to', NEW.stage)
    );
    NEW.stage_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_bid_stage_change
  BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION log_stage_change();
