"use client"
import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { usePricingStore } from '@/lib/pricing-store'
import { useQuoteStore } from '@/lib/quote/store'

export default function CursorTooltip() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const lastUpdateRef = useRef(0)

  const mode = useAppStore((s) => s.mode)
  const liveMeasurements = usePricingStore((s) => s.liveMeasurements)
  const templates = useQuoteStore((s) => s.templates)
  const activeServiceId = useQuoteStore((s) => s.activeServiceId)

  const activeTemplate = templates.find(t => t.id === activeServiceId)

  let measurementValue = 0
  if (liveMeasurements && activeTemplate) {
    if (activeTemplate.measurementType === 'AREA') {
      measurementValue = liveMeasurements.totalArea || 0
    } else if (activeTemplate.measurementType === 'LENGTH') {
      measurementValue = liveMeasurements.totalPerimeter || 0
    }
  }

  const rawSubtotal = activeTemplate ? measurementValue * activeTemplate.defaultRate : 0
  const minimum = activeTemplate?.minimumCharge ?? 0
  const minApplied = rawSubtotal > 0 && minimum > rawSubtotal
  const subtotal = rawSubtotal > 0 ? (minApplied ? minimum : rawSubtotal) : 0

  // Track mouse position with throttling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastUpdateRef.current < 16) return // ~60fps throttle
      lastUpdateRef.current = now
      setPosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Show tooltip when in drawing mode and we have measurements
  useEffect(() => {
    const isDrawingMode = mode === 'freehand' || mode === 'polygon' || mode === 'line'
    const hasMeasurements = measurementValue > 0
    setVisible(isDrawingMode && hasMeasurements)
  }, [mode, measurementValue])

  if (!visible || !activeTemplate || measurementValue === 0) return null

  return (
    <div
      className="cursor-tooltip"
      style={{
        left: position.x + 20,
        top: position.y - 10,
      }}
    >
      <div className="cursor-tooltip-area">
        {measurementValue.toLocaleString()} {activeTemplate.unitLabel}
      </div>
      <div className="cursor-tooltip-price">
        ${Math.round(subtotal).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        {minApplied && <span className="cursor-tooltip-min">min</span>}
      </div>
    </div>
  )
}
