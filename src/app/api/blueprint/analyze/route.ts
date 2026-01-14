import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { buildBlueprintAnalyzePrompt, SYSTEM_PROMPT } from './prompts';
import type { SiteObjectType } from '@/lib/supabase/types';
import { mapToObjectType } from '@/lib/ai/geo-utils';

export const runtime = 'nodejs';

const STORAGE_BUCKET = 'pdf-documents';

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

function stripCodeFences(text: string): string {
  let t = text.trim();
  if (t.startsWith('```json')) t = t.slice(7);
  if (t.startsWith('```')) t = t.slice(3);
  if (t.endsWith('```')) t = t.slice(0, -3);
  return t.trim();
}

function closePolygonIfNeeded(coords: any): any {
  // Expect coords = [[[x,y], ...]]
  try {
    if (!Array.isArray(coords) || !Array.isArray(coords[0])) return coords;
    const ring = coords[0];
    if (!Array.isArray(ring) || ring.length < 3) return coords;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (Array.isArray(first) && Array.isArray(last) && (first[0] !== last[0] || first[1] !== last[1])) {
      return [[...ring, first]];
    }
    return coords;
  } catch {
    return coords;
  }
}

async function downloadToBase64(
  supabase: ReturnType<typeof getServiceSupabase>,
  storagePath: string
): Promise<{ base64: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' }> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error) throw new Error(`Failed to download image: ${error.message}`);

  const ab = await data.arrayBuffer();
  const buf = Buffer.from(ab);

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
        { success: false, error: 'Blueprint analysis not configured. Missing ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const pageId = body?.pageId as string | undefined;

    if (!pageId) {
      return NextResponse.json({ success: false, error: 'Missing pageId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: page, error: pageError } = await supabase
      .from('pdf_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ success: false, error: pageError?.message || 'Page not found' }, { status: 404 });
    }

    const storagePath = (page.image_path || page.thumbnail_path) as string;
    const { base64, mediaType } = await downloadToBase64(supabase, storagePath);

    const anthropic = new Anthropic({ apiKey });
    const prompt = buildBlueprintAnalyzePrompt();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ success: false, error: 'No response from AI model' }, { status: 500 });
    }

    let features: any[] = [];
    try {
      const parsed = JSON.parse(stripCodeFences(textContent.text));
      if (!Array.isArray(parsed)) throw new Error('Response is not an array');
      features = parsed;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response (invalid JSON).' },
        { status: 500 }
      );
    }

    const inserts: any[] = [];
    for (const f of features) {
      const mapped: SiteObjectType | null =
        (typeof f?.object_type === 'string' ? mapToObjectType(f.object_type) : null) ||
        (typeof f?.type === 'string' ? mapToObjectType(f.type) : null);

      if (!mapped) continue;
      const confidence = typeof f?.confidence === 'number' ? f.confidence : 0;
      if (confidence < 0.5) continue;

      const geom = f?.geometry;
      if (!geom || typeof geom !== 'object' || !geom.type || geom.coordinates == null) continue;

      const geometry =
        geom.type === 'Polygon'
          ? { ...geom, coordinates: closePolygonIfNeeded(geom.coordinates) }
          : geom;

      inserts.push({
        page_id: pageId,
        site_id: null,
        object_type: mapped,
        sub_type: typeof f?.sub_type === 'string' ? f.sub_type : typeof f?.subType === 'string' ? f.subType : null,
        geometry,
        measurements: {},
        confidence,
        label: typeof f?.label === 'string' ? f.label : null,
        source: 'ai-detected',
        approved: false,
        properties: {
          pageNumber: page.page_number,
          category: page.category,
        },
      });
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('blueprint_features').insert(inserts);
      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }
    }

    await supabase
      .from('pdf_pages')
      .update({ ai_analyzed: true, analyzed_at: new Date().toISOString() })
      .eq('id', pageId);

    return NextResponse.json({
      success: true,
      inserted: inserts.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

