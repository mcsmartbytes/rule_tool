import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { buildCategorizePrompt, SYSTEM_PROMPT, PDF_PAGE_CATEGORIES } from './prompts';
import type { PDFPageCategory } from '@/lib/supabase/types';

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

function stripCodeFences(text: string): string {
  let t = text.trim();
  if (t.startsWith('```json')) t = t.slice(7);
  if (t.startsWith('```')) t = t.slice(3);
  if (t.endsWith('```')) t = t.slice(0, -3);
  return t.trim();
}

function isPDFPageCategory(v: any): v is PDFPageCategory {
  return typeof v === 'string' && (PDF_PAGE_CATEGORIES as string[]).includes(v);
}

async function downloadToBase64(
  supabase: ReturnType<typeof getServiceSupabase>,
  storagePath: string
): Promise<{ base64: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' }> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error) throw new Error(`Failed to download image: ${error.message}`);

  const ab = await data.arrayBuffer();
  const buf = Buffer.from(ab);

  // best-effort media type based on extension
  const lower = storagePath.toLowerCase();
  let mediaType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mediaType = 'image/jpeg';
  else if (lower.endsWith('.webp')) mediaType = 'image/webp';

  return { base64: buf.toString('base64'), mediaType };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Categorization not configured. Missing ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const documentId = body?.documentId as string | undefined;
    const pageIds = body?.pageIds as string[] | undefined;

    if (!documentId && (!pageIds || pageIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Provide documentId or pageIds' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const anthropic = new Anthropic({ apiKey });

    let pagesQuery = supabase.from('pdf_pages').select('*').order('page_number', { ascending: true });
    if (documentId) pagesQuery = pagesQuery.eq('document_id', documentId);
    if (pageIds?.length) pagesQuery = pagesQuery.in('id', pageIds);

    const { data: pages, error: pagesError } = await pagesQuery;
    if (pagesError) {
      return NextResponse.json({ success: false, error: pagesError.message }, { status: 500 });
    }

    const prompt = buildCategorizePrompt();
    const results: Array<{ pageId: string; category: PDFPageCategory; confidence: number }> = [];

    for (const p of pages || []) {
      const storagePath = (p.thumbnail_path || p.image_path) as string;

      const { base64, mediaType } = await downloadToBase64(supabase, storagePath);

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        continue;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(stripCodeFences(textContent.text));
      } catch {
        // Skip if response not parseable
        continue;
      }

      const category = parsed?.category;
      const confidenceRaw = parsed?.confidence;
      const confidence = typeof confidenceRaw === 'number' ? Math.max(0, Math.min(1, confidenceRaw)) : 0.5;

      if (!isPDFPageCategory(category)) {
        continue;
      }

      const { error: updateError } = await supabase
        .from('pdf_pages')
        .update({
          category,
          category_confidence: confidence,
        })
        .eq('id', p.id);

      if (!updateError) {
        results.push({ pageId: p.id, category, confidence });
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

