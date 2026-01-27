/**
 * Notification System
 * Professional-grade notification queue with retry logic,
 * SendGrid (email) and Twilio (SMS) integration.
 *
 * @example
 * ```typescript
 * import { getNotificationService, queueNotification } from '@/lib/notifications';
 *
 * // Queue a simple email
 * await queueNotification({
 *   channel: 'email',
 *   type: 'bid_created',
 *   recipient_email: 'customer@example.com',
 *   subject: 'New Bid Ready',
 *   body_text: 'Your bid is ready for review.',
 * });
 *
 * // Queue using a template
 * await queueNotification({
 *   channel: 'email',
 *   type: 'bid_expiring',
 *   recipient_email: 'customer@example.com',
 *   template_slug: 'bid-expiring-email',
 *   template_data: {
 *     project_name: 'ABC Mall',
 *     bid_amount: '$45,000',
 *     expiry_date: 'January 25, 2025',
 *   },
 * });
 *
 * // Queue SMS
 * await queueNotification({
 *   channel: 'sms',
 *   type: 'maintenance_due',
 *   recipient_phone: '+15551234567',
 *   body_text: 'Maintenance due for ABC Mall parking lot.',
 * });
 *
 * // Queue both email and SMS
 * await queueNotification({
 *   channel: 'both',
 *   type: 'bid_accepted',
 *   recipient_email: 'customer@example.com',
 *   recipient_phone: '+15551234567',
 *   body_text: 'Your bid has been accepted!',
 * });
 * ```
 */

export * from './types';
export * from './service';
export { getSendGridProvider } from './providers/sendgrid';
export { getTwilioProvider } from './providers/twilio';

// Convenience function for quick notification queueing
import { getNotificationService } from './service';
import type { QueueNotificationRequest, QueueNotificationResponse } from './types';

export async function queueNotification(
  request: QueueNotificationRequest
): Promise<QueueNotificationResponse> {
  const service = getNotificationService();
  return service.queueNotification(request);
}
