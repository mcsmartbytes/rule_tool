import { z } from 'zod';

// ============= Common Schemas =============

export const uuidSchema = z.string().uuid('Invalid UUID format');
export const positiveNumberSchema = z.number().positive('Must be positive');
export const nonNegativeNumberSchema = z.number().min(0, 'Cannot be negative');

// ============= Unit System Schema =============

export const unitSystemEnum = z.enum(['metric', 'imperial']);
export const modeEnum = z.enum(['pan', 'polygon', 'line', 'freehand', 'text', 'height']);

export const mapStyleIdEnum = z.enum([
  'auto',
  'mapbox://styles/mapbox/streets-v12',
  'mapbox://styles/mapbox/outdoors-v12',
  'mapbox://styles/mapbox/satellite-streets-v12',
  'mapbox://styles/mapbox/light-v11',
  'mapbox://styles/mapbox/dark-v11',
]);

// ============= Measurement Schemas =============

export const heightMeasurementSchema = z.object({
  id: z.string(),
  value: positiveNumberSchema,
  label: z.string().max(100),
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const measurementsSchema = z.object({
  area: nonNegativeNumberSchema.optional(),
  length: nonNegativeNumberSchema.optional(),
  heights: z.array(heightMeasurementSchema).optional(),
});

// ============= Settings Schema =============

export const updateSettingsSchema = z.object({
  unitSystem: unitSystemEnum.optional(),
  styleId: mapStyleIdEnum.optional(),
  smoothing: z.number().min(0).max(10).optional(),
  enable3D: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
});

// ============= Bid Calculation Schemas =============

export const bidItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  area: nonNegativeNumberSchema,
  unit: unitSystemEnum,
  pricePerUnit: positiveNumberSchema,
});

export const createBidSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(200),
  clientName: z.string().max(200).optional(),
  items: z.array(bidItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(5000).optional(),
  taxRate: nonNegativeNumberSchema.optional().default(0),
});

// ============= Coordinate Schemas =============

export const coordinateSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const lineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
});

// ============= Pure Validation Helpers =============

export type ValidationError = {
  field: string;
  message: string;
};

export type PureValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): PureValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

export function validateQueryParamPure(
  searchParams: URLSearchParams,
  param: string,
  schema: z.ZodSchema
): PureValidationResult<unknown> {
  const value = searchParams.get(param);

  if (value === null) {
    return {
      success: false,
      errors: [{ field: param, message: `${param} is required` }],
    };
  }

  const result = schema.safeParse(value);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((e) => ({
        field: param,
        message: e.message,
      })),
    };
  }

  return { success: true, data: result.data };
}
