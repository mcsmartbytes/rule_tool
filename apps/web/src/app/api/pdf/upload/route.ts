import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for storage operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
];

// Map MIME types to file categories
const FILE_CATEGORIES: Record<string, 'pdf' | 'image'> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/tiff': 'image',
};

// Extract page count from PDF buffer without rendering
function getPageCountFromPDF(pdfBuffer: ArrayBuffer): number {
  const bytes = new Uint8Array(pdfBuffer);
  const text = new TextDecoder('latin1').decode(bytes);

  // Look for /Count in the page tree (most reliable)
  const countMatches = text.match(/\/Count\s+(\d+)/g);
  if (countMatches && countMatches.length > 0) {
    const counts = countMatches.map(m => {
      const num = m.match(/\d+/);
      return num ? parseInt(num[0], 10) : 0;
    });
    const maxCount = Math.max(...counts);
    if (maxCount > 0) return maxCount;
  }

  // Fallback: count /Type /Page occurrences
  const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
  if (pageMatches) {
    return pageMatches.length;
  }

  // Last resort: look for /N in linearized PDFs
  const linearizedMatch = text.match(/\/N\s+(\d+)/);
  if (linearizedMatch) {
    return parseInt(linearizedMatch[1], 10);
  }

  return 1; // Default to 1 page if we can't determine
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const organizationId = formData.get('organizationId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, PNG, JPG, TIFF.' },
        { status: 400 }
      );
    }

    const fileCategory = FILE_CATEGORIES[file.type] || 'pdf';

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Generate unique storage path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `documents/${timestamp}_${safeName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdf-documents')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Determine page count BEFORE creating the document record
    // This avoids the "stuck in processing" issue entirely
    const isImage = fileCategory === 'image';
    let pageCount = 1;

    if (!isImage) {
      // For PDFs, extract page count from the buffer we already have
      pageCount = getPageCountFromPDF(arrayBuffer);
      console.log(`PDF ${file.name}: detected ${pageCount} pages`);
    }

    const renderMode = isImage ? 'direct-image' : 'client-side';

    // Create document record with final status (no intermediate "processing" state)
    const { data: document, error: dbError } = await supabase
      .from('pdf_documents')
      .insert({
        organization_id: organizationId,
        name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        status: 'ready', // Set to ready immediately since processing is inline
        page_count: pageCount,
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          fileCategory: fileCategory,
          uploadedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          renderMode,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('pdf-documents').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // Create page records inline
    const pageRecords = [];
    for (let i = 1; i <= pageCount; i++) {
      pageRecords.push({
        document_id: document.id,
        page_number: i,
        image_path: isImage
          ? `image:${document.id}:${storagePath}` // Direct image reference
          : `client-render:${document.id}:${i}`, // PDF client-side rendering marker
        thumbnail_path: null,
        metadata: {
          renderMode,
          fileCategory,
        },
      });
    }

    if (pageRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('pdf_pages')
        .insert(pageRecords);

      if (insertError) {
        console.error('Failed to insert page records:', insertError);
        // Don't fail the whole upload, just log it
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        status: 'ready',
        fileSize: document.file_size,
        pageCount: pageCount,
      },
      message: `File uploaded and processed. ${pageCount} page(s) found.`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List documents for organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    let query = supabase
      .from('pdf_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents,
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
