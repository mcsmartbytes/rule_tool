'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PDFDocument,
  PDFPage,
  BlueprintFeature,
  PDFPageCategory,
  ScaleInfo,
  SiteObjectType,
} from '@/lib/supabase/types';

// Feature pending review (before approval)
export interface PendingFeature extends Omit<BlueprintFeature, 'id' | 'created_at' | 'approved_at' | 'approved_by'> {
  tempId: string;
}

interface BlueprintState {
  // Documents
  documents: PDFDocument[];
  activeDocumentId: string | null;

  // Pages
  pages: PDFPage[];
  selectedPageIds: Set<string>;

  // Features pending review
  pendingFeatures: PendingFeature[];
  selectedFeatureIds: Set<string>;
  highlightedFeatureId: string | null;

  // UI State
  viewMode: 'grid' | 'list';
  filterCategory: PDFPageCategory | null;
  isUploading: boolean;
  uploadProgress: number;
  isAnalyzing: boolean;
  analyzeProgress: { current: number; total: number } | null;

  // Scale calibration
  isCalibrating: boolean;
  calibrationPageId: string | null;

  // Actions - Documents
  setDocuments: (documents: PDFDocument[]) => void;
  addDocument: (document: PDFDocument) => void;
  updateDocument: (id: string, updates: Partial<PDFDocument>) => void;
  removeDocument: (id: string) => void;
  setActiveDocument: (id: string | null) => void;

  // Actions - Pages
  setPages: (pages: PDFPage[]) => void;
  updatePage: (id: string, updates: Partial<PDFPage>) => void;
  selectPages: (ids: string[]) => void;
  togglePageSelection: (id: string) => void;
  selectAllPages: () => void;
  deselectAllPages: () => void;

  // Actions - Features
  setPendingFeatures: (features: PendingFeature[]) => void;
  addPendingFeatures: (features: PendingFeature[]) => void;
  removePendingFeature: (tempId: string) => void;
  clearPendingFeatures: () => void;
  selectFeatures: (ids: string[]) => void;
  toggleFeatureSelection: (id: string) => void;
  selectAllFeatures: () => void;
  deselectAllFeatures: () => void;
  setHighlightedFeature: (id: string | null) => void;

  // Actions - UI
  setViewMode: (mode: 'grid' | 'list') => void;
  setFilterCategory: (category: PDFPageCategory | null) => void;
  setUploading: (uploading: boolean, progress?: number) => void;
  setAnalyzing: (analyzing: boolean, progress?: { current: number; total: number } | null) => void;

  // Actions - Scale calibration
  startCalibration: (pageId: string) => void;
  finishCalibration: (pageId: string, scaleInfo: ScaleInfo) => void;
  cancelCalibration: () => void;

  // Computed getters
  getFilteredPages: () => PDFPage[];
  getSelectedPages: () => PDFPage[];
  getSelectedFeatures: () => PendingFeature[];
}

