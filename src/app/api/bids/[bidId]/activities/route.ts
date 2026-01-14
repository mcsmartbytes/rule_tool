import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { BidActivityInsert } from '@/lib/supabase/types';

export const runtime = 'nodejs';

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface RouteParams {
  params: Promise<{ bidId: string }>;
}

// GET: List activities for a bid
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = getServiceSupabase();
    const { bidId } = await params;

    const { data: activities, error } = await supabase
      .from('bid_activities')
      .select('*')
      .eq('bid_id', bidId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      activities,
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new activity
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = getServiceSupabase();
    const { bidId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.activityType || !body.title) {
      return NextResponse.json(
        { error: 'Activity type and title are required' },
        { status: 400 }
      );
    }

    const activityData: BidActivityInsert = {
      bid_id: bidId,
      activity_type: body.activityType,
      title: body.title,
      description: body.description || null,
      user_id: body.userId || null,
      metadata: body.metadata || {},
    };

    const { data: activity, error } = await supabase
      .from('bid_activities')
      .insert(activityData)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      activity,
    });

  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
