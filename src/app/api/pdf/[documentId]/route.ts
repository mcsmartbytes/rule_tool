import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

// GET: Get document details with pages
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { documentId } = await params;

  try {
    // Get document
    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get pages
    const { data: pages, error: pagesError } = await supabase
      .from('pdf_pages')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (pagesError) {
      console.error('Pages query error:', pagesError);
    }

    // Generate signed URLs for page images
    const pagesWithUrls = await Promise.all(
      (pages || []).map(async (page) => {
        let imageUrl = null;
        let thumbnailUrl = null;

        if (page.image_path) {
          const { data: imageData } = await supabase.storage
            .from('pdf-pages')
            .createSignedUrl(page.image_path, 3600); // 1 hour
          imageUrl = imageData?.signedUrl;
        }

        if (page.thumbnail_path) {
          const { data: thumbData } = await supabase.storage
            .from('pdf-pages')
            .createSignedUrl(page.thumbnail_path, 3600);
          thumbnailUrl = thumbData?.signedUrl;
        }

        return {
          ...page,
          imageUrl,
          thumbnailUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      document,
      pages: pagesWithUrls,
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete document and all associated data
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { documentId } = await params;

  try {
    // Get document to find storage path
    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get pages to delete their images
    const { data: pages } = await supabase
      .from('pdf_pages')
      .select('image_path, thumbnail_path')
      .eq('document_id', documentId);

    // Delete page images from storage
    if (pages && pages.length > 0) {
      const pathsToDelete = pages.flatMap((p) => [
        p.image_path,
        p.thumbnail_path,
      ].filter(Boolean));

      if (pathsToDelete.length > 0) {
        await supabase.storage
          .from('pdf-pages')
          .remove(pathsToDelete);
      }
    }

    // Delete PDF from storage
    if (document.storage_path) {
      await supabase.storage
        .from('pdf-documents')
        .remove([document.storage_path]);
    }

    // Delete document (cascades to pages and features)
    const { error: deleteError } = await supabase
      .from('pdf_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
