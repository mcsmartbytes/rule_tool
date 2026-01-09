/**
 * Spatial Quote Engine - Zustand Store
 * State management for pricing configuration and bids
 */

import { create } from 'zustand';
import type {
  PricingConfig,
  ServiceType,
  Bid,
  MeasurementSnapshot,
} from './pricing-types';
import { DEFAULT_PRICING_CONFIG } from './pricing-types';
import {
  createBidFromMeasurements,
  addLineItemToBid,
  removeLineItemFromBid,
  updateLineItemInBid,
  updateBidMargin,
  calculateBidTotals,
  assessRisks,
} from './pricing-engine';

const PRICING_CONFIGS_KEY = 'PRICING_CONFIGS';
const ACTIVE_CONFIG_KEY = 'ACTIVE_PRICING_CONFIG_ID';

type PricingStore = {
  // Pricing configuration
  pricingConfigs: PricingConfig[];
  activePricingConfigId: string;

  // Current bid being built
  currentBid: Bid | null;
  previewBid: Bid | null;
  liveMeasurements: MeasurementSnapshot | null;
  committedMeasurements: MeasurementSnapshot | null;

  // UI state
  bidBuilderOpen: boolean;
  pricingConfigOpen: boolean;
  hydrated: boolean;

  // Configuration actions
  setPricingConfigs: (configs: PricingConfig[]) => void;
  setActivePricingConfig: (id: string) => void;
  addServiceType: (serviceType: ServiceType) => void;
  updateServiceType: (id: string, updates: Partial<ServiceType>) => void;
  removeServiceType: (id: string) => void;
  updatePricingConfig: (updates: Partial<Omit<PricingConfig, 'id' | 'serviceTypes'>>) => void;

  // Bid actions
  createNewBid: (measurements?: MeasurementSnapshot, context?: {
    customerId?: string;
    customerName?: string;
    jobId?: string;
    jobName?: string;
    address?: string;
    notes?: string;
  }) => void;
  clearCurrentBid: () => void;
  addLineItem: (serviceTypeId: string, quantity: number, description?: string) => void;
  removeLineItem: (lineItemId: string) => void;
  updateLineItem: (lineItemId: string, updates: { quantity?: number; description?: string; overridePrice?: number }) => void;
  setMargin: (margin: number) => void;
  updateBidContext: (context: Partial<Pick<Bid, 'customerName' | 'jobName' | 'address' | 'notes'>>) => void;
  updateLiveMeasurements: (snapshot: MeasurementSnapshot) => void;
  commitMeasurements: (snapshot?: MeasurementSnapshot) => void;
  runFinalPricing: () => void;

  // UI actions
  openBidBuilder: () => void;
  closeBidBuilder: () => void;
  openPricingConfig: () => void;
  closePricingConfig: () => void;

  // Hydration
  hydrate: () => void;

  // Helpers
  getActiveConfig: () => PricingConfig;
  getServiceType: (id: string) => ServiceType | undefined;
};

