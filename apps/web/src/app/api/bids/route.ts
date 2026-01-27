import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { BidInsert, BidStage, BidPriority } from '@/lib/supabase/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: List bids with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const stage = searchParams.get('stage') as BidStage | null;
    const priority = searchParams.get('priority') as BidPriority | null;
    const ownerId = searchParams.get('ownerId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('bids')
      .select('*, sites(name, address)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (stage) {
      query = query.eq('stage', stage);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,customer_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: bids, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bids' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bids,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new bid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Bid name is required' },
        { status: 400 }
      );
    }

    const bidData: BidInsert = {
      organization_id: body.organizationId || null,
      site_id: body.siteId || null,
      name: body.name,
      description: body.description || null,
      bid_number: body.bidNumber || null,
      customer_name: body.customerName || null,
      customer_email: body.customerEmail || null,
      customer_phone: body.customerPhone || null,
      customer_company: body.customerCompany || null,
      customer_address: body.customerAddress || null,
      stage: body.stage || 'lead',
      loss_reason: null,
      owner_id: body.ownerId || null,
      team_members: body.teamMembers || [],
      bid_due_date: body.bidDueDate || null,
      site_visit_date: body.siteVisitDate || null,
      project_start_date: body.projectStartDate || null,
      project_end_date: body.projectEndDate || null,
      estimated_value: body.estimatedValue || null,
      final_value: null,
      probability: body.probability || 50,
      priority: body.priority || 'medium',
      tags: body.tags || [],
      source: body.source || null,
      metadata: body.metadata || {},
    };

    const { data: bid, error } = await supabase
      .from('bids')
      .insert(bidData)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create bid' },
        { status: 500 }
      );
    }

    // Create initial activity
    await supabase.from('bid_activities').insert({
      bid_id: bid.id,
      activity_type: 'created',
      title: 'Bid created',
      description: `Bid "${bid.name}" was created`,
      metadata: {},
    });

    return NextResponse.json({
      success: true,
      bid,
    });

  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
