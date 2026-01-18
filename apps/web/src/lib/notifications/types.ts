/**
 * Notification System Types
 * Professional-grade notification queue with retry logic
 */

export type NotificationChannel = 'email' | 'sms' | 'both';

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationType =
  | 'bid_created'
  | 'bid_updated'
  | 'bid_expiring'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'maintenance_due'
  | 'payment_received'
  | 'quote_sent'
  | 'quote_viewed'
  | 'system_alert'
  | 'welcome'
  | 'password_reset'
  | 'custom';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email: string | null;
  phone: string | null;
  preferred_channel: NotificationChannel;
  enabled_types: Record<NotificationType, boolean>;
  notifications_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueueItem {
  id: string;
  user_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: NotificationChannel;
  type: NotificationType;
  priority: NotificationPriority;
  subject: string | null;
  body_text: string;
  body_html: string | null;
  template_id: string | null;
  template_data: Record<string, unknown> | null;
  status: NotificationStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
  scheduled_for: string;
  provider_message_id: string | null;
  provider_response: Record<string, unknown> | null;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

export interface NotificationLog {
  id: string;
  notification_id: string | null;
  event: string;
  channel: NotificationChannel | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  subject_template: string | null;
  body_text_template: string;
  body_html_template: string | null;
  sendgrid_template_id: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Request types for API
export interface QueueNotificationRequest {
  channel: NotificationChannel;
  type: NotificationType;
  recipient_email?: string;
  recipient_phone?: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  user_id?: string;
  priority?: NotificationPriority;
  scheduled_for?: string;
  template_slug?: string;  // Use template instead of raw content
  template_data?: Record<string, unknown>;
  reference_type?: string;
  reference_id?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueNotificationResponse {
  success: boolean;
  notification_id?: string;
  error?: string;
}

export interface ProcessNotificationsResponse {
  success: boolean;
  processed: number;
  sent: number;
  failed: number;
  errors?: string[];
}

// Provider response types
export interface SendGridResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export interface TwilioResponse {
  sid: string;
  status: string;
  dateCreated: string;
  errorCode: number | null;
  errorMessage: string | null;
}

// Email content for SendGrid
export interface EmailContent {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
}

// SMS content for Twilio
export interface SMSContent {
  to: string;
  from: string;
  body: string;
}
