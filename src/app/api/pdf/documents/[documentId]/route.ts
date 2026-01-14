import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const STORAGE_BUCKET = 'pdf-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 minutes

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signPath(supabase: ReturnType<typeof getServiceSupabase>, path: string | null) {
  if (!path) return { url: null as string | null, error: 'missing-path' as string | null };
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return { url: null as string | null, error: error.message };
  return { url: data.signedUrl, error: null as string | null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const supabase = getServiceSupabase();

    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      return NextResponse.json({ success: false, error: docError.message }, { status: 404 });
    }

    const { data: pages, error: pagesError } = await supabase
      .from('pdf_pages')
      .select('*')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (pagesError) {
      return NextResponse.json({ success: false, error: pagesError.message }, { status: 500 });
    }

    const pdfSigned = await signPath(supabase, document.storage_path);

    const pagesWithUrls = await Promise.all(
      (pages || []).map(async (p: any) => ({
        ...p,
        thumbnail_url: (await signPath(supabase, p.thumbnail_path)).url,
        image_url: (await signPath(supabase, p.image_path)).url,
      }))
    );

    return NextResponse.json({
      success: true,
      document,
      pdf_url: pdfSigned.url,
      pdf_url_error: pdfSigned.error,
      pages: pagesWithUrls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

