/**
 * Blueprint AI Analysis API Route
 * POST /api/blueprint/analyze
 *
 * Comprehensive blueprint analysis using Claude Vision:
 * - Area/room detection
 * - Dimension extraction (OCR)
 * - Material callout parsing
 * - Scale detection
 * - Building footprint for satellite alignment
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintAnalysisPrompt,
  buildQuickAreaPrompt,
  buildAlignmentPrompt,
} from './prompts';
import type {
  BlueprintAnalysisRequest,
  BlueprintAnalysisResult,
  DetectedArea,
  DetectedDimension,
  DetectedMaterial,
  ScaleInfo,
  FootprintInfo,
  DetectedLinearFeature,
} from '@/lib/blueprint/analysis-types';

// Re-export types for convenience
export type {
  BlueprintAnalysisRequest,
  BlueprintAnalysisResult,
  DetectedArea,
  DetectedDimension,
  DetectedMaterial,
  ScaleInfo,
  FootprintInfo,
  DetectedLinearFeature,
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse<BlueprintAnalysisResult>> {
  const startTime = Date.now();

  try {
    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          documentId: '',
          pageNumber: 0,
          processingTimeMs: Date.now() - startTime,
          error: 'AI analysis not configured. Missing API key.',
        },
        { status: 500 }
      );
    }

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        {
          success: false,
          documentId: '',
          pageNumber: 0,
          processingTimeMs: Date.now() - startTime,
          error: 'Rate limit exceeded. Please wait before trying again.',
        },
        { status: 429 }
      );
    }

    // Parse request
    const body: BlueprintAnalysisRequest = await request.json();
    const { documentId, pageNumber, imageDataUrl, analysisType = 'full' } = body;

    if (!documentId || !pageNumber) {
      return NextResponse.json(
        {
          success: false,
          documentId: documentId || '',
          pageNumber: pageNumber || 0,
          processingTimeMs: Date.now() - startTime,
          error: 'Missing required fields: documentId, pageNumber',
        },
        { status: 400 }
      );
    }

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .select('name, metadata')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        {
          success: false,
          documentId,
          pageNumber,
          processingTimeMs: Date.now() - startTime,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Get page info
    const { data: page, error: pageError } = await supabase
      .from('pdf_pages')
      .select('*')
      .eq('document_id', documentId)
      .eq('page_number', pageNumber)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        {
          success: false,
          documentId,
          pageNumber,
          processingTimeMs: Date.now() - startTime,
          error: 'Page not found',
        },
        { status: 404 }
      );
    }

    // Get image data
    let imageData: string;
    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/jpeg';

    if (imageDataUrl) {
      // Use provided client-rendered image
      const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mediaType = match[1] as typeof mediaType;
        imageData = match[2];
      } else {
        imageData = imageDataUrl;
      }
    } else {
      // This would require server-rendered images which we don't have
      // For now, return error asking for client-rendered image
      return NextResponse.json(
        {
          success: false,
          documentId,
          pageNumber,
          processingTimeMs: Date.now() - startTime,
          error: 'Image data required. Please provide imageDataUrl from client-rendered page.',
        },
        { status: 400 }
      );
    }

    // Build prompt based on analysis type
    const context = {
      pageNumber,
      imageWidth: page.metadata?.width || 2550, // Default letter width at 300dpi
      imageHeight: page.metadata?.height || 3300,
      documentName: document.name,
      category: page.category,
    };

    let prompt: string;
    switch (analysisType) {
      case 'areas-only':
        prompt = buildQuickAreaPrompt(context);
        break;
      case 'alignment-only':
        prompt = buildAlignmentPrompt(context);
        break;
      case 'full':
      default:
        prompt = buildBlueprintAnalysisPrompt(context);
    }

    // Call Claude Vision API
    const anthropic = new Anthropic({ apiKey });

    console.log(`Analyzing blueprint: ${document.name}, page ${pageNumber}, type: ${analysisType}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: BLUEPRINT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        {
          success: false,
          documentId,
          pageNumber,
          processingTimeMs: Date.now() - startTime,
          error: 'No response from AI model',
        },
        { status: 500 }
      );
    }

    // Parse JSON response
    let parsedResult: Record<string, unknown>;
    try {
      let jsonText = textContent.text.trim();
      // Clean markdown code blocks
      if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
      if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
      if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
      jsonText = jsonText.trim();

      parsedResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json(
        {
          success: false,
          documentId,
          pageNumber,
          processingTimeMs: Date.now() - startTime,
          error: 'Failed to parse AI response',
        },
        { status: 500 }
      );
    }

    // Store analysis results in database
    const analysisRecord = {
      document_id: documentId,
      page_number: pageNumber,
      analysis_type: analysisType,
      results: parsedResult,
      created_at: new Date().toISOString(),
    };

    // Try to save to blueprint_analysis table (may not exist yet)
    try {
      await supabase.from('blueprint_analysis').insert(analysisRecord);
    } catch {
      // Table may not exist, continue without saving
      console.log('Could not save analysis to database (table may not exist)');
    }

    // Build response based on analysis type
    const result: BlueprintAnalysisResult = {
      success: true,
      documentId,
      pageNumber,
      processingTimeMs: Date.now() - startTime,
    };

    if (analysisType === 'areas-only') {
      // Quick area response is just an array
      result.areas = Array.isArray(parsedResult)
        ? (parsedResult as DetectedArea[])
        : (parsedResult.areas as DetectedArea[]) || [];
    } else if (analysisType === 'alignment-only') {
      result.footprint = parsedResult as unknown as FootprintInfo;
    } else {
      // Full analysis
      result.scale = parsedResult.scale as ScaleInfo;
      result.areas = (parsedResult.areas as DetectedArea[]) || [];
      result.dimensions = (parsedResult.dimensions as DetectedDimension[]) || [];
      result.materials = (parsedResult.materials as DetectedMaterial[]) || [];
      result.footprint = parsedResult.footprint as FootprintInfo;
      result.linearFeatures = (parsedResult.linearFeatures as DetectedLinearFeature[]) || [];
      result.pageType = parsedResult.pageType as string;
      result.summary = parsedResult.summary as string;
    }

    console.log(
      `Blueprint analysis complete: ${result.areas?.length || 0} areas, ${result.dimensions?.length || 0} dimensions, ${result.materials?.length || 0} materials`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Blueprint analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        documentId: '',
        pageNumber: 0,
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}
