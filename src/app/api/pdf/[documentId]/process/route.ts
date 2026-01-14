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

    // Check if already processed
    if (document.status === 'ready') {
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

    // Process PDF
    console.log(`Processing PDF: ${document.name} (${document.file_size} bytes)`);
    const result = await processPDF(pdfBuffer);
    console.log(`Extracted ${result.pageCount} pages`);

    // Upload page images and create records
    const pageRecords = [];

    for (const page of result.pages) {
      const pageBasePath = `pages/${documentId}/${page.pageNumber}`;
      const imagePath = `${pageBasePath}.jpg`;
      const thumbnailPath = `${pageBasePath}_thumb.jpg`;

      // Upload full image
      const { error: imageUploadError } = await supabase.storage
        .from('pdf-pages')
        .upload(imagePath, page.imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (imageUploadError) {
        console.error(`Failed to upload page ${page.pageNumber} image:`, imageUploadError);
        continue;
      }

      // Upload thumbnail
      const { error: thumbUploadError } = await supabase.storage
        .from('pdf-pages')
        .upload(thumbnailPath, page.thumbnailBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (thumbUploadError) {
        console.error(`Failed to upload page ${page.pageNumber} thumbnail:`, thumbUploadError);
      }

      pageRecords.push({
        document_id: documentId,
        page_number: page.pageNumber,
        image_path: imagePath,
        thumbnail_path: thumbnailPath,
        metadata: {
          width: page.width,
          height: page.height,
          imageSize: page.imageBuffer.length,
          thumbnailSize: page.thumbnailBuffer.length,
        },
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
        page_count: result.pageCount,
        metadata: {
          ...document.metadata,
          pdfMetadata: result.metadata,
          processedAt: new Date().toISOString(),
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
      pagesCreated: pageRecords.length,
      metadata: result.metadata,
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
