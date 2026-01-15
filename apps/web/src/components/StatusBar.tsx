"use client"
import { useAppStore, type Mode } from '@/lib/store'
import { useMounted } from '@/lib/useMounted'

function modeHint(mode: Mode) {
  switch (mode) {
    case 'freehand':
      return 'Drag to sketch area. Release to finish.'
    case 'polygon':
      return 'Click to add vertices. Double‑click to finish.'
    case 'line':
      return 'Click to measure distance. Double‑click to finish.'
    case 'pan':
    default:
      return 'Pan/Select. Use tools to draw.'
  }
}

export default function StatusBar() {
  const mode = useAppStore((s) => s.mode)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const toggleUnits = useAppStore((s) => s.toggleUnits)
  const mounted = useMounted()
  return (
    <div className="glass status-bar">
      <div className="status-left">
        <span className="status-dot" aria-hidden>●</span>
        <span className="status-mode">{mode === 'pan' ? 'Pan' : mode === 'polygon' ? 'Polygon' : mode === 'line' ? 'Length' : 'Freehand'}</span>
        <span className="status-sep">•</span>
        <span className="status-hint">{modeHint(mode)}</span>
      </div>
      <div className="status-right">
        <button className="btn btn-quiet" onClick={toggleUnits} title="Toggle units (U)" suppressHydrationWarning>
          Units: {mounted ? (unitSystem === 'metric' ? 'Metric' : 'Imperial') : '…'}
        </button>
      </div>
    </div>
  )
}