// Generate temporary ID for pending features
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useBlueprintStore = create<BlueprintState>()(
  persist(
    (set, get) => ({
      // Initial state
      documents: [],
      activeDocumentId: null,
      pages: [],
      selectedPageIds: new Set(),
      pendingFeatures: [],
      selectedFeatureIds: new Set(),
      highlightedFeatureId: null,
      viewMode: 'grid',
      filterCategory: null,
      isUploading: false,
      uploadProgress: 0,
      isAnalyzing: false,
      analyzeProgress: null,
      isCalibrating: false,
      calibrationPageId: null,

      // Document actions
      setDocuments: (documents) => set({ documents }),

      addDocument: (document) => set((state) => ({
        documents: [...state.documents, document],
      })),

      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, ...updates } : doc
        ),
      })),

      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        activeDocumentId: state.activeDocumentId === id ? null : state.activeDocumentId,
        pages: state.pages.filter((page) => page.document_id !== id),
      })),

      setActiveDocument: (id) => set({
        activeDocumentId: id,
        selectedPageIds: new Set(),
        pendingFeatures: [],
        selectedFeatureIds: new Set(),
      }),

      // Page actions
      setPages: (pages) => set({ pages }),

      updatePage: (id, updates) => set((state) => ({
        pages: state.pages.map((page) =>
          page.id === id ? { ...page, ...updates } : page
        ),
      })),

      selectPages: (ids) => set({ selectedPageIds: new Set(ids) }),

      togglePageSelection: (id) => set((state) => {
        const newSelection = new Set(state.selectedPageIds);
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else {
          newSelection.add(id);
        }
        return { selectedPageIds: newSelection };
      }),

      selectAllPages: () => set((state) => ({
        selectedPageIds: new Set(get().getFilteredPages().map((p) => p.id)),
      })),

      deselectAllPages: () => set({ selectedPageIds: new Set() }),

      // Feature actions
      setPendingFeatures: (features) => set({ pendingFeatures: features }),

      addPendingFeatures: (features) => set((state) => ({
        pendingFeatures: [
          ...state.pendingFeatures,
          ...features.map((f) => ({ ...f, tempId: f.tempId || generateTempId() })),
        ],
      })),

      removePendingFeature: (tempId) => set((state) => ({
        pendingFeatures: state.pendingFeatures.filter((f) => f.tempId !== tempId),
        selectedFeatureIds: (() => {
          const newSet = new Set(state.selectedFeatureIds);
          newSet.delete(tempId);
          return newSet;
        })(),
      })),

      clearPendingFeatures: () => set({
        pendingFeatures: [],
        selectedFeatureIds: new Set(),
        highlightedFeatureId: null,
      }),

      selectFeatures: (ids) => set({ selectedFeatureIds: new Set(ids) }),

      toggleFeatureSelection: (id) => set((state) => {
        const newSelection = new Set(state.selectedFeatureIds);
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else {
          newSelection.add(id);
        }
        return { selectedFeatureIds: newSelection };
      }),

      selectAllFeatures: () => set((state) => ({
        selectedFeatureIds: new Set(state.pendingFeatures.map((f) => f.tempId)),
      })),

      deselectAllFeatures: () => set({ selectedFeatureIds: new Set() }),

      setHighlightedFeature: (id) => set({ highlightedFeatureId: id }),

      // UI actions
      setViewMode: (mode) => set({ viewMode: mode }),

      setFilterCategory: (category) => set({
        filterCategory: category,
        selectedPageIds: new Set(), // Clear selection when filter changes
      }),

      setUploading: (uploading, progress = 0) => set({
        isUploading: uploading,
        uploadProgress: progress,
      }),

      setAnalyzing: (analyzing, progress = null) => set({
        isAnalyzing: analyzing,
        analyzeProgress: progress,
      }),

      // Calibration actions
      startCalibration: (pageId) => set({
        isCalibrating: true,
        calibrationPageId: pageId,
      }),

      finishCalibration: (pageId, scaleInfo) => {
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === pageId ? { ...page, scale_info: scaleInfo } : page
          ),
          isCalibrating: false,
          calibrationPageId: null,
        }));
      },

      cancelCalibration: () => set({
        isCalibrating: false,
        calibrationPageId: null,
      }),

      // Computed getters
      getFilteredPages: () => {
        const { pages, activeDocumentId, filterCategory } = get();
        return pages.filter((page) => {
          if (activeDocumentId && page.document_id !== activeDocumentId) return false;
          if (filterCategory && page.category !== filterCategory) return false;
          return true;
        });
      },

      getSelectedPages: () => {
        const { pages, selectedPageIds } = get();
        return pages.filter((page) => selectedPageIds.has(page.id));
      },

      getSelectedFeatures: () => {
        const { pendingFeatures, selectedFeatureIds } = get();
        return pendingFeatures.filter((f) => selectedFeatureIds.has(f.tempId));
      },
    }),
    {
      name: 'rule-tool-blueprint-storage',
      partialize: (state) => ({
        // Don't persist transient UI state
        viewMode: state.viewMode,
        filterCategory: state.filterCategory,
      }),
      // Custom serialization for Set types
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Helper to convert pending features to site objects
export function pendingFeatureToSiteObject(
  feature: PendingFeature,
  siteId: string
): Omit<import('@/lib/supabase/types').SiteObject, 'id' | 'created_at' | 'updated_at'> {
  return {
    site_id: siteId,
    object_type: feature.object_type,
    sub_type: feature.sub_type,
    geometry: feature.geometry as GeoJSON.Geometry,
    measurements: feature.measurements,
    properties: feature.properties,
    source: 'imported',
    confidence: feature.confidence,
    label: feature.label,
    tags: [],
    color: null,
  };
}
