import type { StallLayout } from "@/types/measurements";

/**
 * Convert meters to feet
 */
export function feetFromMeters(m: number): number {
  return m * 3.280839895;
}

/**
 * Convert feet to meters
 */
export function metersFromFeet(ft: number): number {
  return ft / 3.280839895;
}

/**
 * Calculate number of stalls that fit in a row
 */
export function calcStallCount(rowLengthFt: number, stallWidthFt: number): number {
  if (stallWidthFt <= 0) return 0;
  return Math.max(0, Math.floor(rowLengthFt / stallWidthFt));
}

/**
 * Calculate lineal feet of striping for a stall row.
 *
 * Assumption: two depth lines per stall + end caps.
 * - Single row: (stalls * depth * 2) + (2 * depth) for end caps
 * - Double row: (stalls * depth * 4) + (4 * depth) for end caps on both sides
 */
export function calcLinealFeet(
  stallCount: number,
  stallDepthFt: number,
  layout: StallLayout
): number {
  if (stallCount <= 0 || stallDepthFt <= 0) return 0;

  if (layout === "double") {
    // Double row: stalls on both sides of a center aisle
    return stallCount * stallDepthFt * 4 + 4 * stallDepthFt;
  }
  // Single row: stalls on one side only
  return stallCount * stallDepthFt * 2 + 2 * stallDepthFt;
}

/**
 * Calculate stop bar lineal feet
 * Default: one 4ft stop bar per stall
 */
export function calcStopBarFeet(
  stallCount: number,
  stopBarWidthFt: number = 4
): number {
  return stallCount * stopBarWidthFt;
}
