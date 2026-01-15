import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

// GET: Get all pages for a document with signed URLs
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { documentId } = await params;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  try {
    // Build query
    let query = supabase
      .from('pdf_pages')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data: pages, error } = await query;

    if (error) {
      console.error('Pages query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pages' },
        { status: 500 }
      );
    }

    // Generate signed URLs for thumbnails (faster loading)
    const pagesWithUrls = await Promise.all(
      (pages || []).map(async (page) => {
        let thumbnailUrl = null;

        if (page.thumbnail_path) {
          const { data } = await supabase.storage
            .from('pdf-pages')
            .createSignedUrl(page.thumbnail_path, 3600);
          thumbnailUrl = data?.signedUrl;
        }

        return {
          id: page.id,
          pageNumber: page.page_number,
          category: page.category,
          categoryConfidence: page.category_confidence,
          aiAnalyzed: page.ai_analyzed,
          scaleInfo: page.scale_info,
          thumbnailUrl,
          metadata: page.metadata,
        };
      })
    );

    return NextResponse.json({
      success: true,
      pages: pagesWithUrls,
      total: pagesWithUrls.length,
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update page category or other metadata
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { documentId } = await params;

  try {
    const body = await request.json();
    const { pageId, category, scaleInfo } = body;

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Verify page belongs to document
    const { data: page, error: pageError } = await supabase
      .from('pdf_pages')
      .select('id')
      .eq('id', pageId)
      .eq('document_id', documentId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (category !== undefined) {
      updates.category = category;
      updates.category_confidence = 1.0; // Manual override = 100% confidence
    }
    if (scaleInfo !== undefined) {
      updates.scale_info = scaleInfo;
    }

    // Update page
    const { data: updated, error: updateError } = await supabase
      .from('pdf_pages')
      .update(updates)
      .eq('id', pageId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update page' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      page: updated,
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
