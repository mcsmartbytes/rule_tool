/**
 * AI Blueprint Analysis Prompts
 *
 * Comprehensive prompts for:
 * 1. Area/room detection and measurement
 * 2. Dimension extraction (OCR)
 * 3. Material callout parsing
 * 4. Scale detection
 * 5. Building footprint for satellite alignment
 */

export const BLUEPRINT_SYSTEM_PROMPT = `You are an expert construction blueprint analyst AI. You can:
- Identify and measure areas, rooms, and spaces from architectural drawings
- Read dimensions, measurements, and scales from blueprints
- Extract material specifications from callouts and annotations
- Detect building footprints for site alignment
- Understand standard architectural symbols and conventions

You provide structured JSON output that can be directly used for construction estimating.
Be precise with measurements and conservative with confidence scores.`;

export interface BlueprintAnalysisContext {
  pageNumber: number;
  imageWidth: number;
  imageHeight: number;
  documentName: string;
  category?: string;
}

export function buildBlueprintAnalysisPrompt(context: BlueprintAnalysisContext): string {
  return `Analyze this construction blueprint/plan image comprehensively.

## IMAGE CONTEXT
- Document: ${context.documentName}
- Page: ${context.pageNumber}
- Image dimensions: ${context.imageWidth} x ${context.imageHeight} pixels
${context.category ? `- Category: ${context.category}` : ''}

## ANALYSIS TASKS

### 1. SCALE DETECTION
Find and read the scale indicator on this drawing.
- Look for scale bars, text like "1/4" = 1'-0"", "Scale: 1:50", etc.
- If found, calculate pixels-per-foot or pixels-per-meter
- If no scale found, estimate based on typical door widths (3ft) or standard elements

### 2. AREA DETECTION
Identify all enclosed areas/rooms/spaces:
- Rooms (bedrooms, bathrooms, kitchens, offices, etc.)
- Outdoor areas (patios, decks, driveways, parking)
- Utility spaces (closets, storage, mechanical)
- For each area, provide:
  - Boundary polygon (pixel coordinates)
  - Label/name if visible
  - Estimated square footage (using detected scale)
  - Room type classification

### 3. DIMENSION EXTRACTION (OCR)
Read ALL dimension text visible on the drawing:
- Linear dimensions (wall lengths, room sizes)
- Area callouts (e.g., "450 SF")
- Height dimensions
- Setback distances
- For each dimension, provide:
  - The text value as written
  - Numeric value and unit (parsed)
  - Location on drawing (pixel coordinates)
  - What it measures (if determinable)

### 4. MATERIAL CALLOUTS
Extract all material specifications and annotations:
- Flooring types ("Hardwood", "Tile", "Carpet")
- Wall materials ("4" CMU", "2x4 wood frame")
- Concrete specs ("4" concrete slab", "6" foundation")
- Roofing materials
- Finishes and coatings
- For each callout, provide:
  - Material description
  - Location/area it applies to
  - Quantity if specified

### 5. BUILDING FOOTPRINT
Identify the main building outline for satellite alignment:
- Exterior walls outline
- Overall building dimensions
- Orientation indicators (North arrow)
- Property lines if visible
- Key reference points (corners, entries)

### 6. LINEAR FEATURES
Detect linear elements:
- Walls (interior and exterior)
- Curbs and edges
- Property lines
- Utility runs

## OUTPUT FORMAT

Return a JSON object with this structure:

\`\`\`json
{
  "scale": {
    "detected": true,
    "scaleText": "1/4\\" = 1'-0\\"",
    "pixelsPerFoot": 48,
    "confidence": 0.9
  },
  "areas": [
    {
      "id": "area-1",
      "type": "room",
      "subType": "bedroom",
      "label": "Master Bedroom",
      "polygon": [[x1,y1], [x2,y2], ...],
      "areaSqFt": 180,
      "confidence": 0.85
    }
  ],
  "dimensions": [
    {
      "id": "dim-1",
      "text": "14'-6\\"",
      "value": 14.5,
      "unit": "feet",
      "position": [x, y],
      "measures": "room width",
      "confidence": 0.95
    }
  ],
  "materials": [
    {
      "id": "mat-1",
      "material": "4\\" concrete slab",
      "category": "concrete",
      "appliesTo": "garage floor",
      "areaId": "area-3",
      "quantity": null,
      "confidence": 0.8
    }
  ],
  "footprint": {
    "polygon": [[x1,y1], [x2,y2], ...],
    "widthFt": 65,
    "depthFt": 42,
    "northArrow": { "x": 100, "y": 50, "direction": 45 },
    "referencePoints": [
      { "name": "Front Entry", "position": [x, y] }
    ],
    "confidence": 0.9
  },
  "linearFeatures": [
    {
      "id": "line-1",
      "type": "wall",
      "subType": "exterior",
      "points": [[x1,y1], [x2,y2]],
      "lengthFt": 25,
      "confidence": 0.85
    }
  ],
  "pageType": "floor-plan",
  "summary": "Main floor plan showing 3BR/2BA, approx 1,850 SF"
}
\`\`\`

## CRITICAL RULES

1. All coordinates are in PIXELS from top-left (0,0)
2. Polygons must be closed (first point = last point)
3. Include confidence scores (0.0 to 1.0) for all detections
4. Parse dimensions to numeric values with units
5. If scale cannot be determined, estimate and note low confidence
6. Return ONLY valid JSON, no explanations

Analyze the blueprint now and return the JSON.`;
}

/**
 * Lighter prompt for quick area-only detection
 */
export function buildQuickAreaPrompt(context: BlueprintAnalysisContext): string {
  return `Quickly identify the main areas/rooms in this blueprint.

Image: ${context.imageWidth} x ${context.imageHeight} pixels
Document: ${context.documentName}, Page ${context.pageNumber}

Return JSON array of detected areas:
\`\`\`json
[
  {
    "label": "Living Room",
    "type": "room",
    "polygon": [[x1,y1], [x2,y2], [x3,y3], [x1,y1]],
    "estimatedSqFt": 320,
    "confidence": 0.8
  }
]
\`\`\`

Only return the JSON array, no explanations. Coordinates in pixels.`;
}

/**
 * Prompt for satellite alignment
 */
export function buildAlignmentPrompt(context: BlueprintAnalysisContext): string {
  return `Extract the building footprint from this blueprint for satellite imagery alignment.

Image: ${context.imageWidth} x ${context.imageHeight} pixels

I need:
1. The exterior building outline as a polygon (pixel coordinates)
2. Any north arrow direction (degrees from up)
3. Key reference points (main entry, corners)
4. Overall building dimensions if readable

Return JSON:
\`\`\`json
{
  "footprint": [[x1,y1], [x2,y2], ...],
  "northArrowDegrees": 0,
  "widthFt": null,
  "depthFt": null,
  "referencePoints": [
    { "name": "Main Entry", "pixel": [x, y] }
  ],
  "confidence": 0.85
}
\`\`\`

Only return valid JSON.`;
}
