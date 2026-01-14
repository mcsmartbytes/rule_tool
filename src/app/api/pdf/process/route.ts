import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import path from 'node:path';

export const runtime = 'nodejs';

const STORAGE_BUCKET = 'pdf-documents';

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function startWorker(documentId: string) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'process-pdf.mjs');
  const child = spawn(process.execPath, [scriptPath, documentId], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      PDF_STORAGE_BUCKET: STORAGE_BUCKET,
    },
  });
  child.unref();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const documentId = body?.documentId as string | undefined;

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Missing documentId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Mark as processing (best-effort)
    await supabase
      .from('pdf_documents')
      .update({ status: 'processing', error_message: null })
      .eq('id', documentId);

    // Spawn background worker process
    startWorker(documentId);

    return NextResponse.json({ success: true, started: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

