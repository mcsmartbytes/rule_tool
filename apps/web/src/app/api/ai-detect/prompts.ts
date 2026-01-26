/**
 * AI Detection Prompts for Claude Vision
 */

export interface PromptContext {
  zoom: number;
  imageWidth: number;
  imageHeight: number;
  scale: number; // feet per pixel
  industry?: 'asphalt' | 'sealcoating' | 'concrete' | 'striping' | 'all';
  featureTypes?: string[]; // Optional: specific feature types to detect
}

// Feature type definitions for selective detection
const FEATURE_DEFINITIONS: Record<string, { category: string; description: string }> = {
  'building-footprint': { category: 'structures', description: 'All rooftops, structures, and covered areas including HVAC units, overhangs, canopies' },
  'parking-surface': { category: 'surfaces', description: 'Dark gray/black asphalt parking areas' },
  'drive-lane': { category: 'surfaces', description: 'Traffic lanes and driveways' },
  'loading-area': { category: 'surfaces', description: 'Loading docks and delivery zones' },
  'sidewalk': { category: 'surfaces', description: 'Light gray concrete pedestrian walkways' },
  'plaza': { category: 'surfaces', description: 'Open paved gathering areas' },
  'curb': { category: 'linear', description: 'Edge lines between pavement and landscaping' },
  'crack': { category: 'linear', description: 'Visible deterioration lines in pavement' },
  'edge-line': { category: 'linear', description: 'Painted boundary lines' },
  'fire-lane': { category: 'linear', description: 'Red curb markings for fire access' },
  'parking-stall': { category: 'striping', description: 'Individual parking space lines' },
  'directional-arrow': { category: 'striping', description: 'Turn arrows and directional indicators' },
  'ada-space': { category: 'striping', description: 'Handicap parking with blue striping' },
  'crosswalk': { category: 'striping', description: 'Pedestrian crossing stripes' },
  'symbol': { category: 'striping', description: 'Painted symbols and stencils' },
  'median': { category: 'structures', description: 'Raised dividers in parking areas' },
  'island': { category: 'structures', description: 'Landscaped or concrete islands' },
  'ada-ramp': { category: 'structures', description: 'Curb cut ramps for accessibility' },
};

function buildFeatureInstructions(featureTypes?: string[]): string {
  // If no specific types, return full detection instructions
  if (!featureTypes || featureTypes.length === 0) {
    return `Identify and outline ALL of the following feature types with PIXEL coordinates:

### 1. BUILDING FOOTPRINTS (Priority: High)
- All rooftops, structures, and covered areas
- Include HVAC units, overhangs, canopies
- Type: "building-footprint"
- These will be EXCLUDED from pavement measurements

### 2. PAVEMENT SURFACES (Priority: High)
Identify paved areas by material when visible:
- **Asphalt**: Dark gray/black surfaces, parking lots, driveways
- **Concrete**: Light gray surfaces, sidewalks, loading docks
- Types: "parking-surface", "drive-lane", "loading-area", "sidewalk", "plaza"
- SubTypes: "asphalt", "concrete", "gravel"

### 3. LINEAR FEATURES
- **Curbs**: Edge lines between pavement and landscaping
- **Cracks**: Visible deterioration lines in pavement
- **Edge lines**: Painted boundary lines
- Types: "curb", "crack", "edge-line", "fire-lane"

### 4. STRIPING & MARKINGS
- **Parking stalls**: Individual parking space lines
- **Directional arrows**: Turn arrows, directional indicators
- **ADA spaces**: Handicap parking (often blue striping)
- **Fire lanes**: Red curb markings
- **Crosswalks**: Pedestrian crossing stripes
- Types: "parking-stall", "directional-arrow", "ada-space", "fire-lane", "crosswalk", "symbol"

### 5. STRUCTURES
- **Medians**: Raised dividers in parking areas
- **Islands**: Landscaped or concrete islands
- **ADA ramps**: Curb cut ramps
- Types: "median", "island", "ada-ramp"`;
  }

  // Build selective instructions based on requested feature types
  const requestedFeatures = featureTypes
    .filter(ft => FEATURE_DEFINITIONS[ft])
    .map(ft => ({
      type: ft,
      ...FEATURE_DEFINITIONS[ft],
    }));

  if (requestedFeatures.length === 0) {
    return buildFeatureInstructions([]); // Fallback to all
  }

  // Group by category
  const byCategory: Record<string, typeof requestedFeatures> = {};
  for (const feature of requestedFeatures) {
    if (!byCategory[feature.category]) {
      byCategory[feature.category] = [];
    }
    byCategory[feature.category].push(feature);
  }

  const categoryNames: Record<string, string> = {
    structures: 'STRUCTURES & BUILDINGS',
    surfaces: 'PAVEMENT SURFACES',
    linear: 'LINEAR FEATURES',
    striping: 'STRIPING & MARKINGS',
  };

  let instructions = `Identify and outline ONLY the following specific feature types with PIXEL coordinates:

**IMPORTANT: Only detect the feature types listed below. Ignore all other features.**

`;

  let sectionNum = 1;
  for (const [category, features] of Object.entries(byCategory)) {
    instructions += `### ${sectionNum}. ${categoryNames[category] || category.toUpperCase()}\n`;
    for (const feature of features) {
      instructions += `- **${feature.type}**: ${feature.description}\n`;
    }
    instructions += `- Types: ${features.map(f => `"${f.type}"`).join(', ')}\n\n`;
    sectionNum++;
  }

  return instructions;
}

