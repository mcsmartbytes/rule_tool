"use client"
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { formatArea, formatLength } from '@/lib/format'

export default function MetricsPanel() {
  const unitSystem = useAppStore((s) => s.unitSystem)
  const measurements = useAppStore((s) => s.measurements)
  const ready = useAppStore((s) => s.hydrated)

  const area = measurements.area
  const length = measurements.length
  const heights = measurements.heights || []

  const [tokenMissing, setTokenMissing] = useState(false)
  useEffect(() => {
    try {
      const hasEnv = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const hasLs = typeof window !== 'undefined' && !!localStorage.getItem('MAPBOX_TOKEN')
      setTokenMissing(!(hasEnv || hasLs))
    } catch {
      setTokenMissing(true)
    }
  }, [])

  const copySummary = async () => {
    const parts: string[] = []
    if (area != null) parts.push(`Area: ${formatArea(area, unitSystem)}`)
    if (length != null) parts.push(`Length: ${formatLength(length, unitSystem)}`)
    if (heights.length > 0) {
      const heightStr = heights.map(h => h.label).join(', ')
      parts.push(`Heights: ${heightStr}`)
    }
    const text = parts.join(' | ') || 'No measurements'
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  if (!ready) {
    return (
      <div className="glass metrics">
        <div className="metric-line"><span className="metric-label">Loading</span><span>…</span></div>
      </div>
    )
  }

  return (
    <div className="glass metrics">
      <div className="metrics-head">
        <div className="metrics-title">Measurements</div>
        <button className="btn btn-quiet" onClick={copySummary} title="Copy summary">⧉ Copy</button>
      </div>
      {area != null && (
        <div className="metric-line">
          <span className="metric-label">Area</span>
          <span className="metric-value">{formatArea(area, unitSystem)}</span>
        </div>
      )}
      {length != null && (
        <div className="metric-line">
          <span className="metric-label">Length</span>
          <span className="metric-value">{formatLength(length, unitSystem)}</span>
        </div>
      )}
      {heights.length > 0 && (
        <div className="metric-line">
          <span className="metric-label">Heights ({heights.length})</span>
          <span className="metric-value" style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
            {heights.map(h => (
              <span key={h.id}>{h.label}</span>
            ))}
          </span>
        </div>
      )}
      {area == null && length == null && heights.length === 0 && (
        <div className="metric-line"><span className="metric-label">Tip</span><span>Draw an area or line, or add heights</span></div>
      )}
      <div className="metric-foot">Units: {unitSystem === 'metric' ? 'Metric' : 'Imperial'}</div>
      {tokenMissing && (
        <div className="token-warning">No Mapbox token detected. Add <code>?token=YOUR_TOKEN</code> to the URL or set <code>localStorage.MAPBOX_TOKEN</code>.</div>
      )}
    </div>
  )
}
