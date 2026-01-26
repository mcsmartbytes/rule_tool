/**
 * HVAC Estimating Platform - Zustand Store
 * State management for HVAC projects, takeoffs, and estimates
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  HvacProject,
  HvacDocument,
  HvacDocumentPage,
  HvacEquipment,
  HvacDuctwork,
  HvacFitting,
  HvacAirDevice,
  HvacControl,
  HvacPiping,
  HvacDamper,
  HvacChecklist,
  HvacRiskFlag,
  HvacEstimate,
  HvacEstimateNote,
  HvacUserSettings,
  HvacTakeoffSummary,
  HvacRiskScoring,
} from './types';

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface HvacState {
  // Projects List
  projects: HvacProject[];
  isLoadingProjects: boolean;

  // Current Project
  currentProject: HvacProject | null;
  isLoadingProject: boolean;
  projectError: string | null;

  // Documents
  documents: HvacDocument[];
  documentPages: HvacDocumentPage[];
  isLoadingDocuments: boolean;

  // Takeoff Data
  equipment: HvacEquipment[];
  ductwork: HvacDuctwork[];
  fittings: HvacFitting[];
  airDevices: HvacAirDevice[];
  controls: HvacControl[];
  piping: HvacPiping[];
  dampers: HvacDamper[];
  isLoadingTakeoff: boolean;

  // Checklist
  checklist: HvacChecklist | null;
  isLoadingChecklist: boolean;

  // Risk Flags
  riskFlags: HvacRiskFlag[];

  // Estimate
  currentEstimate: HvacEstimate | null;
  estimateNotes: HvacEstimateNote[];
  isLoadingEstimate: boolean;

  // User Settings
  userSettings: HvacUserSettings | null;

  // UI State
  activeTab: 'overview' | 'documents' | 'takeoff' | 'checklist' | 'estimate' | 'output';
  takeoffTab: 'equipment' | 'ductwork' | 'air-devices' | 'controls' | 'piping' | 'dampers';
  selectedEquipmentId: string | null;
  selectedDuctworkId: string | null;
  isAiExtracting: boolean;

  // Computed
  takeoffSummary: HvacTakeoffSummary | null;
  riskScoring: HvacRiskScoring | null;
}

interface HvacActions {
  // Projects List Actions
  setProjects: (projects: HvacProject[]) => void;
  addProject: (project: HvacProject) => void;
  updateProjectInList: (id: string, updates: Partial<HvacProject>) => void;
  removeProject: (id: string) => void;
  setProjectsLoading: (loading: boolean) => void;

  // Project Actions
  setCurrentProject: (project: HvacProject | null) => void;
  updateProject: (updates: Partial<HvacProject>) => void;
  setProjectLoading: (loading: boolean) => void;
  setProjectError: (error: string | null) => void;

  // Document Actions
  setDocuments: (documents: HvacDocument[]) => void;
  addDocument: (document: HvacDocument) => void;
  updateDocument: (id: string, updates: Partial<HvacDocument>) => void;
  removeDocument: (id: string) => void;
  setDocumentPages: (pages: HvacDocumentPage[]) => void;
  updateDocumentPage: (id: string, updates: Partial<HvacDocumentPage>) => void;

  // Equipment Actions
  setEquipment: (equipment: HvacEquipment[]) => void;
  addEquipment: (item: HvacEquipment) => void;
  updateEquipment: (id: string, updates: Partial<HvacEquipment>) => void;
  removeEquipment: (id: string) => void;
  duplicateEquipment: (id: string) => void;

  // Ductwork Actions
  setDuctwork: (ductwork: HvacDuctwork[]) => void;
  addDuctwork: (item: HvacDuctwork) => void;
  updateDuctwork: (id: string, updates: Partial<HvacDuctwork>) => void;
  removeDuctwork: (id: string) => void;

  // Fittings Actions
  setFittings: (fittings: HvacFitting[]) => void;
  addFitting: (item: HvacFitting) => void;
  updateFitting: (id: string, updates: Partial<HvacFitting>) => void;
  removeFitting: (id: string) => void;

  // Air Device Actions
  setAirDevices: (devices: HvacAirDevice[]) => void;
  addAirDevice: (item: HvacAirDevice) => void;
  updateAirDevice: (id: string, updates: Partial<HvacAirDevice>) => void;
  removeAirDevice: (id: string) => void;

  // Control Actions
  setControls: (controls: HvacControl[]) => void;
  addControl: (item: HvacControl) => void;
  updateControl: (id: string, updates: Partial<HvacControl>) => void;
  removeControl: (id: string) => void;

  // Piping Actions
  setPiping: (piping: HvacPiping[]) => void;
  addPiping: (item: HvacPiping) => void;
  updatePiping: (id: string, updates: Partial<HvacPiping>) => void;
  removePiping: (id: string) => void;

  // Damper Actions
  setDampers: (dampers: HvacDamper[]) => void;
  addDamper: (item: HvacDamper) => void;
  updateDamper: (id: string, updates: Partial<HvacDamper>) => void;
  removeDamper: (id: string) => void;

  // Checklist Actions
  setChecklist: (checklist: HvacChecklist | null) => void;
  updateChecklist: (updates: Partial<HvacChecklist>) => void;
  toggleChecklistItem: (section: string, item: string) => void;

  // Risk Flag Actions
  setRiskFlags: (flags: HvacRiskFlag[]) => void;
  addRiskFlag: (flag: HvacRiskFlag) => void;
  updateRiskFlag: (id: string, updates: Partial<HvacRiskFlag>) => void;
  removeRiskFlag: (id: string) => void;
  resolveRiskFlag: (id: string, notes: string) => void;

  // Estimate Actions
  setCurrentEstimate: (estimate: HvacEstimate | null) => void;
  updateEstimate: (updates: Partial<HvacEstimate>) => void;
  setEstimateNotes: (notes: HvacEstimateNote[]) => void;
  addEstimateNote: (note: HvacEstimateNote) => void;
  removeEstimateNote: (id: string) => void;

  // Settings Actions
  setUserSettings: (settings: HvacUserSettings | null) => void;
  updateUserSettings: (updates: Partial<HvacUserSettings>) => void;

  // UI Actions
  setActiveTab: (tab: HvacState['activeTab']) => void;
  setTakeoffTab: (tab: HvacState['takeoffTab']) => void;
  setSelectedEquipmentId: (id: string | null) => void;
  setSelectedDuctworkId: (id: string | null) => void;
  setAiExtracting: (extracting: boolean) => void;

  // Bulk Actions
  importTakeoffData: (data: {
    equipment?: HvacEquipment[];
    ductwork?: HvacDuctwork[];
    airDevices?: HvacAirDevice[];
    controls?: HvacControl[];
    piping?: HvacPiping[];
  }) => void;
  clearTakeoff: () => void;

  // Computed Actions
  recalculateTakeoffSummary: () => void;
  recalculateRiskScoring: () => void;

  // Reset
  resetStore: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: HvacState = {
  projects: [],
  isLoadingProjects: false,

  currentProject: null,
  isLoadingProject: false,
  projectError: null,

  documents: [],
  documentPages: [],
  isLoadingDocuments: false,

  equipment: [],
  ductwork: [],
  fittings: [],
  airDevices: [],
  controls: [],
  piping: [],
  dampers: [],
  isLoadingTakeoff: false,

  checklist: null,
  isLoadingChecklist: false,

  riskFlags: [],

  currentEstimate: null,
  estimateNotes: [],
  isLoadingEstimate: false,

  userSettings: null,

  activeTab: 'overview',
  takeoffTab: 'equipment',
  selectedEquipmentId: null,
  selectedDuctworkId: null,
  isAiExtracting: false,

  takeoffSummary: null,
  riskScoring: null,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useHvacStore = create<HvacState & HvacActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Projects List Actions
      setProjects: (projects) => set({ projects }),
      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),
      updateProjectInList: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),
      setProjectsLoading: (loading) => set({ isLoadingProjects: loading }),

      // Project Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      updateProject: (updates) =>
        set((state) => ({
          currentProject: state.currentProject
            ? { ...state.currentProject, ...updates }
            : null,
        })),
      setProjectLoading: (loading) => set({ isLoadingProject: loading }),
      setProjectError: (error) => set({ projectError: error }),

      // Document Actions
      setDocuments: (documents) => set({ documents }),
      addDocument: (document) =>
        set((state) => ({ documents: [...state.documents, document] })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),
      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        })),
      setDocumentPages: (pages) => set({ documentPages: pages }),
      updateDocumentPage: (id, updates) =>
        set((state) => ({
          documentPages: state.documentPages.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      // Equipment Actions
      setEquipment: (equipment) => {
        set({ equipment });
        get().recalculateTakeoffSummary();
      },
      addEquipment: (item) => {
        set((state) => ({ equipment: [...state.equipment, item] }));
        get().recalculateTakeoffSummary();
      },
      updateEquipment: (id, updates) => {
        set((state) => ({
          equipment: state.equipment.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
        get().recalculateTakeoffSummary();
      },
      removeEquipment: (id) => {
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
        }));
        get().recalculateTakeoffSummary();
      },
      duplicateEquipment: (id) => {
        const state = get();
        const item = state.equipment.find((e) => e.id === id);
        if (item) {
          const newItem: HvacEquipment = {
            ...item,
            id: crypto.randomUUID(),
            tag: item.tag ? `${item.tag}-COPY` : undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          set({ equipment: [...state.equipment, newItem] });
          get().recalculateTakeoffSummary();
        }
      },

      // Ductwork Actions
      setDuctwork: (ductwork) => {
        set({ ductwork });
        get().recalculateTakeoffSummary();
      },
      addDuctwork: (item) => {
        set((state) => ({ ductwork: [...state.ductwork, item] }));
        get().recalculateTakeoffSummary();
      },
      updateDuctwork: (id, updates) => {
        set((state) => ({
          ductwork: state.ductwork.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        }));
        get().recalculateTakeoffSummary();
      },
      removeDuctwork: (id) => {
        set((state) => ({
          ductwork: state.ductwork.filter((d) => d.id !== id),
        }));
        get().recalculateTakeoffSummary();
      },

      // Fittings Actions
      setFittings: (fittings) => set({ fittings }),
      addFitting: (item) =>
        set((state) => ({ fittings: [...state.fittings, item] })),
      updateFitting: (id, updates) =>
        set((state) => ({
          fittings: state.fittings.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        })),
      removeFitting: (id) =>
        set((state) => ({
          fittings: state.fittings.filter((f) => f.id !== id),
        })),

      // Air Device Actions
      setAirDevices: (devices) => {
        set({ airDevices: devices });
        get().recalculateTakeoffSummary();
      },
      addAirDevice: (item) => {
        set((state) => ({ airDevices: [...state.airDevices, item] }));
        get().recalculateTakeoffSummary();
      },
      updateAirDevice: (id, updates) => {
        set((state) => ({
          airDevices: state.airDevices.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        }));
        get().recalculateTakeoffSummary();
      },
      removeAirDevice: (id) => {
        set((state) => ({
          airDevices: state.airDevices.filter((d) => d.id !== id),
        }));
        get().recalculateTakeoffSummary();
      },

      // Control Actions
      setControls: (controls) => {
        set({ controls });
        get().recalculateTakeoffSummary();
      },
      addControl: (item) => {
        set((state) => ({ controls: [...state.controls, item] }));
        get().recalculateTakeoffSummary();
      },
      updateControl: (id, updates) => {
        set((state) => ({
          controls: state.controls.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
        get().recalculateTakeoffSummary();
      },
      removeControl: (id) => {
        set((state) => ({
          controls: state.controls.filter((c) => c.id !== id),
        }));
        get().recalculateTakeoffSummary();
      },

      // Piping Actions
      setPiping: (piping) => {
        set({ piping });
        get().recalculateTakeoffSummary();
      },
      addPiping: (item) => {
        set((state) => ({ piping: [...state.piping, item] }));
        get().recalculateTakeoffSummary();
      },
      updatePiping: (id, updates) => {
        set((state) => ({
          piping: state.piping.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
        get().recalculateTakeoffSummary();
      },
      removePiping: (id) => {
        set((state) => ({
          piping: state.piping.filter((p) => p.id !== id),
        }));
        get().recalculateTakeoffSummary();
      },

      // Damper Actions
      setDampers: (dampers) => set({ dampers }),
      addDamper: (item) =>
        set((state) => ({ dampers: [...state.dampers, item] })),
      updateDamper: (id, updates) =>
        set((state) => ({
          dampers: state.dampers.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),
      removeDamper: (id) =>
        set((state) => ({
          dampers: state.dampers.filter((d) => d.id !== id),
        })),

      // Checklist Actions
      setChecklist: (checklist) => set({ checklist }),
      updateChecklist: (updates) =>
        set((state) => ({
          checklist: state.checklist
            ? { ...state.checklist, ...updates }
            : null,
        })),
      toggleChecklistItem: (section, item) =>
        set((state) => {
          if (!state.checklist) return {};
          const key = `${section}_${item}` as keyof HvacChecklist;
          const currentValue = state.checklist[key];
          if (typeof currentValue === 'boolean') {
            return {
              checklist: {
                ...state.checklist,
                [key]: !currentValue,
              },
            };
          }
          return {};
        }),

      // Risk Flag Actions
      setRiskFlags: (flags) => set({ riskFlags: flags }),
      addRiskFlag: (flag) =>
        set((state) => ({ riskFlags: [...state.riskFlags, flag] })),
      updateRiskFlag: (id, updates) =>
        set((state) => ({
          riskFlags: state.riskFlags.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        })),
      removeRiskFlag: (id) =>
        set((state) => ({
          riskFlags: state.riskFlags.filter((f) => f.id !== id),
        })),
      resolveRiskFlag: (id, notes) =>
        set((state) => ({
          riskFlags: state.riskFlags.map((f) =>
            f.id === id
              ? {
                  ...f,
                  resolved: true,
                  resolution_notes: notes,
                  resolved_at: new Date().toISOString(),
                }
              : f
          ),
        })),

      // Estimate Actions
      setCurrentEstimate: (estimate) => set({ currentEstimate: estimate }),
      updateEstimate: (updates) =>
        set((state) => ({
          currentEstimate: state.currentEstimate
            ? { ...state.currentEstimate, ...updates }
            : null,
        })),
      setEstimateNotes: (notes) => set({ estimateNotes: notes }),
      addEstimateNote: (note) =>
        set((state) => ({ estimateNotes: [...state.estimateNotes, note] })),
      removeEstimateNote: (id) =>
        set((state) => ({
          estimateNotes: state.estimateNotes.filter((n) => n.id !== id),
        })),

      // Settings Actions
      setUserSettings: (settings) => set({ userSettings: settings }),
      updateUserSettings: (updates) =>
        set((state) => ({
          userSettings: state.userSettings
            ? { ...state.userSettings, ...updates }
            : null,
        })),

      // UI Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTakeoffTab: (tab) => set({ takeoffTab: tab }),
      setSelectedEquipmentId: (id) => set({ selectedEquipmentId: id }),
      setSelectedDuctworkId: (id) => set({ selectedDuctworkId: id }),
      setAiExtracting: (extracting) => set({ isAiExtracting: extracting }),

      // Bulk Actions
      importTakeoffData: (data) => {
        set((state) => ({
          equipment: data.equipment
            ? [...state.equipment, ...data.equipment]
            : state.equipment,
          ductwork: data.ductwork
            ? [...state.ductwork, ...data.ductwork]
            : state.ductwork,
          airDevices: data.airDevices
            ? [...state.airDevices, ...data.airDevices]
            : state.airDevices,
          controls: data.controls
            ? [...state.controls, ...data.controls]
            : state.controls,
          piping: data.piping
            ? [...state.piping, ...data.piping]
            : state.piping,
        }));
        get().recalculateTakeoffSummary();
      },
      clearTakeoff: () => {
        set({
          equipment: [],
          ductwork: [],
          fittings: [],
          airDevices: [],
          controls: [],
          piping: [],
          dampers: [],
          takeoffSummary: null,
        });
      },

      // Computed Actions
      recalculateTakeoffSummary: () => {
        const state = get();

        const equipmentByType: Record<string, number> = {};
        let totalTons = 0;
        let totalCfm = 0;

        for (const eq of state.equipment) {
          equipmentByType[eq.equipment_type] =
            (equipmentByType[eq.equipment_type] || 0) + eq.quantity;
          totalTons += (eq.cooling_tons || 0) * eq.quantity;
          totalCfm += (eq.cfm || 0) * eq.quantity;
        }

        const ductworkByType: Record<string, number> = {};
        const ductworkBySize: Record<string, number> = {};
        let totalDuctLf = 0;

        for (const duct of state.ductwork) {
          ductworkByType[duct.duct_type] =
            (ductworkByType[duct.duct_type] || 0) + duct.linear_feet;
          if (duct.size_display) {
            ductworkBySize[duct.size_display] =
              (ductworkBySize[duct.size_display] || 0) + duct.linear_feet;
          }
          totalDuctLf += duct.linear_feet;
        }

        const airDevicesByType: Record<string, number> = {};
        let totalAirDevices = 0;

        for (const device of state.airDevices) {
          airDevicesByType[device.device_type] =
            (airDevicesByType[device.device_type] || 0) + device.quantity;
          totalAirDevices += device.quantity;
        }

        const controlsByType: Record<string, number> = {};
        let totalControls = 0;

        for (const control of state.controls) {
          controlsByType[control.control_type] =
            (controlsByType[control.control_type] || 0) + control.quantity;
          totalControls += control.quantity;
        }

        const pipingByType: Record<string, number> = {};
        let totalPipingLf = 0;

        for (const pipe of state.piping) {
          pipingByType[pipe.piping_type] =
            (pipingByType[pipe.piping_type] || 0) + pipe.linear_feet;
          totalPipingLf += pipe.linear_feet;
        }

        set({
          takeoffSummary: {
            equipment: {
              total_units: state.equipment.reduce((sum, e) => sum + e.quantity, 0),
              total_tons: totalTons,
              total_cfm: totalCfm,
              by_type: equipmentByType as any,
            },
            ductwork: {
              total_lf: totalDuctLf,
              by_type: ductworkByType as any,
              by_size: ductworkBySize,
            },
            air_devices: {
              total_count: totalAirDevices,
              by_type: airDevicesByType as any,
            },
            controls: {
              total_count: totalControls,
              by_type: controlsByType as any,
            },
            piping: {
              total_lf: totalPipingLf,
              by_type: pipingByType as any,
            },
          },
        });
      },

      recalculateRiskScoring: () => {
        const state = get();
        const checklist = state.checklist;

        if (!checklist) {
          set({ riskScoring: null });
          return;
        }

        // Design Completeness Score
        const designFactors = {
          hasLoadCalc: checklist.b_load_calc,
          hasEquipmentSchedule: checklist.c_system_type,
          hasControlSequence: checklist.f_bas_integration,
          hasMechanicalDetails: checklist.a_mechanical_drawings,
          hasSpecifications: checklist.a_specifications,
        };
        const designScore =
          (Object.values(designFactors).filter(Boolean).length /
            Object.keys(designFactors).length) *
          100;

        // Coordination Risk Score
        const coordFactors = {
          electricalClear: checklist.h_electrical_by_others,
          penetrationsDefined: checklist.g_penetrations,
        };
        const coordScore =
          (Object.values(coordFactors).filter(Boolean).length /
            Object.keys(coordFactors).length) *
          100;

        // Logistics Risk Score
        const logisticsFactors = {
          craneRequired: checklist.i_requires_crane,
          occupiedSpace: checklist.i_occupied_space,
          stagingAvailable: checklist.i_staging_area,
          phasingRequired: checklist.i_phasing,
        };
        const logisticsScore =
          (Object.values(logisticsFactors).filter(Boolean).length /
            Object.keys(logisticsFactors).length) *
          100;

        // Scope Clarity Score
        const scopeFactors = {
          tabScopeDefined: checklist.j_tab_scope,
          commissioningDefined: checklist.j_commissioning,
          exclusionsDocumented: checklist.k_exclusions_listed,
        };
        const scopeScore =
          (Object.values(scopeFactors).filter(Boolean).length /
            Object.keys(scopeFactors).length) *
          100;

        // Supply Chain Score (based on equipment having lead times noted)
        const supplyScore = checklist.c_lead_times ? 80 : 40;

        // Overall Score
        const overallScore =
          designScore * 0.25 +
          coordScore * 0.25 +
          logisticsScore * 0.2 +
          scopeScore * 0.2 +
          supplyScore * 0.1;

        // Risk Level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        if (overallScore >= 80) riskLevel = 'low';
        else if (overallScore >= 60) riskLevel = 'medium';
        else if (overallScore >= 40) riskLevel = 'high';
        else riskLevel = 'critical';

        // Generate recommendations and red flags
        const recommendations: string[] = [];
        const redFlags: string[] = [];

        if (!checklist.b_load_calc) {
          redFlags.push('No load calculation provided');
          recommendations.push('Request Manual J/N load calculation from engineer');
        }
        if (!checklist.j_tab_scope) {
          recommendations.push('Clarify TAB scope and responsibilities');
        }
        if (checklist.i_requires_crane && !checklist.i_staging_area) {
          redFlags.push('Crane required but no staging area confirmed');
        }
        if (!checklist.k_exclusions_listed) {
          recommendations.push('Document exclusions before submittal');
        }

        set({
          riskScoring: {
            design_completeness: { score: designScore, factors: designFactors },
            coordination_risk: { score: coordScore, factors: coordFactors },
            logistics_risk: { score: logisticsScore, factors: logisticsFactors },
            scope_clarity: { score: scopeScore, factors: scopeFactors },
            supply_chain: { score: supplyScore, factors: {} },
            overall_score: overallScore,
            risk_level: riskLevel,
            recommendations,
            red_flags: redFlags,
          },
        });
      },

      // Reset
      resetStore: () => set(initialState),
    }),
    { name: 'hvac-store' }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectCurrentProject = (state: HvacState) => state.currentProject;
export const selectEquipment = (state: HvacState) => state.equipment;
export const selectDuctwork = (state: HvacState) => state.ductwork;
export const selectAirDevices = (state: HvacState) => state.airDevices;
export const selectControls = (state: HvacState) => state.controls;
export const selectPiping = (state: HvacState) => state.piping;
export const selectChecklist = (state: HvacState) => state.checklist;
export const selectRiskFlags = (state: HvacState) => state.riskFlags;
export const selectCurrentEstimate = (state: HvacState) => state.currentEstimate;
export const selectTakeoffSummary = (state: HvacState) => state.takeoffSummary;
export const selectRiskScoring = (state: HvacState) => state.riskScoring;
export const selectActiveTab = (state: HvacState) => state.activeTab;
export const selectTakeoffTab = (state: HvacState) => state.takeoffTab;

// Equipment by type selector
export const selectEquipmentByType = (type: string) => (state: HvacState) =>
  state.equipment.filter((e) => e.equipment_type === type);

// Ductwork by type selector
export const selectDuctworkByType = (type: string) => (state: HvacState) =>
  state.ductwork.filter((d) => d.duct_type === type);

// Unresolved risk flags selector
export const selectUnresolvedRiskFlags = (state: HvacState) =>
  state.riskFlags.filter((f) => !f.resolved);

// Critical risk flags selector
export const selectCriticalRiskFlags = (state: HvacState) =>
  state.riskFlags.filter((f) => f.severity === 'critical' && !f.resolved);
