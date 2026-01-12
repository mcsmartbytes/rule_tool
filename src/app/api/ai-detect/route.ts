/**
 * AI Detection API Route
 * POST /api/ai-detect
 *
 * Accepts a map canvas image and returns detected features as GeoJSON
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildDetectionPrompt, SYSTEM_PROMPT } from './prompts';
import { convertRawFeatures, calculateScale } from '@/lib/ai/geo-utils';
import type { AIDetectRequest, AIDetectResponse, RawAIFeature } from '@/lib/ai/types';

// Rate limiting (simple in-memory, replace with Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI detection not configured. Missing API key.' },
        { status: 500 }
      );
    }

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body: AIDetectRequest = await request.json();
    const { image, bounds, zoom, imageWidth, imageHeight, industry } = body;

    // Validate required fields
    if (!image || !bounds || !zoom || !imageWidth || !imageHeight) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: image, bounds, zoom, imageWidth, imageHeight' },
        { status: 400 }
      );
    }

    // Check zoom level
    if (zoom < 17) {
      return NextResponse.json(
        { success: false, error: 'Please zoom in closer for accurate detection (zoom 18+)' },
        { status: 400 }
      );
    }

    // Calculate scale for prompt context
    const centerLat = (bounds.north + bounds.south) / 2;
    const scale = calculateScale(zoom, centerLat);

    // Build the detection prompt
    const prompt = buildDetectionPrompt({
      zoom,
      imageWidth,
      imageHeight,
      scale,
      industry,
    });

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Prepare image data (remove data URL prefix if present)
    let imageData = image;
    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png';

    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mediaType = match[1] as typeof mediaType;
        imageData = match[2];
      }
    }

    // Call Claude Vision API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
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
        { success: false, error: 'No response from AI model' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let rawFeatures: RawAIFeature[];
    try {
      // Clean the response - remove markdown code blocks if present
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      rawFeatures = JSON.parse(jsonText);

      if (!Array.isArray(rawFeatures)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse AI response. The model returned invalid JSON.',
        },
        { status: 500 }
      );
    }

    // Convert pixel coordinates to geographic coordinates
    const features = convertRawFeatures(rawFeatures, imageWidth, imageHeight, bounds);

    const processingTimeMs = Date.now() - startTime;

    const result: AIDetectResponse = {
      success: true,
      features,
      processingTimeMs,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI detection error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `AI detection failed: ${errorMessage}`,
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
