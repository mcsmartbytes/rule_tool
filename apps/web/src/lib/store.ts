import { create } from 'zustand'

export type UnitSystem = 'metric' | 'imperial'
export type Mode = 'pan' | 'polygon' | 'line' | 'freehand' | 'text' | 'height' | 'stall' | 'concrete' | 'rectangle' | 'circle'

export type MapStyleId =
  | 'auto'
  | 'mapbox://styles/mapbox/streets-v12'
  | 'mapbox://styles/mapbox/outdoors-v12'
  | 'mapbox://styles/mapbox/satellite-streets-v12'
  | 'mapbox://styles/mapbox/light-v11'
  | 'mapbox://styles/mapbox/dark-v11'

type Measurements = {
  area?: number // square meters
  length?: number // meters
  heights?: Array<{ id: string; value: number; label: string; lng: number; lat: number }> // meters
}

type Store = {
  unitSystem: UnitSystem
  mode: Mode
  measurements: Measurements
  clearTick: number
  styleId: MapStyleId
  smoothing: number // 0..10 (affects simplify tolerance)
  command?: { type: string; id: number; payload?: unknown }
  hydrated: boolean
  mapEnabled: boolean
  notes: string
  enable3D: boolean
  setUnitSystem: (u: UnitSystem) => void
  toggleUnits: () => void
  setMode: (m: Mode) => void
  setMeasurements: (m: Measurements) => void
  requestClear: () => void
  setStyleId: (s: MapStyleId) => void
  setSmoothing: (n: number) => void
  requestCommand: (type: string, payload?: unknown) => void
  setHydrated: () => void
  setMapEnabled: (v: boolean) => void
  setNotes: (n: string) => void
  setEnable3D: (v: boolean) => void
}

export const useAppStore = create<Store>((set, get) => ({
  // Deterministic defaults for SSR/CSR to avoid hydration mismatches
  unitSystem: 'metric',
  mode: 'freehand',
  measurements: {},
  clearTick: 0,
  styleId: 'auto',
  smoothing: 2,
  command: undefined,
  hydrated: false,
  mapEnabled: false,
  notes: '',
  enable3D: false,
  setUnitSystem: (u) => {
    try { localStorage.setItem('UNIT_SYSTEM', u) } catch {}
    set({ unitSystem: u })
  },
  toggleUnits: () => {
    const next = get().unitSystem === 'metric' ? 'imperial' : 'metric'
    try { localStorage.setItem('UNIT_SYSTEM', next) } catch {}
    set({ unitSystem: next })
  },
  setMode: (m) => set({ mode: m }),
  setMeasurements: (m) => set({ measurements: m }),
  requestClear: () => set((s) => ({ clearTick: s.clearTick + 1, measurements: { heights: [] } })),
  setStyleId: (s) => { try { localStorage.setItem('MAP_STYLE', s) } catch {}; set({ styleId: s }) },
  setSmoothing: (n) => { try { localStorage.setItem('SMOOTHING', String(n)) } catch {}; set({ smoothing: n }) },
  requestCommand: (type, payload) => set(() => ({ command: { type, id: Date.now(), payload } })),
  setHydrated: () => set({ hydrated: true }),
  setMapEnabled: (v) => set({ mapEnabled: v }),
  setNotes: (n) => { try { localStorage.setItem('SITE_NOTES', n) } catch {}; set({ notes: n }) },
  setEnable3D: (v) => { try { localStorage.setItem('ENABLE_3D', v ? '1' : '0') } catch {}; set({ enable3D: v }) },
}))
