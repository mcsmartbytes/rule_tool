-- ============================================
-- Notification System Schema
-- Professional-grade notification queue with
-- retry logic, audit trail, and preferences
-- ============================================

-- Notification channel enum
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'both');

-- Notification status enum
CREATE TYPE notification_status AS ENUM (
  'pending',      -- Waiting to be processed
  'processing',   -- Currently being sent
  'sent',         -- Successfully sent
  'delivered',    -- Confirmed delivered (if provider supports)
  'failed',       -- Failed after all retries
  'cancelled'     -- Manually cancelled
);

-- Notification priority enum
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Notification type enum (extensible for different notification types)
CREATE TYPE notification_type AS ENUM (
  'bid_created',
  'bid_updated',
  'bid_expiring',
  'bid_accepted',
  'bid_rejected',
  'maintenance_due',
  'payment_received',
  'quote_sent',
  'quote_viewed',
  'system_alert',
  'welcome',
  'password_reset',
  'custom'
);

-- ============================================
-- User Notification Preferences
-- ============================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Contact info
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Channel preferences
  preferred_channel notification_channel DEFAULT 'email',

  -- Type-specific opt-outs (JSONB for flexibility)
  -- Example: {"bid_expiring": false, "maintenance_due": true}
  enabled_types JSONB DEFAULT '{}',

  -- Global settings
  notifications_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,  -- e.g., 22:00
  quiet_hours_end TIME,    -- e.g., 08:00
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- Notification Queue
-- Main queue table for pending notifications
-- ============================================
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient info
  user_id UUID,  -- Optional, can send to non-users
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),

  -- Notification details
  channel notification_channel NOT NULL,
  type notification_type NOT NULL DEFAULT 'custom',
  priority notification_priority DEFAULT 'normal',

  -- Content
  subject VARCHAR(255),          -- Email subject / SMS doesn't use
  body_text TEXT NOT NULL,       -- Plain text version
  body_html TEXT,                -- HTML version (email only)
  template_id VARCHAR(100),      -- SendGrid template ID (optional)
  template_data JSONB,           -- Data for template variables

  -- Status tracking
  status notification_status DEFAULT 'pending',

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),  -- When to send

  -- Provider tracking
  provider_message_id VARCHAR(255),  -- ID from SendGrid/Twilio
  provider_response JSONB,

  -- Reference to related entity (optional)
  reference_type VARCHAR(50),  -- e.g., 'bid', 'site', 'invoice'
  reference_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- ============================================
-- Notification Log (Audit Trail)
-- Immutable log of all notification events
-- ============================================
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL,

  -- Event info
  event VARCHAR(50) NOT NULL,  -- 'queued', 'processing', 'sent', 'delivered', 'failed', 'retry'

  -- Snapshot of notification at this event
  channel notification_channel,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  subject VARCHAR(255),

  -- Event details
  details JSONB,  -- Provider response, error details, etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Notification Templates
-- Reusable templates for common notifications
-- ============================================
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  slug VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'bid-expiring-reminder'
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template content
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,

  -- Email fields
  subject_template VARCHAR(255),
  body_text_template TEXT NOT NULL,
  body_html_template TEXT,

  -- SendGrid integration (optional)
  sendgrid_template_id VARCHAR(100),

  -- Template variables documentation
  -- Example: ["customer_name", "bid_amount", "expiry_date"]
  variables JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Queue processing: find pending notifications ready to send
CREATE INDEX idx_notification_queue_pending
  ON notification_queue(status, scheduled_for, priority)
  WHERE status IN ('pending', 'processing');

-- Queue processing: find notifications needing retry
CREATE INDEX idx_notification_queue_retry
  ON notification_queue(status, next_retry_at)
  WHERE status = 'pending' AND retry_count > 0;

-- User notifications lookup
CREATE INDEX idx_notification_queue_user
  ON notification_queue(user_id, created_at DESC);

-- Reference lookup (find notifications for a bid, site, etc.)
CREATE INDEX idx_notification_queue_reference
  ON notification_queue(reference_type, reference_id);

-- Log lookup by notification
CREATE INDEX idx_notification_log_notification
  ON notification_log(notification_id, created_at);

