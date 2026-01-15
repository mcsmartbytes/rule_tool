import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processPDF } from '@/lib/pdf/processor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ documentId: string }>;
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

    // Check if already processed successfully
    if (document.status === 'ready' && document.page_count) {
      return NextResponse.json({
        success: true,
        message: 'Document already processed',
        pageCount: document.page_count,
      });
    }

    // Clear any existing pages if retrying after error
    if (document.status === 'error') {
      await supabase
        .from('pdf_pages')
        .delete()
        .eq('document_id', documentId);
    }

    // Update status to processing and clear error
    await supabase
      .from('pdf_documents')
      .update({ status: 'processing', error_message: null })
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

    // Process PDF - render all pages to images
    console.log(`Processing PDF: ${document.name} (${document.file_size} bytes)`);

    let result;
    try {
      result = await processPDF(Buffer.from(pdfBuffer));
    } catch (processError) {
      console.error('PDF processing error:', processError);
      await supabase
        .from('pdf_documents')
        .update({
          status: 'error',
          error_message: processError instanceof Error ? processError.message : 'Failed to render PDF pages'
        })
        .eq('id', documentId);
      return NextResponse.json(
        { error: 'Failed to render PDF pages', details: processError instanceof Error ? processError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    console.log(`Rendered ${result.pageCount} pages, uploading to storage...`);

    if (result.pageCount === 0) {
      await supabase
        .from('pdf_documents')
        .update({ status: 'error', error_message: 'PDF has no pages' })
        .eq('id', documentId);
      return NextResponse.json(
        { error: 'PDF has no pages' },
        { status: 400 }
      );
    }

    // Upload each page image and thumbnail to storage
    const pageRecords = [];
    for (const page of result.pages) {
      const imagePath = `${documentId}/page-${page.pageNumber}.jpg`;
      const thumbnailPath = `${documentId}/thumb-${page.pageNumber}.jpg`;

      // Upload full-size image
      const { error: imageError } = await supabase.storage
        .from('pdf-pages')
        .upload(imagePath, page.imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (imageError) {
        console.error(`Failed to upload page ${page.pageNumber} image:`, imageError);
        continue;
      }

      // Upload thumbnail
      const { error: thumbError } = await supabase.storage
        .from('pdf-pages')
        .upload(thumbnailPath, page.thumbnailBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (thumbError) {
        console.error(`Failed to upload page ${page.pageNumber} thumbnail:`, thumbError);
      }

      pageRecords.push({
        document_id: documentId,
        page_number: page.pageNumber,
        image_path: imagePath,
        thumbnail_path: thumbError ? null : thumbnailPath,
        metadata: {
          width: page.width,
          height: page.height,
        },
      });
    }

    console.log(`Uploaded ${pageRecords.length} pages to storage`);

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
        page_count: result.pageCount,
        metadata: {
          ...document.metadata,
          ...result.metadata,
          processedAt: new Date().toISOString(),
          renderMode: 'server-side',
        },
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document:', updateError);
    }

    return NextResponse.json({
      success: true,
      documentId,
      pageCount: result.pageCount,
      pagesUploaded: pageRecords.length,
      message: 'Document processed and pages uploaded to storage.',
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
