import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { BidUpdate, BidStage } from '@/lib/supabase/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ bidId: string }>;
}

// GET: Get single bid with related data
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { bidId } = await params;

    // Get bid with site info
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('*, sites(id, name, address, city, state)')
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Get related data in parallel
    const [activitiesResult, rfisResult, addendaResult, documentsResult] = await Promise.all([
      supabase
        .from('bid_activities')
        .select('*')
        .eq('bid_id', bidId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('bid_rfis')
        .select('*')
        .eq('bid_id', bidId)
        .order('number', { ascending: true }),
      supabase
        .from('bid_addenda')
        .select('*')
        .eq('bid_id', bidId)
        .order('number', { ascending: true }),
      supabase
        .from('bid_documents')
        .select('*')
        .eq('bid_id', bidId)
        .order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
      success: true,
      bid,
      activities: activitiesResult.data || [],
      rfis: rfisResult.data || [],
      addenda: addendaResult.data || [],
      documents: documentsResult.data || [],
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update bid
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { bidId } = await params;
    const body = await request.json();

    // Get current bid for comparison
    const { data: currentBid } = await supabase
      .from('bids')
      .select('stage, name')
      .eq('id', bidId)
      .single();

    if (!currentBid) {
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: BidUpdate = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.bidNumber !== undefined) updates.bid_number = body.bidNumber;
    if (body.customerName !== undefined) updates.customer_name = body.customerName;
    if (body.customerEmail !== undefined) updates.customer_email = body.customerEmail;
    if (body.customerPhone !== undefined) updates.customer_phone = body.customerPhone;
    if (body.customerCompany !== undefined) updates.customer_company = body.customerCompany;
    if (body.customerAddress !== undefined) updates.customer_address = body.customerAddress;
    if (body.stage !== undefined) updates.stage = body.stage;
    if (body.lossReason !== undefined) updates.loss_reason = body.lossReason;
    if (body.ownerId !== undefined) updates.owner_id = body.ownerId;
    if (body.teamMembers !== undefined) updates.team_members = body.teamMembers;
    if (body.bidDueDate !== undefined) updates.bid_due_date = body.bidDueDate;
    if (body.siteVisitDate !== undefined) updates.site_visit_date = body.siteVisitDate;
    if (body.projectStartDate !== undefined) updates.project_start_date = body.projectStartDate;
    if (body.projectEndDate !== undefined) updates.project_end_date = body.projectEndDate;
    if (body.estimatedValue !== undefined) updates.estimated_value = body.estimatedValue;
    if (body.finalValue !== undefined) updates.final_value = body.finalValue;
    if (body.probability !== undefined) updates.probability = body.probability;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.source !== undefined) updates.source = body.source;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.siteId !== undefined) updates.site_id = body.siteId;

    const { data: bid, error } = await supabase
      .from('bids')
      .update(updates)
      .eq('id', bidId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update bid' },
        { status: 500 }
      );
    }

    // Log stage change activity (handled by trigger, but we can add extra info)
    if (body.stage && body.stage !== currentBid.stage) {
      // Activity is auto-created by trigger, but we can update with more context
      if (body.stage === 'lost' && body.lossReason) {
        await supabase.from('bid_activities').insert({
          bid_id: bidId,
          activity_type: 'note',
          title: 'Loss reason recorded',
          description: body.lossReason,
          metadata: { previousStage: currentBid.stage },
        });
      }
    }

    return NextResponse.json({
      success: true,
      bid,
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Archive bid (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { bidId } = await params;

    // Soft delete by changing stage to archived
    const { data: bid, error } = await supabase
      .from('bids')
      .update({ stage: 'archived' as BidStage })
      .eq('id', bidId)
      .select()
      .single();

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to archive bid' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bid archived successfully',
      bid,
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
