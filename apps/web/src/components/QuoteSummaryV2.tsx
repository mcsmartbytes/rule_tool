"use client"
import { useEffect, useRef, useState } from 'react'
import { useQuoteStore } from "@/lib/quote/store"

export function QuoteSummaryV2() {
  const total = useQuoteStore(s => s.total)
  const lines = useQuoteStore(s => s.lines)
  const geometries = useQuoteStore(s => s.geometries)

  // Pulse animation when amount changes
  const [isPulsing, setIsPulsing] = useState(false)
  const prevAmountRef = useRef(0)

  useEffect(() => {
    if (total !== prevAmountRef.current && total > 0) {
      setIsPulsing(true)
      const timer = setTimeout(() => setIsPulsing(false), 300)
      prevAmountRef.current = total
      return () => clearTimeout(timer)
    }
  }, [total])

  const hasDrawings = geometries.length > 0

  return (
    <div className="quote-summary">
      <div className="quote-summary-header">
        <div className="quote-summary-eyebrow">Live Quote</div>
        <p>Numbers update with every draw, undo, or service switch.</p>
      </div>

      <div className="quote-hero">
        <div className="quote-hero-label">ESTIMATED TOTAL</div>
        <div className={`quote-hero-amount ${isPulsing ? 'pulse' : ''}`}>
          ${Math.round(total).toLocaleString()}
        </div>
        {!hasDrawings && (
          <div className="quote-hero-hint">Draw on the map to see pricing</div>
        )}
      </div>

      {/* Smart Warnings */}
      {lines.some(l => l.minApplied) && (
        <div className="quote-smart-warnings">
          {lines.filter(l => l.minApplied).map(l => (
            <div key={l.serviceId} className="quote-warning quote-warning-info">
              <span className="quote-warning-icon">$</span>
              <span>{l.serviceName}: Minimum ${l.subtotal.toFixed(0)} applied</span>
            </div>
          ))}
        </div>
      )}

      <div className="quote-line-items">
        {lines.length === 0 && (
          <div className="quote-line-item empty">No services measured yet.</div>
        )}
        {lines.map(l => (
          <div key={l.serviceId} className="quote-line-item">
            <div className="quote-line-item-header">
              <span className="quote-line-item-name">{l.serviceName}</span>
              <span className="quote-line-item-price">${Math.round(l.subtotal).toLocaleString()}</span>
            </div>
            <div className="quote-line-item-calc">
              <span>{l.qty.toLocaleString()} {l.unitLabel}</span>
              <span>× ${l.rate.toFixed(2)}</span>
              {l.minApplied && <span className="quote-line-item-min">min applied</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Details toggle */}
      {hasDrawings && (
        <details className="quote-details">
          <summary>View details</summary>
          <div className="quote-details-content">
            <div className="quote-detail-row">
              <span>Shapes</span>
              <span>{geometries.length}</span>
            </div>
            {lines.map(l => (
              <div key={l.serviceId} className="quote-detail-row">
                <span>{l.serviceName}</span>
                <span>{l.qty.toFixed(0)} {l.unitLabel}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
