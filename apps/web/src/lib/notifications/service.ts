/**
 * Notification Service
 * Main service for queuing and sending notifications
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSendGridProvider } from './providers/sendgrid';
import { getTwilioProvider } from './providers/twilio';
import type {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationQueueItem,
  NotificationTemplate,
  QueueNotificationRequest,
  QueueNotificationResponse,
  ProcessNotificationsResponse,
} from './types';

export class NotificationService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Queue a notification for sending
   */
  async queueNotification(request: QueueNotificationRequest): Promise<QueueNotificationResponse> {
    try {
      let subject = request.subject;
      let bodyText = request.body_text;
      let bodyHtml = request.body_html;
      let templateId: string | null = null;

      // If using a template, load and render it
      if (request.template_slug) {
        const template = await this.getTemplate(request.template_slug);
        if (!template) {
          return { success: false, error: `Template not found: ${request.template_slug}` };
        }

        const rendered = this.renderTemplate(template, request.template_data || {});
        subject = rendered.subject || subject;
        bodyText = rendered.body_text || bodyText;
        bodyHtml = rendered.body_html || bodyHtml;
        templateId = template.sendgrid_template_id;
      }

      // Validate we have content
      if (!bodyText && !templateId) {
        return { success: false, error: 'Notification must have body_text or template' };
      }

      // Validate recipient
      if (request.channel === 'email' || request.channel === 'both') {
        if (!request.recipient_email) {
          return { success: false, error: 'Email channel requires recipient_email' };
        }
      }
      if (request.channel === 'sms' || request.channel === 'both') {
        if (!request.recipient_phone) {
          return { success: false, error: 'SMS channel requires recipient_phone' };
        }
      }

      // If channel is 'both', queue two separate notifications
      if (request.channel === 'both') {
        const emailResult = await this.queueSingleNotification({
          ...request,
          channel: 'email',
          body_text: bodyText,
          body_html: bodyHtml,
          subject,
        });

        const smsResult = await this.queueSingleNotification({
          ...request,
          channel: 'sms',
          body_text: bodyText,
        });

        if (!emailResult.success || !smsResult.success) {
          return {
            success: false,
            error: `Email: ${emailResult.error || 'OK'}, SMS: ${smsResult.error || 'OK'}`,
          };
        }

        return { success: true, notification_id: emailResult.notification_id };
      }

      return this.queueSingleNotification({
        ...request,
        body_text: bodyText,
        body_html: bodyHtml,
        subject,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async queueSingleNotification(
    request: QueueNotificationRequest & { body_text?: string; body_html?: string; subject?: string }
  ): Promise<QueueNotificationResponse> {
    const { data, error } = await this.supabase.rpc('queue_notification', {
      p_channel: request.channel,
      p_type: request.type,
      p_recipient_email: request.recipient_email || null,
      p_recipient_phone: request.recipient_phone || null,
      p_subject: request.subject || null,
      p_body_text: request.body_text || '',
      p_body_html: request.body_html || null,
      p_user_id: request.user_id || null,
      p_priority: request.priority || 'normal',
      p_scheduled_for: request.scheduled_for || new Date().toISOString(),
      p_template_id: null,
      p_template_data: request.template_data || null,
      p_reference_type: request.reference_type || null,
      p_reference_id: request.reference_id || null,
      p_metadata: request.metadata || {},
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, notification_id: data };
  }

  /**
   * Process pending notifications
   * Called by cron job or edge function
   */
  async processNotifications(limit: number = 10): Promise<ProcessNotificationsResponse> {
    const results = {
      success: true,
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Get pending notifications
      const { data: notifications, error } = await this.supabase
        .rpc('get_pending_notifications', { p_limit: limit });

      if (error) {
        return { ...results, success: false, errors: [error.message] };
      }

      if (!notifications || notifications.length === 0) {
        return results;
      }

      // Process each notification
      for (const notification of notifications as NotificationQueueItem[]) {
        results.processed++;

        // Mark as processing
        await this.supabase
          .from('notification_queue')
          .update({ status: 'processing' })
          .eq('id', notification.id);

        try {
          const sendResult = await this.sendNotification(notification);

          if (sendResult.success) {
            await this.supabase.rpc('mark_notification_sent', {
              p_notification_id: notification.id,
              p_provider_message_id: sendResult.messageId || null,
              p_provider_response: sendResult.response || null,
            });
            results.sent++;
          } else {
            await this.supabase.rpc('mark_notification_failed', {
              p_notification_id: notification.id,
              p_error: sendResult.error || 'Unknown error',
              p_provider_response: sendResult.response || null,
            });
            results.failed++;
            results.errors.push(`${notification.id}: ${sendResult.error}`);
          }
        } catch (sendError) {
          const errorMsg = sendError instanceof Error ? sendError.message : 'Unknown error';
          await this.supabase.rpc('mark_notification_failed', {
            p_notification_id: notification.id,
            p_error: errorMsg,
            p_provider_response: null,
          });
          results.failed++;
          results.errors.push(`${notification.id}: ${errorMsg}`);
        }
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { ...results, success: false, errors: [errorMessage] };
    }
  }

  /**
   * Send a single notification via the appropriate provider
   */
  private async sendNotification(notification: NotificationQueueItem): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    response?: Record<string, unknown>;
  }> {
    if (notification.channel === 'email') {
      return this.sendEmail(notification);
    } else if (notification.channel === 'sms') {
      return this.sendSMS(notification);
    }

    return { success: false, error: `Unknown channel: ${notification.channel}` };
  }

  private async sendEmail(notification: NotificationQueueItem): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    response?: Record<string, unknown>;
  }> {
    if (!notification.recipient_email) {
      return { success: false, error: 'No recipient email' };
    }

    const sendgrid = getSendGridProvider();
    const result = await sendgrid.sendEmail({
      to: notification.recipient_email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ruletool.com',
      fromName: process.env.SENDGRID_FROM_NAME || 'Rule Tool',
      subject: notification.subject || 'Notification from Rule Tool',
      text: notification.body_text,
      html: notification.body_html || undefined,
      templateId: notification.template_id || undefined,
      dynamicTemplateData: notification.template_data || undefined,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      response: result.response as Record<string, unknown> | undefined,
    };
  }

  private async sendSMS(notification: NotificationQueueItem): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    response?: Record<string, unknown>;
  }> {
    if (!notification.recipient_phone) {
      return { success: false, error: 'No recipient phone' };
    }

    const twilio = getTwilioProvider();
    const result = await twilio.sendSMS({
      to: notification.recipient_phone,
      from: process.env.TWILIO_FROM_NUMBER || '',
      body: notification.body_text,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      response: result.response as Record<string, unknown> | undefined,
    };
  }

  /**
   * Get a notification template by slug
   */
  async getTemplate(slug: string): Promise<NotificationTemplate | null> {
    const { data, error } = await this.supabase
      .from('notification_templates')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as NotificationTemplate;
  }

  /**
   * Render a template with data
   * Simple {{variable}} replacement
   */
  renderTemplate(
    template: NotificationTemplate,
    data: Record<string, unknown>
  ): { subject?: string; body_text: string; body_html?: string } {
    const render = (text: string | null): string | undefined => {
      if (!text) return undefined;

      let result = text;
      for (const [key, value] of Object.entries(data)) {
        const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        result = result.replace(placeholder, String(value ?? ''));
      }
      return result;
    };

    return {
      subject: render(template.subject_template),
      body_text: render(template.body_text_template) || '',
      body_html: render(template.body_html_template),
    };
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<{
      email: string;
      phone: string;
      preferred_channel: NotificationChannel;
      enabled_types: Record<string, boolean>;
      notifications_enabled: boolean;
      quiet_hours_start: string;
      quiet_hours_end: string;
      timezone: string;
    }>
  ) {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    userId: string,
    options?: { limit?: number; offset?: number; status?: string }
  ) {
    let query = this.supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, notifications: [] };
    }

    return { success: true, notifications: data };
  }
}

// Convenience function to get service instance
let serviceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!serviceInstance) {
    serviceInstance = new NotificationService();
  }
  return serviceInstance;
}
