/**
 * Standalone notification processor
 * Run with: npx tsx scripts/process-notifications.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SendGrid
async function sendEmail(notification: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { success: false, error: 'SENDGRID_API_KEY not set' };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: notification.recipient_email }], subject: notification.subject }],
        from: { email: process.env.SENDGRID_FROM_EMAIL, name: process.env.SENDGRID_FROM_NAME },
        content: [{ type: 'text/plain', value: notification.body_text }],
      }),
    });

    if (response.status === 202) {
      return { success: true, messageId: response.headers.get('x-message-id') || `sg-${Date.now()}` };
    }

    const errorText = await response.text();
    return { success: false, error: `SendGrid error ${response.status}: ${errorText}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Twilio
async function sendSMS(notification: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not set' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('To', notification.recipient_phone);
    formData.append('From', fromNumber);
    formData.append('Body', notification.body_text);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const result = await response.json();

    if (response.ok) {
      return { success: true, messageId: result.sid };
    }

    return { success: false, error: result.message || `Twilio error: ${response.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function processNotifications() {
  console.log('\n⚙️  Processing pending notifications...\n');

  // Get pending notifications
  const { data: notifications, error } = await supabase
    .rpc('get_pending_notifications', { p_limit: 10 });

  if (error) {
    console.error('❌ Failed to get pending notifications:', error.message);
    return;
  }

  if (!notifications || notifications.length === 0) {
    console.log('📭 No pending notifications to process.');
    return;
  }

  console.log(`📬 Found ${notifications.length} pending notification(s)\n`);

  for (const notification of notifications) {
    console.log(`Processing: ${notification.channel} to ${notification.recipient_email || notification.recipient_phone}`);

    // Mark as processing
    await supabase
      .from('notification_queue')
      .update({ status: 'processing' })
      .eq('id', notification.id);

    let result: { success: boolean; messageId?: string; error?: string };

    if (notification.channel === 'email') {
      result = await sendEmail(notification);
    } else if (notification.channel === 'sms') {
      result = await sendSMS(notification);
    } else {
      result = { success: false, error: `Unknown channel: ${notification.channel}` };
    }

    if (result.success) {
      console.log(`   ✅ Sent! Message ID: ${result.messageId}`);
      await supabase.rpc('mark_notification_sent', {
        p_notification_id: notification.id,
        p_provider_message_id: result.messageId,
        p_provider_response: null,
      });
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      await supabase.rpc('mark_notification_failed', {
        p_notification_id: notification.id,
        p_error: result.error,
        p_provider_response: null,
      });
    }
  }

  // Final status
  console.log('\n📋 Final queue status:\n');
  const { data: finalStatus } = await supabase
    .from('notification_queue')
    .select('id, channel, status, recipient_email, recipient_phone')
    .order('created_at', { ascending: false })
    .limit(5);

  console.table(finalStatus);
}

processNotifications().catch(console.error);
