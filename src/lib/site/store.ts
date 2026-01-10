'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as turf from '@turf/turf';
import type {
  Site,
  SiteObject,
  SiteObjectType,
  ObjectMeasurements,
  Trade,
  Service,
} from '@/lib/supabase/types';

// Computed estimate for a trade
export interface ComputedTradeEstimate {
  tradeId: string;
  tradeName: string;
  tradeCode: string;
  lineItems: ComputedLineItem[];
  subtotal: number;
  mobilization: number;
  margin: number;
  marginAmount: number;
  total: number;
}

export interface ComputedLineItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unit: string;
  laborHours: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subtotal: number;
  sourceObjects: string[]; // object IDs
}

interface SiteState {
  // Current site
  site: Site | null;

  // Site objects (drawn geometries)
  objects: SiteObject[];

  // Active trades
  trades: Trade[];
  services: Service[];

  // Computed estimates
  tradeEstimates: ComputedTradeEstimate[];

  // UI state
  selectedObjectId: string | null;
  activeTradeId: string | null;
  isClassifierOpen: boolean;
  pendingGeometry: GeoJSON.Geometry | null;

  // Actions
  setSite: (site: Site | null) => void;
  setTrades: (trades: Trade[]) => void;
  setServices: (services: Service[]) => void;

  // Object CRUD
  addObject: (obj: Omit<SiteObject, 'id' | 'created_at' | 'updated_at' | 'measurements'>) => void;
  updateObject: (id: string, updates: Partial<SiteObject>) => void;
  updateObjectGeometry: (id: string, geometry: GeoJSON.Geometry) => void;
  removeObject: (id: string) => void;
  clearObjects: () => void;

  // Selection
  selectObject: (id: string | null) => void;
  setActiveTradeId: (tradeId: string | null) => void;

  // Classifier modal
  openClassifier: (geometry: GeoJSON.Geometry) => void;
  closeClassifier: () => void;

  // Recompute estimates
  recomputeEstimates: () => void;
}

// Compute measurements from GeoJSON geometry
function computeMeasurements(geometry: GeoJSON.Geometry): ObjectMeasurements {
  const measurements: ObjectMeasurements = {};

  try {
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      const feature = turf.feature(geometry);
      measurements.area = Math.round(turf.area(feature) * 10.7639); // m² to ft²
      const line = turf.polygonToLine(feature);
      if (line) {
        measurements.perimeter = Math.round(turf.length(line, { units: 'feet' }));
      }
    }

    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
      const feature = turf.feature(geometry);
      measurements.length = Math.round(turf.length(feature, { units: 'feet' }));
    }

    if (geometry.type === 'Point') {
      measurements.count = 1;
    }
  } catch (e) {
    console.error('Error computing measurements:', e);
  }

  return measurements;
}

