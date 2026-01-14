import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

// Simple PDF page count extraction without full rendering
// Uses basic PDF parsing - page count is in the trailer/catalog
async function getPageCountFromPDF(pdfBuffer: ArrayBuffer): Promise<number> {
  const bytes = new Uint8Array(pdfBuffer);
  const text = new TextDecoder('latin1').decode(bytes);

  // Look for /Count in the page tree (most reliable)
  const countMatches = text.match(/\/Count\s+(\d+)/g);
  if (countMatches && countMatches.length > 0) {
    // Get the largest count (the root page tree)
    const counts = countMatches.map(m => {
      const num = m.match(/\d+/);
      return num ? parseInt(num[0], 10) : 0;
    });
    const maxCount = Math.max(...counts);
    if (maxCount > 0) return maxCount;
  }

  // Fallback: count /Type /Page occurrences (less reliable but works)
  const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
  if (pageMatches) {
    return pageMatches.length;
  }

  // Last resort: look for /N in linearized PDFs
  const linearizedMatch = text.match(/\/N\s+(\d+)/);
  if (linearizedMatch) {
    return parseInt(linearizedMatch[1], 10);
  }

  return 0;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { documentId } = await params;

  try {
    // Get document from database
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

    // Check if already processed
    if (document.status === 'ready' && document.page_count) {
      return NextResponse.json({
        success: true,
        message: 'Document already processed',
        pageCount: document.page_count,
      });
    }

    // Update status to processing
    await supabase
      .from('pdf_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('pdf-documents')
      .download(document.storage_path);

    if (downloadError || !pdfData) {
      console.error('Download error:', downloadError);
      await supabase
        .from('pdf_documents')
        .update({ status: 'error', metadata: { ...document.metadata, error: 'Failed to download PDF' } })
        .eq('id', documentId);
      return NextResponse.json(
        { error: 'Failed to download PDF from storage' },
        { status: 500 }
      );
    }

    // Convert Blob to ArrayBuffer
    const pdfBuffer = await pdfData.arrayBuffer();

    // Get page count using simple parsing (no pdfjs worker needed)
    console.log(`Processing PDF: ${document.name} (${document.file_size} bytes)`);
    const pageCount = await getPageCountFromPDF(pdfBuffer);
    console.log(`Found ${pageCount} pages`);

    if (pageCount === 0) {
      await supabase
        .from('pdf_documents')
        .update({ status: 'error', metadata: { ...document.metadata, error: 'Could not determine page count' } })
        .eq('id', documentId);
      return NextResponse.json(
        { error: 'Could not determine page count from PDF' },
        { status: 400 }
      );
    }

    // Create placeholder page records (actual rendering happens client-side)
    const pageRecords = [];
    for (let i = 1; i <= pageCount; i++) {
      pageRecords.push({
        document_id: documentId,
        page_number: i,
        image_path: '', // Will be rendered client-side
        thumbnail_path: null,
        metadata: {},
      });
    }

    // Insert page records into database
    if (pageRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('pdf_pages')
        .insert(pageRecords);

      if (insertError) {
        console.error('Failed to insert page records:', insertError);
      }
    }

    // Update document with page count and status
    const { error: updateError } = await supabase
      .from('pdf_documents')
      .update({
        status: 'ready',
        page_count: pageCount,
        metadata: {
          ...document.metadata,
          processedAt: new Date().toISOString(),
          renderMode: 'client-side',
        },
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document:', updateError);
    }

    return NextResponse.json({
      success: true,
      documentId,
      pageCount,
      renderMode: 'client-side',
      message: 'Document processed. Pages will render in browser.',
    });

  } catch (error) {
    console.error('Processing error:', error);

    // Update document status to error
    await supabase
      .from('pdf_documents')
      .update({
        status: 'error',
        metadata: { error: error instanceof Error ? error.message : 'Processing failed' },
      })
      .eq('id', documentId);

    return NextResponse.json(
      { error: 'Failed to process PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
