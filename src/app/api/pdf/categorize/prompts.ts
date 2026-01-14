import type { PDFPageCategory } from '@/lib/supabase/types';

export const PDF_PAGE_CATEGORIES: PDFPageCategory[] = [
  'site-plan',
  'floor-plan',
  'electrical',
  'mechanical',
  'plumbing',
  'structural',
  'landscape',
  'civil',
  'detail',
  'schedule',
  'cover',
  'other',
];

export const SYSTEM_PROMPT = `You are an expert construction document assistant.
You categorize blueprint / plan-set pages by discipline and page type.

You must return STRICT JSON only.`;

export function buildCategorizePrompt(): string {
  return `Classify this blueprint PDF page into ONE category from the allowed list.

## Allowed categories
${PDF_PAGE_CATEGORIES.map((c) => `- ${c}`).join('\n')}

## Output format (STRICT JSON)
Return ONLY:
{
  "category": "<one of the allowed categories>",
  "confidence": <number 0.0 to 1.0>
}

## Guidance
- "cover" for cover sheet / title sheet / index / general notes cover
- "schedule" for schedules (door/window/finish/signage/striping schedules, legends when schedule-like)
- "detail" for detail callouts, sections, blowups
- "site-plan" for overall site plan, grading, paving/striping layout, civil site overall
- "civil" for civil sheets that are not clearly the site plan (utilities, grading, erosion, profiles)
- "floor-plan" for building interior floor plans
- If uncertain, choose "other" with lower confidence

Return JSON only.`;
}

