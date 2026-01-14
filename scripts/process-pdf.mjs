/**
 * PDF processing worker
 *
 * Usage:
 *   node scripts/process-pdf.mjs <documentId>
 *
 * Responsibilities:
 * - Download PDF from Supabase Storage (bucket: pdf-documents)
 * - Render each page to a PNG and a thumbnail JPEG
 * - Upload rendered images back to Storage
 * - Upsert rows into `pdf_pages`
 * - Update `pdf_documents` status/page_count/metadata
 */
import { createClient } from '@supabase/supabase-js';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import process from 'node:process';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
 
const STORAGE_BUCKET = 'pdf-documents';
const RENDER_SCALE = Number(process.env.PDF_RENDER_SCALE || 2);
const THUMB_WIDTH = Number(process.env.PDF_THUMB_WIDTH || 512);
 
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
 
async function downloadPdf(supabase, storagePath) {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error) throw new Error(`Failed to download PDF: ${error.message}`);
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}
 
function pageImagePath(documentId, pageNumber) {
  const p = String(pageNumber).padStart(4, '0');
  return `pages/${documentId}/page_${p}.png`;
}
 
function pageThumbPath(documentId, pageNumber) {
  const p = String(pageNumber).padStart(4, '0');
  return `thumbs/${documentId}/page_${p}.jpg`;
}
 
async function uploadBuffer(supabase, storagePath, buffer, contentType) {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Failed to upload ${storagePath}: ${error.message}`);
}
 
async function updateDoc(supabase, documentId, updates) {
  const { error } = await supabase
    .from('pdf_documents')
    .update(updates)
    .eq('id', documentId);
  if (error) throw new Error(`Failed to update pdf_documents: ${error.message}`);
}
 
async function upsertPage(supabase, row) {
  const { error } = await supabase
    .from('pdf_pages')
    .upsert(row, { onConflict: 'document_id,page_number' });
  if (error) throw new Error(`Failed to upsert pdf_pages: ${error.message}`);
}
 
async function main() {
  const documentId = process.argv[2];
  if (!documentId) {
    console.error('Usage: node scripts/process-pdf.mjs <documentId>');
    process.exit(2);
  }
 
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY fallback)');
 
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
 
  // Disable worker in Node rendering context
  // (pdf.worker is for browser; Node uses a "fake worker" by default but disabling is safer here)
  try {
    // Fetch document row
    const { data: doc, error: docError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('id', documentId)
      .single();
    if (docError) throw new Error(`Failed to load pdf_documents row: ${docError.message}`);
 
    const startedAt = new Date().toISOString();
    await updateDoc(supabase, documentId, {
      status: 'processing',
      error_message: null,
      metadata: {
        ...(doc.metadata || {}),
        processing: { phase: 'rendering', startedAt },
      },
    });
 
    // Download PDF bytes
    const pdfBuffer = await downloadPdf(supabase, doc.storage_path);
 
    // Load PDF
    const task = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      disableWorker: true,
    });
    const pdf = await task.promise;
 
    const totalPages = pdf.numPages;
    await updateDoc(supabase, documentId, {
      page_count: totalPages,
      metadata: {
        ...(doc.metadata || {}),
        processing: {
          phase: 'rendering',
          startedAt,
          totalPages,
          processedPages: 0,
          renderScale: RENDER_SCALE,
          thumbWidth: THUMB_WIDTH,
        },
      },
    });
 
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
 
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d');
 
      await page.render({
        canvasContext: ctx,
        viewport,
        intent: 'display',
      }).promise;
 
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
 
      await updateDoc(supabase, documentId, {
        metadata: {
          ...(doc.metadata || {}),
          processing: {
            phase: 'rendering',
            startedAt,
            totalPages,
            processedPages: pageNumber,
            renderScale: RENDER_SCALE,
            thumbWidth: THUMB_WIDTH,
          },
        },
      });
    }
 
    await updateDoc(supabase, documentId, {
      status: 'ready',
      error_message: null,
      metadata: {
        ...(doc.metadata || {}),
        processing: {
          phase: 'complete',
          completedAt: new Date().toISOString(),
          totalPages,
        },
      },
    });
 
    // Best-effort: close pdf document
    try {
      await task.destroy();
    } catch {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[process-pdf] error for ${documentId}:`, message);
 
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await updateDoc(supabase, documentId, {
          status: 'error',
          error_message: message,
          metadata: {
            processing: {
              phase: 'error',
              errorAt: new Date().toISOString(),
              error: message,
            },
          },
        });
      }
    } catch (e2) {
      console.error('[process-pdf] failed to write error status:', e2);
    }
 
    process.exitCode = 1;
  }
}
 
await main();
