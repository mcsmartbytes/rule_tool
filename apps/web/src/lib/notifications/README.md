# Notification System

Professional-grade notification queue with retry logic, audit trail, and support for SendGrid (email) and Twilio (SMS).

## Features

- **Queue-based**: Notifications are queued and processed asynchronously
- **Retry with exponential backoff**: Failed notifications retry at 1min, 5min, 15min, 1hr
- **Dead letter handling**: Permanently failed notifications are logged for review
- **Audit trail**: Complete log of all notification events
- **Templates**: Reusable templates with variable substitution
- **User preferences**: Per-user channel and notification type preferences
- **Rate limiting**: Prevents abuse of the API
- **Quiet hours**: Respect user's preferred notification times

## Environment Variables

Add these to your `.env.local` file:

```bash
# ===========================================
# SendGrid (Email)
# ===========================================
# Get your API key from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx

# Verified sender email (must be verified in SendGrid)
SENDGRID_FROM_EMAIL=notifications@yourdomain.com
SENDGRID_FROM_NAME=Rule Tool

# ===========================================
# Twilio (SMS)
# ===========================================
# Get credentials from: https://console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio phone number (format: +15551234567)
TWILIO_FROM_NUMBER=+15551234567

# ===========================================
# Notification Processing
# ===========================================
# API key for cron job authentication (generate a secure random string)
NOTIFICATION_CRON_API_KEY=your-secure-random-string-here
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the migration to your Supabase database
supabase db push
# or
supabase migration up
```

### 2. Configure SendGrid

1. Create a SendGrid account at https://sendgrid.com
2. Verify a sender email address (Settings > Sender Authentication)
3. Create an API key (Settings > API Keys)
4. Add the API key to your environment variables

### 3. Configure Twilio

1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the console
3. Buy a phone number or use the trial number
4. Add credentials to your environment variables

### 4. Set Up Cron Job

The notification processor needs to run periodically. Options:

**Option A: Vercel Cron (Recommended for Vercel deployments)**

Already configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/notifications/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Option B: External Cron Service**

Use cron-job.org, Upstash, or similar:
```
URL: https://yourdomain.com/api/notifications/process
Method: POST
Headers: Authorization: Bearer YOUR_CRON_API_KEY
Schedule: Every 5 minutes
```

**Option C: Supabase Edge Function (if using Supabase hosting)**

See `supabase/functions/process-notifications/` for edge function implementation.

## API Endpoints

### Queue a Notification

```http
POST /api/notifications/queue
Content-Type: application/json

{
  "channel": "email",
  "type": "bid_created",
  "recipient_email": "customer@example.com",
  "subject": "New Bid Ready",
  "body_text": "Your bid is ready for review."
}
```

### Using Templates

```http
POST /api/notifications/queue
Content-Type: application/json

{
  "channel": "email",
  "type": "bid_expiring",
  "recipient_email": "customer@example.com",
  "template_slug": "bid-expiring-email",
  "template_data": {
    "project_name": "ABC Mall",
    "bid_amount": "$45,000",
    "expiry_date": "January 25, 2025"
  }
}
```

### Get Notification History

```http
GET /api/notifications/queue?user_id=xxx&limit=20&offset=0
```

### Get/Update Preferences

```http
GET /api/notifications/preferences?user_id=xxx

PUT /api/notifications/preferences
Content-Type: application/json

{
  "user_id": "xxx",
  "email": "user@example.com",
  "phone": "+15551234567",
  "preferred_channel": "email",
  "notifications_enabled": true
}
```

## Usage in Code

```typescript
import { queueNotification } from '@/lib/notifications';

// Simple email
await queueNotification({
  channel: 'email',
  type: 'bid_created',
  recipient_email: 'customer@example.com',
  subject: 'New Bid Created',
  body_text: 'A new bid has been created for your project.',
});

// With template
await queueNotification({
  channel: 'email',
  type: 'maintenance_due',
  recipient_email: 'customer@example.com',
  template_slug: 'maintenance-due-email',
  template_data: {
    site_name: 'ABC Mall',
    service_type: 'Sealcoating',
    last_service_date: 'January 2023',
    recommended_date: 'January 2025',
  },
});

// SMS
await queueNotification({
  channel: 'sms',
  type: 'bid_expiring',
  recipient_phone: '+15551234567',
  body_text: 'Your bid expires tomorrow. Take action now.',
  priority: 'high',
});

// Schedule for later
await queueNotification({
  channel: 'email',
  type: 'quote_sent',
  recipient_email: 'customer@example.com',
  subject: 'Your Quote',
  body_text: 'Thank you for your interest...',
  scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
});
```

## Available Templates

| Slug | Type | Channel | Description |
|------|------|---------|-------------|
| `bid-created` | bid_created | email | New bid notification |
| `bid-expiring-email` | bid_expiring | email | Bid expiration reminder |
| `bid-expiring-sms` | bid_expiring | sms | Bid expiration SMS |
| `maintenance-due-email` | maintenance_due | email | Maintenance reminder |
| `maintenance-due-sms` | maintenance_due | sms | Maintenance SMS |
| `quote-sent` | quote_sent | email | Quote sent confirmation |
| `welcome` | welcome | email | Welcome email |

## Monitoring

### Check Processing Status

```bash
curl -X GET "https://yourdomain.com/api/notifications/process?key=YOUR_CRON_API_KEY"
```

### View Failed Notifications

```sql
SELECT * FROM notification_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### View Notification Logs

```sql
SELECT * FROM notification_log
WHERE notification_id = 'xxx'
ORDER BY created_at;
```

## Troubleshooting

### Notifications Not Sending

1. Check that the cron job is running (`/api/notifications/process`)
2. Verify SendGrid/Twilio credentials are correct
3. Check the `notification_queue` table for `last_error`
4. Review `notification_log` for detailed event history

### Rate Limiting

The queue API is limited to 100 requests per minute per IP. If you need higher limits, adjust in `/api/notifications/queue/route.ts`.

### Retry Behavior

- Retry 1: After 3 minutes
- Retry 2: After 9 minutes
- Retry 3: After 27 minutes
- After 3 retries: Marked as `failed`

To adjust retry behavior, modify `mark_notification_failed()` in the migration.
