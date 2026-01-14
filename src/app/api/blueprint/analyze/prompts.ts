import type { SiteObjectType } from '@/lib/supabase/types';

const OBJECT_TYPES: SiteObjectType[] = [
  'parking-surface',
  'drive-lane',
  'loading-area',
  'sidewalk',
  'plaza',
  'curb',
  'gutter',
  'edge-line',
  'crack',
  'drain',
  'bollard',
  'light-pole',
  'sign',
  'building-footprint',
  'median',
  'island',
  'ada-ramp',
  'ada-space',
  'fire-lane',
  'crosswalk',
  'parking-stall',
  'stall-group',
  'directional-arrow',
  'symbol',
];

export const SYSTEM_PROMPT = `You are an expert construction estimator assistant.
You extract site-relevant features from blueprint / plan pages.

Return STRICT JSON only. No markdown.`;

export function buildBlueprintAnalyzePrompt(): string {
  return `Analyze this blueprint page image and detect site/parking-lot relevant features.

## Output requirements
Return ONLY a JSON array. Each element must be:
{
  "object_type": "<one of the allowed object types>",
  "sub_type": "<optional subtype string>",
  "confidence": <number 0.0 to 1.0>,
  "label": "<short label>",
  "geometry": {
    "type": "Polygon" | "LineString" | "Point",
    "coordinates": ... pixel coordinates ...
  }
}

## Allowed object types
${OBJECT_TYPES.map((t) => `- ${t}`).join('\n')}

## Coordinate system
- Use PIXEL coordinates in the image.
- (0,0) is top-left.

## Geometry rules
- Polygon coordinates must be [[[x,y], ...]] and polygons MUST be closed.
- For LineString use [[x,y], ...]
- For Point use [x,y]

## What to prioritize (parking/pavement contractors)
- building-footprint (exclude from takeoff)
- parking-surface / drive-lane / loading-area
- sidewalks, curbs, gutters, islands/medians
- striping/markings: parking-stall, ada-space, crosswalk, directional-arrow, fire-lane, edge-line, symbol

## Filters
- Only include confidence >= 0.5
- Ignore title blocks unless they contain a clear scale bar (do not attempt scale extraction yet)

Return JSON only.`;
}