export const usePricingStore = create<PricingStore>((set, get) => ({
  // Initial state - will be hydrated from localStorage
  pricingConfigs: [DEFAULT_PRICING_CONFIG],
  activePricingConfigId: 'default',
  currentBid: null,
  previewBid: null,
  liveMeasurements: null,
  committedMeasurements: null,
  bidBuilderOpen: false,
  pricingConfigOpen: false,
  hydrated: false,

  // Configuration actions
  setPricingConfigs: (configs) => {
    try {
      localStorage.setItem(PRICING_CONFIGS_KEY, JSON.stringify(configs));
    } catch {}
    set({ pricingConfigs: configs });
  },

  setActivePricingConfig: (id) => {
    try {
      localStorage.setItem(ACTIVE_CONFIG_KEY, id);
    } catch {}
    set({ activePricingConfigId: id });
  },

  addServiceType: (serviceType) => {
    const { pricingConfigs, activePricingConfigId } = get();
    const updatedConfigs = pricingConfigs.map((config) => {
      if (config.id !== activePricingConfigId) return config;
      return {
        ...config,
        serviceTypes: [...config.serviceTypes, serviceType],
        lastUpdated: new Date().toISOString(),
      };
    });
    try {
      localStorage.setItem(PRICING_CONFIGS_KEY, JSON.stringify(updatedConfigs));
    } catch {}
    set({ pricingConfigs: updatedConfigs });
  },

  updateServiceType: (id, updates) => {
    const { pricingConfigs, activePricingConfigId } = get();
    const updatedConfigs = pricingConfigs.map((config) => {
      if (config.id !== activePricingConfigId) return config;
      return {
        ...config,
        serviceTypes: config.serviceTypes.map((st) =>
          st.id === id ? { ...st, ...updates } : st
        ),
        lastUpdated: new Date().toISOString(),
      };
    });
    try {
      localStorage.setItem(PRICING_CONFIGS_KEY, JSON.stringify(updatedConfigs));
    } catch {}
    set({ pricingConfigs: updatedConfigs });
  },

  removeServiceType: (id) => {
    const { pricingConfigs, activePricingConfigId } = get();
    const updatedConfigs = pricingConfigs.map((config) => {
      if (config.id !== activePricingConfigId) return config;
      return {
        ...config,
        serviceTypes: config.serviceTypes.filter((st) => st.id !== id),
        lastUpdated: new Date().toISOString(),
      };
    });
    try {
      localStorage.setItem(PRICING_CONFIGS_KEY, JSON.stringify(updatedConfigs));
    } catch {}
    set({ pricingConfigs: updatedConfigs });
  },

  updatePricingConfig: (updates) => {
    const { pricingConfigs, activePricingConfigId } = get();
    const updatedConfigs = pricingConfigs.map((config) => {
      if (config.id !== activePricingConfigId) return config;
      return {
        ...config,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
    });
    try {
      localStorage.setItem(PRICING_CONFIGS_KEY, JSON.stringify(updatedConfigs));
    } catch {}
    set({ pricingConfigs: updatedConfigs });
  },

  updateLiveMeasurements: (snapshot) => {
    const currentBid = get().currentBid;
    const previewBid = currentBid
      ? {
          ...currentBid,
          measurements: snapshot,
          updatedAt: new Date().toISOString(),
        }
      : null;
    set({
      liveMeasurements: snapshot,
      previewBid,
    });
  },

  commitMeasurements: (snapshot) => {
    const incoming = snapshot ?? get().liveMeasurements;
    if (!incoming) return;
    set({ committedMeasurements: incoming });
    if (get().currentBid) {
      get().runFinalPricing();
    }
  },

  runFinalPricing: () => {
    const { committedMeasurements, currentBid } = get();
    if (!committedMeasurements || !currentBid) return;
    const config = get().getActiveConfig();
    const updatedBid: Bid = {
      ...currentBid,
      measurements: committedMeasurements,
      updatedAt: new Date().toISOString(),
    };
    const withTotals = calculateBidTotals(updatedBid);
    set({
      currentBid: {
        ...withTotals,
        riskFlags: assessRisks(withTotals, config),
      },
      previewBid: null,
    });
  },

  // Bid actions
  createNewBid: (measurements, context) => {
    const snapshot = measurements ?? get().committedMeasurements ?? get().liveMeasurements;
    const config = get().getActiveConfig();
    if (!snapshot) {
      set({ currentBid: null, previewBid: null, bidBuilderOpen: true });
      return;
    }
    const bid = createBidFromMeasurements(snapshot, config, context);
    set({ currentBid: bid, previewBid: null, bidBuilderOpen: true });
  },

  clearCurrentBid: () => {
    set({ currentBid: null, previewBid: null });
  },

  addLineItem: (serviceTypeId, quantity, description) => {
    const { currentBid } = get();
    if (!currentBid) return;

    const config = get().getActiveConfig();
    const serviceType = config.serviceTypes.find((st) => st.id === serviceTypeId);
    if (!serviceType) return;

    const updatedBid = addLineItemToBid(currentBid, serviceType, quantity, config, description);
    set({ currentBid: updatedBid, previewBid: null });
  },

  removeLineItem: (lineItemId) => {
    const { currentBid } = get();
    if (!currentBid) return;

    const config = get().getActiveConfig();
    const updatedBid = removeLineItemFromBid(currentBid, lineItemId, config);
    set({ currentBid: updatedBid, previewBid: null });
  },

  updateLineItem: (lineItemId, updates) => {
    const { currentBid } = get();
    if (!currentBid) return;

    const config = get().getActiveConfig();
    const updatedBid = updateLineItemInBid(currentBid, lineItemId, updates, config);
    set({ currentBid: updatedBid, previewBid: null });
  },

  setMargin: (margin) => {
    const { currentBid } = get();
    if (!currentBid) return;

    const config = get().getActiveConfig();
    const updatedBid = updateBidMargin(currentBid, margin, config);
    set({ currentBid: updatedBid, previewBid: null });
  },

  updateBidContext: (context) => {
    const { currentBid } = get();
    if (!currentBid) return;

    const config = get().getActiveConfig();
    const updatedBid: Bid = {
      ...currentBid,
      ...context,
      updatedAt: new Date().toISOString(),
    };
    // Recalculate in case anything changed
    const withTotals = calculateBidTotals(updatedBid);
    set({
      currentBid: {
        ...withTotals,
        riskFlags: assessRisks(withTotals, config),
      },
      previewBid: null,
    });
  },

  // UI actions
  openBidBuilder: () => set({ bidBuilderOpen: true }),
  closeBidBuilder: () => set({ bidBuilderOpen: false }),
  openPricingConfig: () => set({ pricingConfigOpen: true }),
  closePricingConfig: () => set({ pricingConfigOpen: false }),

  // Hydration from localStorage
  hydrate: () => {
    try {
      // Load pricing configs
      const storedConfigs = localStorage.getItem(PRICING_CONFIGS_KEY);
      if (storedConfigs) {
        const configs = JSON.parse(storedConfigs) as PricingConfig[];
        // Merge with defaults to ensure new service types are available
        const mergedConfigs = configs.map((config) => {
          // Add any new default service types that don't exist
          const existingIds = new Set(config.serviceTypes.map((st) => st.id));
          const newServiceTypes = DEFAULT_PRICING_CONFIG.serviceTypes.filter(
            (st) => !existingIds.has(st.id)
          );
          if (newServiceTypes.length > 0) {
            return {
              ...config,
              serviceTypes: [...config.serviceTypes, ...newServiceTypes],
            };
          }
          return config;
        });
        set({ pricingConfigs: mergedConfigs });
      }

      // Load active config ID
      const storedActiveId = localStorage.getItem(ACTIVE_CONFIG_KEY);
      if (storedActiveId) {
        set({ activePricingConfigId: storedActiveId });
      }
    } catch {}

    set({ hydrated: true });
  },

  // Helpers
  getActiveConfig: () => {
    const { pricingConfigs, activePricingConfigId } = get();
    return pricingConfigs.find((c) => c.id === activePricingConfigId) || DEFAULT_PRICING_CONFIG;
  },

  getServiceType: (id) => {
    const config = get().getActiveConfig();
    return config.serviceTypes.find((st) => st.id === id);
  },
}));
