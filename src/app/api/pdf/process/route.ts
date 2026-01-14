import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export const runtime = 'nodejs';

const STORAGE_BUCKET = 'pdf-documents';
const RENDER_SCALE = Number(process.env.PDF_RENDER_SCALE || 2);
const THUMB_WIDTH = Number(process.env.PDF_THUMB_WIDTH || 512);
const MAX_PAGES_PER_RUN = Number(process.env.PDF_MAX_PAGES_PER_RUN || 12);
const MAX_RUN_MS = Number(process.env.PDF_MAX_RUN_MS || 25_000);

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

function pageImagePath(documentId: string, pageNumber: number) {
  const p = String(pageNumber).padStart(4, '0');
  return `pages/${documentId}/page_${p}.png`;
}

function pageThumbPath(documentId: string, pageNumber: number) {
  const p = String(pageNumber).padStart(4, '0');
  return `thumbs/${documentId}/page_${p}.jpg`;
}

async function downloadPdf(supabase: ReturnType<typeof getServiceSupabase>, storagePath: string) {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error) throw new Error(`Failed to download PDF: ${error.message}`);
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

async function uploadBuffer(
  supabase: ReturnType<typeof getServiceSupabase>,
  storagePath: string,
  buffer: Buffer,
  contentType: string
) {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Failed to upload ${storagePath}: ${error.message}`);
}

async function upsertPage(
  supabase: ReturnType<typeof getServiceSupabase>,
  row: Record<string, any>
) {
  const { error } = await supabase.from('pdf_pages').upsert(row, { onConflict: 'document_id,page_number' });
  if (error) throw new Error(`Failed to upsert pdf_pages: ${error.message}`);
}

export async function POST(request: NextRequest) {
  let documentId: string | undefined;
  try {
    const body = await request.json().catch(() => null);
    documentId = body?.documentId as string | undefined;

    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Missing documentId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Mark as processing (best-effort)
    await supabase
      .from('pdf_documents')
      .update({ status: 'processing', error_message: null })
      .eq('id', documentId);

    // Load document row
    const { data: doc, error: docError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('id', documentId)
      .single();
    if (docError || !doc) {
      return NextResponse.json({ success: false, error: docError?.message || 'Document not found' }, { status: 404 });
    }

    const startedAt = Date.now();
    const pdfBuffer = await downloadPdf(supabase, doc.storage_path);

    const task = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
    });
    const pdf = await task.promise;

    const totalPages = pdf.numPages;
    const currentProcessed = Number(doc?.metadata?.processing?.processedPages || 0) || 0;

    const startPage = Math.min(Math.max(1, currentProcessed + 1), totalPages);
    const endPage = Math.min(totalPages, startPage + MAX_PAGES_PER_RUN - 1);

    await supabase
      .from('pdf_documents')
      .update({
        page_count: totalPages,
        metadata: {
          ...(doc.metadata || {}),
          processing: {
            phase: 'rendering',
            startedAt: doc?.metadata?.processing?.startedAt || new Date().toISOString(),
            totalPages,
            processedPages: currentProcessed,
            renderScale: RENDER_SCALE,
            thumbWidth: THUMB_WIDTH,
          },
        },
      })
      .eq('id', documentId);

    let lastPageRendered = currentProcessed;
    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
      if (Date.now() - startedAt > MAX_RUN_MS) break;

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });

      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d') as any;

      await page.render({ canvasContext: ctx as any, viewport, intent: 'display' } as any).promise;

      const pngBuffer = canvas.toBuffer('image/png');
      const thumbBuffer = await sharp(pngBuffer)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      const imagePath = pageImagePath(documentId, pageNumber);
      const thumbPath = pageThumbPath(documentId, pageNumber);

      await uploadBuffer(supabase, imagePath, pngBuffer, 'image/png');
      await uploadBuffer(supabase, thumbPath, thumbBuffer, 'image/jpeg');

      await upsertPage(supabase, {
        document_id: documentId,
        page_number: pageNumber,
        image_path: imagePath,
        thumbnail_path: thumbPath,
        metadata: {
          width: Math.ceil(viewport.width),
          height: Math.ceil(viewport.height),
          renderScale: RENDER_SCALE,
        },
      });

      lastPageRendered = pageNumber;
    }

    const isComplete = lastPageRendered >= totalPages;
    await supabase
      .from('pdf_documents')
      .update({
        status: isComplete ? 'ready' : 'processing',
        page_count: totalPages,
        metadata: {
          ...(doc.metadata || {}),
          processing: {
            phase: isComplete ? 'complete' : 'rendering',
            startedAt: doc?.metadata?.processing?.startedAt || new Date().toISOString(),
            totalPages,
            processedPages: lastPageRendered,
            renderScale: RENDER_SCALE,
            thumbWidth: THUMB_WIDTH,
          },
        },
      })
      .eq('id', documentId);

    try {
      await task.destroy();
    } catch {}

    return NextResponse.json({ success: true, started: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // Best-effort: persist error on the document so UI can display it
    try {
      if (documentId) {
        const supabase = getServiceSupabase();
        await supabase
          .from('pdf_documents')
          .update({ status: 'error', error_message: message })
          .eq('id', documentId);
      }
    } catch {}
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

