import {
  uuidSchema,
  unitSystemEnum,
  modeEnum,
  mapStyleIdEnum,
  measurementsSchema,
  updateSettingsSchema,
  createBidSchema,
  coordinateSchema,
  validate,
  validateQueryParamPure,
} from '../../lib/validations';

describe('Common Schemas', () => {
  describe('uuidSchema', () => {
    it('should accept valid UUID', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });
});

describe('Unit System Schemas', () => {
  describe('unitSystemEnum', () => {
    it('should accept metric', () => {
      expect(unitSystemEnum.safeParse('metric').success).toBe(true);
    });

    it('should accept imperial', () => {
      expect(unitSystemEnum.safeParse('imperial').success).toBe(true);
    });

    it('should reject invalid unit system', () => {
      expect(unitSystemEnum.safeParse('other').success).toBe(false);
    });
  });

  describe('modeEnum', () => {
    it('should accept valid modes', () => {
      const modes = ['pan', 'polygon', 'line', 'freehand', 'text', 'height'];
      modes.forEach((mode) => {
        expect(modeEnum.safeParse(mode).success).toBe(true);
      });
    });
  });

  describe('mapStyleIdEnum', () => {
    it('should accept auto', () => {
      expect(mapStyleIdEnum.safeParse('auto').success).toBe(true);
    });

    it('should accept mapbox style URLs', () => {
      expect(mapStyleIdEnum.safeParse('mapbox://styles/mapbox/streets-v12').success).toBe(true);
    });
  });
});

describe('Measurement Schemas', () => {
  describe('measurementsSchema', () => {
    it('should accept valid measurements', () => {
      const result = measurementsSchema.safeParse({
        area: 1000,
        length: 50,
        heights: [
          { id: '1', value: 10, label: 'Point A', lng: -122.4, lat: 37.8 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty measurements', () => {
      const result = measurementsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Settings Schema', () => {
  describe('updateSettingsSchema', () => {
    it('should accept valid settings', () => {
      const result = updateSettingsSchema.safeParse({
        unitSystem: 'imperial',
        smoothing: 5,
        enable3D: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid smoothing', () => {
      const result = updateSettingsSchema.safeParse({
        smoothing: 15, // max is 10
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Bid Schemas', () => {
  describe('createBidSchema', () => {
    it('should accept valid bid', () => {
      const result = createBidSchema.safeParse({
        projectName: 'Lawn Care Project',
        clientName: 'John Smith',
        items: [
          { name: 'Front Yard', area: 500, unit: 'imperial', pricePerUnit: 0.05 },
        ],
        taxRate: 8.5,
      });
      expect(result.success).toBe(true);
    });

    it('should require at least one item', () => {
      const result = createBidSchema.safeParse({
        projectName: 'Test Project',
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('should require project name', () => {
      const result = createBidSchema.safeParse({
        items: [
          { name: 'Area 1', area: 100, unit: 'metric', pricePerUnit: 1 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Coordinate Schemas', () => {
  describe('coordinateSchema', () => {
    it('should accept valid coordinates', () => {
      const result = coordinateSchema.safeParse({ lng: -122.4194, lat: 37.7749 });
      expect(result.success).toBe(true);
    });

    it('should reject out of range longitude', () => {
      const result = coordinateSchema.safeParse({ lng: 200, lat: 37.7749 });
      expect(result.success).toBe(false);
    });

    it('should reject out of range latitude', () => {
      const result = coordinateSchema.safeParse({ lng: -122.4194, lat: 100 });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validation Helpers', () => {
  describe('validate', () => {
    it('should return success with valid data', () => {
      const result = validate(unitSystemEnum, 'metric');
      expect(result.success).toBe(true);
    });

    it('should return errors with invalid data', () => {
      const result = validate(unitSystemEnum, 'invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateQueryParamPure', () => {
    it('should validate present param', () => {
      const params = new URLSearchParams('unit=metric');
      const result = validateQueryParamPure(params, 'unit', unitSystemEnum);
      expect(result.success).toBe(true);
    });

    it('should error on missing param', () => {
      const params = new URLSearchParams('');
      const result = validateQueryParamPure(params, 'unit', unitSystemEnum);
      expect(result.success).toBe(false);
    });
  });
});
