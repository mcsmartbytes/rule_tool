/**
 * HVAC Projects API Route
 * POST /api/hvac/projects - Create new HVAC project
 * GET /api/hvac/projects - List HVAC projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { HvacProjectStatus, HvacBuildingType, HvacProjectType } from '@/lib/hvac/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Map form building types to database building types
function mapBuildingType(formType: string): HvacBuildingType | undefined {
  const mapping: Record<string, HvacBuildingType> = {
    'office': 'office',
    'retail': 'retail',
    'healthcare': 'healthcare',
    'education': 'school',
    'industrial': 'industrial',
    'warehouse': 'warehouse',
    'residential_multi': 'multi_family',
    'hospitality': 'other',
    'restaurant': 'restaurant',
    'data_center': 'industrial',
    'laboratory': 'other',
    'mixed_use': 'mixed_use',
    'other': 'other',
  };
  return mapping[formType] || 'other';
}

// Map form construction type to project type
function mapProjectType(constructionType: string): HvacProjectType | undefined {
  const mapping: Record<string, HvacProjectType> = {
    'new': 'new_construction',
    'renovation': 'retrofit',
    'addition': 'add_on',
  };
  return mapping[constructionType];
}

// GET: List HVAC projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') as HvacProjectStatus | null;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('hvac_projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,client_name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projects,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new HVAC project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Build project data matching the hvac_projects table schema
    const projectData = {
      user_id: body.userId || null,
      name: body.name,
      project_number: body.project_number || null,
      description: body.notes || null,

      // Location
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip_code || null,

      // Building info
      building_type: body.building_type ? mapBuildingType(body.building_type) : null,
      total_sqft: body.square_footage ? parseInt(body.square_footage) : null,
      num_floors: body.num_floors ? parseInt(body.num_floors) : null,

      // Project type
      project_type: body.construction_type ? mapProjectType(body.construction_type) : null,

      // Climate & design
      climate_zone: body.climate_zone || null,
      heating_design_temp: body.design_heating_temp ? parseInt(body.design_heating_temp) : null,
      cooling_design_temp: body.design_cooling_temp ? parseInt(body.design_cooling_temp) : null,

      // Client info
      client_name: body.client_contact || null,
      client_company: body.client_name || null,
      client_email: body.client_email || null,

      // Bid info
      bid_due_date: body.due_date || null,

      // Status
      status: 'draft' as HvacProjectStatus,
    };

    const { data: project, error } = await supabase
      .from('hvac_projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create project', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project,
    });

  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
