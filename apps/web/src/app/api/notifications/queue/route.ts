/**
 * Notification Queue API
 * POST: Queue a new notification
 * GET: Get notification history for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/notifications/service';
import type { QueueNotificationRequest } from '@/lib/notifications/types';

// Rate limiting: simple in-memory store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body: QueueNotificationRequest = await request.json();

    // Validate required fields
    if (!body.channel) {
      return NextResponse.json(
        { error: 'Missing required field: channel' },
        { status: 400 }
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    // Validate channel-specific requirements
    if (body.channel === 'email' || body.channel === 'both') {
      if (!body.recipient_email) {
        return NextResponse.json(
          { error: 'Email channel requires recipient_email' },
          { status: 400 }
        );
      }
    }

    if (body.channel === 'sms' || body.channel === 'both') {
      if (!body.recipient_phone) {
        return NextResponse.json(
          { error: 'SMS channel requires recipient_phone' },
          { status: 400 }
        );
      }
    }

    // Must have content or template
    if (!body.body_text && !body.template_slug) {
      return NextResponse.json(
        { error: 'Must provide body_text or template_slug' },
        { status: 400 }
      );
    }

    const service = getNotificationService();
    const result = await service.queueNotification(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      notification_id: result.notification_id,
      message: 'Notification queued successfully',
    });
  } catch (error) {
    console.error('Notification queue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      );
    }

    const service = getNotificationService();
    const result = await service.getNotificationHistory(userId, { limit, offset, status });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
    });
  } catch (error) {
    console.error('Notification history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