-- Preferences lookup by user
CREATE INDEX idx_notification_preferences_user
  ON notification_preferences(user_id);

-- ============================================
-- Triggers for Automatic Timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_queue_updated
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER trigger_notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER trigger_notification_templates_updated
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- ============================================
-- Function: Queue a Notification
-- Convenience function to add notifications
-- ============================================
CREATE OR REPLACE FUNCTION queue_notification(
  p_channel notification_channel,
  p_type notification_type,
  p_recipient_email VARCHAR DEFAULT NULL,
  p_recipient_phone VARCHAR DEFAULT NULL,
  p_subject VARCHAR DEFAULT NULL,
  p_body_text TEXT DEFAULT NULL,
  p_body_html TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_priority notification_priority DEFAULT 'normal',
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  p_template_id VARCHAR DEFAULT NULL,
  p_template_data JSONB DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notification_queue (
    channel, type, recipient_email, recipient_phone,
    subject, body_text, body_html, user_id, priority,
    scheduled_for, template_id, template_data,
    reference_type, reference_id, metadata
  ) VALUES (
    p_channel, p_type, p_recipient_email, p_recipient_phone,
    p_subject, p_body_text, p_body_html, p_user_id, p_priority,
    p_scheduled_for, p_template_id, p_template_data,
    p_reference_type, p_reference_id, p_metadata
  )
  RETURNING id INTO v_notification_id;

  -- Log the queue event
  INSERT INTO notification_log (notification_id, event, channel, recipient_email, recipient_phone, subject, details)
  VALUES (v_notification_id, 'queued', p_channel, p_recipient_email, p_recipient_phone, p_subject,
          jsonb_build_object('priority', p_priority, 'scheduled_for', p_scheduled_for));

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Get Pending Notifications
-- Returns notifications ready to be processed
-- ============================================
CREATE OR REPLACE FUNCTION get_pending_notifications(p_limit INTEGER DEFAULT 10)
RETURNS SETOF notification_queue AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM notification_queue
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  ORDER BY
    CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    scheduled_for ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;  -- Prevents race conditions
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Mark Notification Sent
-- ============================================
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_id UUID,
  p_provider_message_id VARCHAR DEFAULT NULL,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_queue
  SET
    status = 'sent',
    sent_at = NOW(),
    provider_message_id = p_provider_message_id,
    provider_response = p_provider_response
  WHERE id = p_notification_id;

  -- Log the sent event
  INSERT INTO notification_log (notification_id, event, details)
  VALUES (p_notification_id, 'sent',
          jsonb_build_object('provider_message_id', p_provider_message_id, 'provider_response', p_provider_response));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Mark Notification Failed
-- Handles retry logic with exponential backoff
-- ============================================
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_notification_id UUID,
  p_error TEXT,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Get current retry info
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM notification_queue WHERE id = p_notification_id;

  v_retry_count := v_retry_count + 1;

  IF v_retry_count >= v_max_retries THEN
    -- Max retries reached, mark as permanently failed
    UPDATE notification_queue
    SET
      status = 'failed',
      retry_count = v_retry_count,
      last_error = p_error,
      provider_response = COALESCE(p_provider_response, provider_response)
    WHERE id = p_notification_id;

    INSERT INTO notification_log (notification_id, event, details)
    VALUES (p_notification_id, 'failed',
            jsonb_build_object('error', p_error, 'retry_count', v_retry_count, 'max_retries_reached', true));
  ELSE
    -- Calculate next retry with exponential backoff: 1min, 5min, 15min, 1hr
    v_next_retry := NOW() + (POWER(3, v_retry_count) * INTERVAL '1 minute');

    UPDATE notification_queue
    SET
      status = 'pending',
      retry_count = v_retry_count,
      next_retry_at = v_next_retry,
      last_error = p_error,
      provider_response = COALESCE(p_provider_response, provider_response)
    WHERE id = p_notification_id;

    INSERT INTO notification_log (notification_id, event, details)
    VALUES (p_notification_id, 'retry_scheduled',
            jsonb_build_object('error', p_error, 'retry_count', v_retry_count, 'next_retry_at', v_next_retry));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Seed Default Templates
-- ============================================
INSERT INTO notification_templates (slug, name, description, type, channel, subject_template, body_text_template, body_html_template, variables) VALUES
(
  'bid-created',
  'Bid Created',
  'Notification when a new bid is created',
  'bid_created',
  'email',
  'New Bid Created: {{project_name}}',
  'A new bid has been created for {{project_name}}.\n\nAmount: {{bid_amount}}\nCustomer: {{customer_name}}\n\nView the bid at: {{bid_url}}',
  NULL,
  '["project_name", "bid_amount", "customer_name", "bid_url"]'
),
(
  'bid-expiring-email',
  'Bid Expiring Soon (Email)',
  'Email reminder when a bid is about to expire',
  'bid_expiring',
  'email',
  'Bid Expiring Soon: {{project_name}}',
  'Your bid for {{project_name}} will expire on {{expiry_date}}.\n\nAmount: {{bid_amount}}\nCustomer: {{customer_name}}\n\nTake action now: {{bid_url}}',
  NULL,
  '["project_name", "bid_amount", "customer_name", "expiry_date", "bid_url"]'
),
(
  'bid-expiring-sms',
  'Bid Expiring Soon (SMS)',
  'SMS reminder when a bid is about to expire',
  'bid_expiring',
  'sms',
  NULL,
  'Rule Tool: Bid for {{project_name}} expires {{expiry_date}}. Amount: {{bid_amount}}. Review now.',
  NULL,
  '["project_name", "bid_amount", "expiry_date"]'
),
(
  'maintenance-due-email',
  'Maintenance Due (Email)',
  'Email reminder for scheduled maintenance',
  'maintenance_due',
  'email',
  'Maintenance Due: {{site_name}}',
  'Scheduled maintenance is due for {{site_name}}.\n\nService: {{service_type}}\nLast Service: {{last_service_date}}\nRecommended: {{recommended_date}}\n\nCreate a new estimate: {{estimate_url}}',
  NULL,
  '["site_name", "service_type", "last_service_date", "recommended_date", "estimate_url"]'
),
(
  'maintenance-due-sms',
  'Maintenance Due (SMS)',
  'SMS reminder for scheduled maintenance',
  'maintenance_due',
  'sms',
  NULL,
  'Rule Tool: Maintenance due for {{site_name}}. Service: {{service_type}}. Last done: {{last_service_date}}.',
  NULL,
  '["site_name", "service_type", "last_service_date"]'
),
(
  'quote-sent',
  'Quote Sent to Customer',
  'Confirmation when a quote is sent',
  'quote_sent',
  'email',
  'Quote Sent: {{project_name}}',
  'Your quote for {{project_name}} has been sent to {{customer_email}}.\n\nAmount: {{quote_amount}}\nValid Until: {{valid_until}}\n\nTrack status: {{quote_url}}',
  NULL,
  '["project_name", "customer_email", "quote_amount", "valid_until", "quote_url"]'
),
(
  'welcome',
  'Welcome Email',
  'Welcome message for new users',
  'welcome',
  'email',
  'Welcome to Rule Tool!',
  'Welcome to Rule Tool, {{user_name}}!\n\nYou''re now ready to start creating estimates faster than ever.\n\nGet started: {{dashboard_url}}\n\nNeed help? Reply to this email or visit our support center.',
  NULL,
  '["user_name", "dashboard_url"]'
);

-- ============================================
-- RLS Policies (Row Level Security)
-- ============================================

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Preferences: Users can only see/edit their own
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Queue: Users can see their own notifications
CREATE POLICY "Users can view own notifications" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Log: Users can see logs for their notifications
CREATE POLICY "Users can view own notification logs" ON notification_log
  FOR SELECT USING (
    notification_id IN (SELECT id FROM notification_queue WHERE user_id = auth.uid())
  );

-- Templates: Everyone can read active templates
CREATE POLICY "Anyone can view active templates" ON notification_templates
  FOR SELECT USING (is_active = true);

-- Service role bypass for backend processing
-- (The Edge Functions use service role key which bypasses RLS)