// Generate unique ID
function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useSiteStore = create<SiteState>()(
  persist(
    (set, get) => ({
      site: null,
      objects: [],
      trades: [],
      services: [],
      tradeEstimates: [],
      selectedObjectId: null,
      activeTradeId: null,
      isClassifierOpen: false,
      pendingGeometry: null,

      setSite: (site) => set({ site }),

      setTrades: (trades) => {
        set({ trades });
        get().recomputeEstimates();
      },

      setServices: (services) => set({ services }),

      addObject: (objData) => {
        const measurements = computeMeasurements(objData.geometry);
        const obj: SiteObject = {
          ...objData,
          id: generateId(),
          measurements,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({ objects: [...state.objects, obj] }));
        get().recomputeEstimates();
      },

      updateObject: (id, updates) => {
        set((state) => ({
          objects: state.objects.map((obj) =>
            obj.id === id
              ? {
                  ...obj,
                  ...updates,
                  updated_at: new Date().toISOString(),
                  measurements: updates.geometry
                    ? computeMeasurements(updates.geometry)
                    : obj.measurements,
                }
              : obj
          ),
        }));
        get().recomputeEstimates();
      },

      updateObjectGeometry: (id, geometry) => {
        set((state) => ({
          objects: state.objects.map((obj) =>
            obj.id === id
              ? {
                  ...obj,
                  geometry,
                  updated_at: new Date().toISOString(),
                  measurements: computeMeasurements(geometry),
                }
              : obj
          ),
        }));
        get().recomputeEstimates();
      },

      removeObject: (id) => {
        set((state) => ({
          objects: state.objects.filter((obj) => obj.id !== id),
          selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
        }));
        get().recomputeEstimates();
      },

      clearObjects: () => {
        set({ objects: [], selectedObjectId: null });
        get().recomputeEstimates();
      },

      selectObject: (id) => set({ selectedObjectId: id }),

      setActiveTradeId: (tradeId) => set({ activeTradeId: tradeId }),

      openClassifier: (geometry) => set({ isClassifierOpen: true, pendingGeometry: geometry }),

      closeClassifier: () => set({ isClassifierOpen: false, pendingGeometry: null }),

      recomputeEstimates: () => {
        const { objects, trades, services } = get();

        if (trades.length === 0 || objects.length === 0) {
          set({ tradeEstimates: [] });
          return;
        }

        const estimates: ComputedTradeEstimate[] = [];

        for (const trade of trades) {
          const lineItems: ComputedLineItem[] = [];
          const serviceQuantities = new Map<string, { qty: number; sources: string[] }>();

          // Process each mapping in the trade
          const consumes = trade.consumes as Array<{
            objectType: SiteObjectType;
            subTypes?: string[];
            quantitySource: string;
            serviceId: string;
            wasteFactor?: number;
          }>;

          for (const mapping of consumes) {
            // Find matching objects
            const matchingObjects = objects.filter((obj) => {
              if (obj.object_type !== mapping.objectType) return false;
              if (mapping.subTypes && mapping.subTypes.length > 0) {
                if (!obj.sub_type || !mapping.subTypes.includes(obj.sub_type)) return false;
              }
              return true;
            });

            for (const obj of matchingObjects) {
              let quantity = 0;

              switch (mapping.quantitySource) {
                case 'area':
                  quantity = obj.measurements.area || 0;
                  break;
                case 'perimeter':
                  quantity = obj.measurements.perimeter || 0;
                  break;
                case 'length':
                  quantity = obj.measurements.length || 0;
                  break;
                case 'count':
                  quantity = obj.measurements.count || 1;
                  break;
              }

              // Apply waste factor
              if (mapping.wasteFactor) {
                quantity *= mapping.wasteFactor;
              }

              // Aggregate by service
              const existing = serviceQuantities.get(mapping.serviceId);
              if (existing) {
                existing.qty += quantity;
                existing.sources.push(obj.id);
              } else {
                serviceQuantities.set(mapping.serviceId, {
                  qty: quantity,
                  sources: [obj.id],
                });
              }
            }
          }

          // Create line items from aggregated quantities
          for (const [serviceId, data] of serviceQuantities) {
            const service = services.find((s) => s.code === serviceId || s.id === serviceId);
            if (!service || data.qty === 0) continue;

            // Calculate costs
            const laborHours = service.production_rate ? data.qty / service.production_rate : 0;
            const laborCost = laborHours * service.crew_size * service.labor_rate * 1.35; // 35% burden
            const materialCost = data.qty * service.material_cost * service.waste_factor;
            const equipmentCost = service.equipment_cost_fixed + (service.equipment_cost_hourly * laborHours);
            const subtotal = Math.max(laborCost + materialCost + equipmentCost, service.minimum_charge);

            lineItems.push({
              serviceId: service.id,
              serviceName: service.name,
              quantity: Math.round(data.qty),
              unit: service.unit,
              laborHours: Math.round(laborHours * 10) / 10,
              laborCost: Math.round(laborCost),
              materialCost: Math.round(materialCost),
              equipmentCost: Math.round(equipmentCost),
              subtotal: Math.round(subtotal),
              sourceObjects: data.sources,
            });
          }

          // Calculate trade totals
          const subtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
          const settings = trade.settings as { mobilizationCost: number; defaultMargin: number };
          const mobilization = subtotal > 0 ? settings.mobilizationCost : 0;
          const margin = settings.defaultMargin;
          const marginAmount = Math.round(subtotal * margin);
          const total = subtotal + mobilization + marginAmount;

          if (lineItems.length > 0) {
            estimates.push({
              tradeId: trade.id,
              tradeName: trade.name,
              tradeCode: trade.code,
              lineItems,
              subtotal,
              mobilization,
              margin,
              marginAmount,
              total,
            });
          }
        }

        set({ tradeEstimates: estimates });
      },
    }),
    {
      name: 'rule-tool-site-storage',
      partialize: (state) => ({
        site: state.site,
        objects: state.objects,
      }),
    }
  )
);
