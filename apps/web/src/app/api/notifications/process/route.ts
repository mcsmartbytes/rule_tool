/**
 * Notification Processing API
 * POST: Process pending notifications (called by cron/scheduled job)
 *
 * This endpoint should be called periodically to process the notification queue.
 * Recommended: Every 1-5 minutes via Vercel Cron, Supabase Edge Function, or external cron.
 *
 * Security: Protected by API key to prevent unauthorized triggering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/notifications/service';

// API key for cron job authentication
const CRON_API_KEY = process.env.NOTIFICATION_CRON_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    // Also check for Vercel Cron secret
    const cronSecret = request.headers.get('x-vercel-cron-secret');

    // Validate authentication
    if (!CRON_API_KEY) {
      console.warn('NOTIFICATION_CRON_API_KEY not set - allowing request for development');
    } else if (apiKey !== CRON_API_KEY && cronSecret !== CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get processing options from body (optional)
    let limit = 10;
    try {
      const body = await request.json();
      if (body.limit && typeof body.limit === 'number') {
        limit = Math.min(body.limit, 50); // Cap at 50 to prevent overload
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    const service = getNotificationService();
    const result = await service.processNotifications(limit);

    // Log results for monitoring
    console.log(`Notification processing complete:`, {
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors?.length || 0,
    });

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Notification processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support GET for simple health checks / manual triggers
export async function GET(request: NextRequest) {
  try {
    // Check for API key in query string for simple manual triggers
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');

    if (CRON_API_KEY && apiKey !== CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const service = getNotificationService();
    const result = await service.processNotifications(10);

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Notification processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