export function buildDetectionPrompt(context: PromptContext): string {
  const industryInstructions = getIndustryInstructions(context.industry || 'all');
  const featureInstructions = buildFeatureInstructions(context.featureTypes);

  const focusNote = context.featureTypes && context.featureTypes.length > 0
    ? `\n**FOCUS MODE**: You are detecting only ${context.featureTypes.length} specific feature type(s). Do NOT detect features outside of this list.\n`
    : '';

  return `You are a site survey AI analyzing satellite imagery for commercial property estimation. Your task is to identify and outline specific features relevant for contractors.
${focusNote}
## IMAGE CONTEXT
- Satellite image at zoom level ${context.zoom}
- Image dimensions: ${context.imageWidth} x ${context.imageHeight} pixels
- Approximate scale: ${context.scale.toFixed(2)} feet per pixel

## DETECTION REQUIREMENTS

${featureInstructions}

### 1. BUILDING FOOTPRINTS (Priority: High)
- All rooftops, structures, and covered areas
- Include HVAC units, overhangs, canopies
- Type: "building-footprint"
- These will be EXCLUDED from pavement measurements

### 2. PAVEMENT SURFACES (Priority: High)
Identify paved areas by material when visible:
- **Asphalt**: Dark gray/black surfaces, parking lots, driveways
- **Concrete**: Light gray surfaces, sidewalks, loading docks
- Types: "parking-surface", "drive-lane", "loading-area", "sidewalk", "plaza"
- SubTypes: "asphalt", "concrete", "gravel"

### 3. LINEAR FEATURES
- **Curbs**: Edge lines between pavement and landscaping
- **Cracks**: Visible deterioration lines in pavement
- **Edge lines**: Painted boundary lines
- Types: "curb", "crack", "edge-line", "fire-lane"

### 4. STRIPING & MARKINGS
- **Parking stalls**: Individual parking space lines
- **Directional arrows**: Turn arrows, directional indicators
- **ADA spaces**: Handicap parking (often blue striping)
- **Fire lanes**: Red curb markings
- **Crosswalks**: Pedestrian crossing stripes
- Types: "parking-stall", "directional-arrow", "ada-space", "fire-lane", "crosswalk", "symbol"

### 5. STRUCTURES
- **Medians**: Raised dividers in parking areas
- **Islands**: Landscaped or concrete islands
- **ADA ramps**: Curb cut ramps
- Types: "median", "island", "ada-ramp"

${industryInstructions}

## OUTPUT FORMAT

Return ONLY a valid JSON array of detected features. Each feature must have:

\`\`\`json
[
  {
    "type": "<object-type>",
    "subType": "<optional: asphalt|concrete|gravel|etc>",
    "confidence": <0.0 to 1.0>,
    "label": "<brief description>",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[x1,y1], [x2,y2], [x3,y3], [x1,y1]]]
    }
  }
]
\`\`\`

## CRITICAL RULES

1. **Coordinates are PIXELS** - (0,0) is top-left of image
2. **Polygons must be closed** - First point must equal last point
3. **Only include features with confidence >= 0.5**
4. **Do NOT include**: Vehicles, people, shadows, trees (unless blocking pavement)
5. **Merge adjacent surfaces** of the same type where logical
6. **Building footprints are critical** - Detect ALL structures for accurate exclusion
7. **Be precise** - Trace along actual boundaries, not approximations

Return ONLY the JSON array, no explanation or markdown.`;
}

function getIndustryInstructions(industry: string): string {
  const instructions: Record<string, string> = {
    asphalt: `
## INDUSTRY FOCUS: ASPHALT
Pay special attention to:
- Surface condition: Look for faded/oxidized areas (gray vs black asphalt)
- Crack patterns: Alligator cracking, linear cracks, edge deterioration
- Patched areas: Existing repairs that may need re-work
- Drainage issues: Low spots, ponding water stains
- Mark surface condition in label: "good", "fair", "poor"`,

    sealcoating: `
## INDUSTRY FOCUS: SEALCOATING
Pay special attention to:
- Oxidation level: Fresh black vs faded gray surfaces
- Areas excluded from sealing: Concrete pads, metal covers
- Surface preparation needs: Oil stains, heavy crack areas
- Previously sealed areas vs never sealed
- Mark in label whether surface appears sealed or unsealed`,

    concrete: `
## INDUSTRY FOCUS: CONCRETE
Pay special attention to:
- Sidewalk sections and control joints
- Spalling, cracking, or heaving sections
- ADA compliance features: Ramps, truncated domes
- Curb condition: Damaged vs intact
- Mark damage severity in label: "minor", "moderate", "severe"`,

    striping: `
## INDUSTRY FOCUS: STRIPING
Pay special attention to:
- Existing stall line visibility (faded vs fresh)
- Stall count and dimensions where measurable
- Arrow types and locations
- ADA space compliance (correct size, access aisles)
- Fire lane requirements
- Count parking stalls in label when possible`,

    all: `
## MULTI-TRADE DETECTION
Detect all features comprehensively for:
- Asphalt/Sealcoating: Surface areas and condition
- Concrete: Sidewalks, curbs, flatwork
- Striping: All line markings and symbols`,
  };

  return instructions[industry] || instructions.all;
}

/**
 * System prompt for Claude Vision
 */
export const SYSTEM_PROMPT = `You are an expert site surveyor AI that analyzes satellite imagery to identify features for commercial property contractors. You have extensive knowledge of:

- Pavement types (asphalt, concrete, gravel)
- Parking lot layouts and striping patterns
- Building footprints and structures
- ADA accessibility features
- Surface condition assessment

Your responses are always valid JSON arrays containing detected features with pixel coordinates. You are precise, thorough, and conservative with confidence scores.`;
