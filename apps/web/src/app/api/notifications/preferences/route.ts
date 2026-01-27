/**
 * Notification Preferences API
 * GET: Get user notification preferences
 * PUT: Update user notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/notifications/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      );
    }

    const service = getNotificationService();
    const preferences = await service.getPreferences(userId);

    if (!preferences) {
      // Return default preferences if none exist
      return NextResponse.json({
        success: true,
        preferences: {
          user_id: userId,
          email: null,
          phone: null,
          preferred_channel: 'email',
          enabled_types: {},
          notifications_enabled: true,
          quiet_hours_start: null,
          quiet_hours_end: null,
          timezone: 'America/New_York',
        },
        is_default: true,
      });
    }

    return NextResponse.json({
      success: true,
      preferences,
      is_default: false,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, ...preferences } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (preferences.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(preferences.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate phone format if provided (basic validation)
    if (preferences.phone) {
      const phoneDigits = preferences.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    // Validate channel if provided
    if (preferences.preferred_channel) {
      const validChannels = ['email', 'sms', 'both'];
      if (!validChannels.includes(preferences.preferred_channel)) {
        return NextResponse.json(
          { error: 'Invalid preferred_channel. Must be: email, sms, or both' },
          { status: 400 }
        );
      }
    }

    // Validate timezone if provided
    if (preferences.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: preferences.timezone });
      } catch {
        return NextResponse.json(
          { error: 'Invalid timezone' },
          { status: 400 }
        );
      }
    }

    const service = getNotificationService();
    const result = await service.updatePreferences(user_id, preferences);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: result.data,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
