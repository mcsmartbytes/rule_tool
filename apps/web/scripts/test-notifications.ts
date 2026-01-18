/**
 * Test script for notification system
 * Run with: npx tsx scripts/test-notifications.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from the web app directory
config({ path: resolve(__dirname, '../.env.local') });

// Manually set up environment for standalone script
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEmailNotification() {
  console.log('\n📧 Testing Email Notification...\n');

  const { data, error } = await supabase.rpc('queue_notification', {
    p_channel: 'email',
    p_type: 'custom',
    p_recipient_email: 'info@mcsmartbytes.com',
    p_subject: 'Rule Tool - Test Email',
    p_body_text: 'This is a test email from the Rule Tool notification system.\n\nIf you received this, your email notifications are working correctly!',
    p_priority: 'high',
  });

  if (error) {
    console.error('❌ Failed to queue email:', error.message);
    return null;
  }

  console.log('✅ Email queued successfully');
  console.log('   Notification ID:', data);
  return data;
}

async function testSMSNotification(phoneNumber: string) {
  console.log('\n📱 Testing SMS Notification...\n');

  const { data, error } = await supabase.rpc('queue_notification', {
    p_channel: 'sms',
    p_type: 'custom',
    p_recipient_phone: phoneNumber,
    p_body_text: 'Rule Tool Test: Your SMS notifications are working!',
    p_priority: 'high',
  });

  if (error) {
    console.error('❌ Failed to queue SMS:', error.message);
    return null;
  }

  console.log('✅ SMS queued successfully');
  console.log('   Notification ID:', data);
  return data;
}

async function checkQueueStatus() {
  console.log('\n📋 Checking notification queue...\n');

  const { data, error } = await supabase
    .from('notification_queue')
    .select('id, channel, status, recipient_email, recipient_phone, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Failed to check queue:', error.message);
    return;
  }

  console.log('Recent notifications:');
  console.table(data);
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Rule Tool Notification System Test');
  console.log('='.repeat(50));

  // Test email
  await testEmailNotification();

  // Test SMS - using the Twilio number for testing (will send to yourself)
  // In production, you'd use the customer's number
  const testPhone = process.argv[2] || '+16592123738'; // Default to your Twilio number
  await testSMSNotification(testPhone);

  // Check queue
  await checkQueueStatus();

  console.log('\n' + '='.repeat(50));
  console.log('  Notifications queued! Now processing...');
  console.log('='.repeat(50));

  // Now trigger the processing
  console.log('\n⚙️  Processing notifications...\n');

  const processUrl = 'http://localhost:3000/api/notifications/process';

  try {
    const response = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTIFICATION_CRON_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Processing complete!');
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Sent: ${result.sent}`);
      console.log(`   Failed: ${result.failed}`);

      if (result.errors && result.errors.length > 0) {
        console.log('\n   Errors:');
        result.errors.forEach((err: string) => console.log(`   - ${err}`));
      }
    } else {
      console.log('❌ Processing failed:', result.error);
    }
  } catch (err) {
    console.log('\n⚠️  Could not reach local server.');
    console.log('   Make sure the dev server is running: npm run dev');
    console.log('\n   Alternatively, notifications will be processed by the cron job.');
  }

  // Final status check
  await checkQueueStatus();
}

main().catch(console.error);
