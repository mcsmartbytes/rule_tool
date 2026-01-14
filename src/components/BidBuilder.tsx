"use client"

import { useState, useMemo } from 'react'
import { usePricingStore } from '@/lib/pricing-store'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatHours, getCostBreakdown } from '@/lib/pricing-engine'
import type { ServiceType, BidLineItem } from '@/lib/pricing-types'
import PricingConfigModal from './PricingConfigModal'

interface BidBuilderProps {
  onClose: () => void
}

export default function BidBuilder({ onClose }: BidBuilderProps) {
  const currentBid = usePricingStore((s) => s.currentBid)
  const previewBid = usePricingStore((s) => s.previewBid)
  const committedMeasurements = usePricingStore((s) => s.committedMeasurements)
  const getActiveConfig = usePricingStore((s) => s.getActiveConfig)
  const addLineItem = usePricingStore((s) => s.addLineItem)
  const removeLineItem = usePricingStore((s) => s.removeLineItem)
  const updateLineItem = usePricingStore((s) => s.updateLineItem)
  const setMargin = usePricingStore((s) => s.setMargin)
  const updateBidContext = usePricingStore((s) => s.updateBidContext)
  const closeBidBuilder = usePricingStore((s) => s.closeBidBuilder)
  const runFinalPricing = usePricingStore((s) => s.runFinalPricing)

  const unitSystem = useAppStore((s) => s.unitSystem)
  const requestCommand = useAppStore((s) => s.requestCommand)

  const [showServiceSelect, setShowServiceSelect] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [customQuantity, setCustomQuantity] = useState<number | ''>('')
  const [showPricingConfig, setShowPricingConfig] = useState(false)

  const config = getActiveConfig()

  const bid = previewBid ?? currentBid
  const isPreview = Boolean(previewBid)

  const costBreakdown = useMemo(() => {
    if (!bid) return null
    return getCostBreakdown(bid)
  }, [bid])

  if (!bid) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="glass modal bid-builder-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">Build Quote</div>
          <div className="modal-content" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📐</div>
            <h3>No Measurements</h3>
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>
              Draw shapes on the map first, then click Build Quote to start pricing.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  const handleAddLineItem = () => {
    if (!selectedServiceId || !bid) return

    const service = config.serviceTypes.find((s) => s.id === selectedServiceId)
    if (!service) return

    // Use custom quantity or default based on service type
    let quantity = customQuantity || 0
    if (!quantity) {
      if (service.pricingModel === 'area') {
        quantity = bid.measurements.totalArea
      } else if (service.pricingModel === 'linear') {
        quantity = bid.measurements.totalPerimeter
      } else {
        quantity = 1
      }
    }

    addLineItem(selectedServiceId, quantity)
    setShowServiceSelect(false)
    setSelectedServiceId(null)
    setCustomQuantity('')
  }

  const handleExportCSV = () => {
    if (!bid) return

    let csv = 'Quote Summary\n'
    csv += `Generated: ${new Date().toLocaleString()}\n`
    if (bid.customerName) csv += `Customer: ${bid.customerName}\n`
    if (bid.jobName) csv += `Job: ${bid.jobName}\n`
    if (bid.address) csv += `Address: ${bid.address}\n`
    csv += '\n'

    csv += 'Measurements\n'
    csv += `Total Area: ${bid.measurements.totalArea.toLocaleString()} sq ft\n`
    csv += `Total Perimeter: ${bid.measurements.totalPerimeter.toLocaleString()} ft\n`
    csv += '\n'

    csv += 'Service,Quantity,Unit,Labor Hrs,Labor $,Material $,Equipment $,Subtotal\n'
    bid.lineItems.forEach((li) => {
      csv += `"${li.serviceName}",${li.quantity.toFixed(1)},${li.unit},${li.laborHours.toFixed(2)},${li.laborCost.toFixed(2)},${li.materialCost.toFixed(2)},${li.equipmentCost.toFixed(2)},${(li.overridePrice ?? li.subtotal).toFixed(2)}\n`
    })
    csv += '\n'

    csv += `Subtotal,,,,,,,$${bid.subtotal.toFixed(2)}\n`
    csv += `Margin (${(bid.margin * 100).toFixed(0)}%),,,,,,,$${bid.marginAmount.toFixed(2)}\n`
    csv += `TOTAL,,,,,,,$${bid.total.toFixed(2)}\n`

    if (bid.riskFlags.length > 0) {
      csv += '\nRisk Flags\n'
      bid.riskFlags.forEach((flag) => {
        csv += `${flag.severity.toUpperCase()}: ${flag.message}\n`
      })
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quote-${bid.id.slice(4, 12)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportIIF = () => {
    if (!bid) return

    const docNum = `Q${bid.id.slice(4, 12).toUpperCase()}`
    const today = new Date().toISOString().split('T')[0]
    const memo = bid.notes || `Quote for ${bid.customerName || 'Customer'}`

    let iif = '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n'
    iif += '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tQNTY\tRATE\tINVITEM\tMEMO\n'
    iif += '!ENDTRNS\n'

    // Header transaction
    iif += `TRNS\tESTIMATE\t${today}\tAccounts Receivable\t${bid.customerName || 'Customer'}\t${bid.total.toFixed(2)}\t${docNum}\t${memo}\n`

    // Line items
    bid.lineItems.forEach((li) => {
      const effectivePrice = li.overridePrice ?? li.subtotal
      const rate = li.quantity > 0 ? effectivePrice / li.quantity : 0
      const desc = li.description || li.serviceName
      iif += `SPL\tESTIMATE\t${today}\tSales\t${bid.customerName || 'Customer'}\t-${effectivePrice.toFixed(2)}\t${li.quantity.toFixed(2)}\t${rate.toFixed(4)}\t${li.serviceName}\t${desc}\n`
    })

    // Margin as separate line if applicable
    if (bid.marginAmount > 0) {
      iif += `SPL\tESTIMATE\t${today}\tSales\t${bid.customerName || 'Customer'}\t-${bid.marginAmount.toFixed(2)}\t1\t${bid.marginAmount.toFixed(2)}\tMargin\tProfit Margin ${(bid.margin * 100).toFixed(0)}%\n`
    }

    iif += 'ENDTRNS\n'

    const blob = new Blob([iif], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estimate-${docNum}.iif`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const totalLaborHours = bid.lineItems.reduce((sum, li) => sum + li.laborHours, 0)

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 20 }}>
      <div
        className="glass modal bid-builder-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bid-header">
          <div className="bid-header-title">
            <span className="bid-header-icon">💰</span>
            <div>
              <div className="modal-title" style={{ marginBottom: 0 }}>Build Quote</div>
              <div className="bid-header-subtitle">Production-aware pricing</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() => setShowPricingConfig(true)}
              title="Configure pricing rates"
            >
              ⚙ Pricing Settings
            </button>
            <button
              className="btn btn-sm"
              onClick={runFinalPricing}
              title="Apply the latest committed measurements"
              disabled={!currentBid || !committedMeasurements}
            >
              ↻ Recalculate
            </button>
          </div>
        </div>

        <div className="bid-content">
          {/* Job Info */}
          <div className="bid-section bid-job-info">
            <div className="bid-section-title">Job Information</div>
            <div className="bid-job-fields">
              <input
                type="text"
                placeholder="Customer Name"
                value={bid.customerName || ''}
                onChange={(e) => updateBidContext({ customerName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Job Name"
                value={bid.jobName || ''}
                onChange={(e) => updateBidContext({ jobName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Address"
                value={bid.address || ''}
                onChange={(e) => updateBidContext({ address: e.target.value })}
              />
            </div>
          </div>

          {/* Measurements Summary */}
          <div className="bid-section bid-measurements">
            <div className="bid-section-title">Measurements (from map)</div>
            {isPreview && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px dashed var(--glass-border)',
                  padding: '8px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                Previewing live measurements – finish drawing or click Recalculate to lock them in.
              </div>
            )}
            <div className="bid-measurements-grid">
              <div className="bid-measurement">
                <span className="bid-measurement-label">Total Area</span>
                <span className="bid-measurement-value">
                  {bid.measurements.totalArea.toLocaleString()} sq ft
                </span>
              </div>
              <div className="bid-measurement">
                <span className="bid-measurement-label">Total Perimeter</span>
                <span className="bid-measurement-value">
                  {bid.measurements.totalPerimeter.toLocaleString()} ft
                </span>
              </div>
              {bid.measurements.heights.length > 0 && (
                <div className="bid-measurement">
                  <span className="bid-measurement-label">Heights</span>
                  <span className="bid-measurement-value">
                    {bid.measurements.heights.length} measured
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bid-section bid-line-items">
            <div className="bid-section-header">
              <span className="bid-section-title">Service Line Items</span>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowServiceSelect(true)}
              >
                + Add Service
              </button>
            </div>

            {bid.lineItems.length === 0 ? (
              <div className="bid-empty-items">
                Click “Add Service” to start building your quote
              </div>
            ) : (
              <div className="bid-items-list">
              {bid.lineItems.map((li) => (
                  <LineItemRow
                    key={li.id}
                    lineItem={li}
                    onUpdate={(updates) => updateLineItem(li.id, updates)}
                    onRemove={() => removeLineItem(li.id)}
                  />
                ))}
              </div>
            )}

            {/* Add Service Form */}
            {showServiceSelect && (
              <div className="bid-add-service">
                <select
                  value={selectedServiceId || ''}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                >
                  <option value="">Select a service...</option>
                  {config.serviceTypes.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.pricingModel === 'linear' ? 'linear' : 'area'})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Custom qty (optional)"
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: 140 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddLineItem}
                  disabled={!selectedServiceId}
                >
                  Add
                </button>
                <button className="btn" onClick={() => setShowServiceSelect(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Margin Slider */}
          {bid.lineItems.length > 0 && (
            <div className="bid-section bid-margin">
              <div className="bid-section-title">Profit Margin</div>
              <div className="bid-margin-control">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={bid.margin * 100}
                  onChange={(e) => setMargin(Number(e.target.value) / 100)}
                />
                <span className="bid-margin-value">{(bid.margin * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Risk Flags */}
          {bid.riskFlags.length > 0 && (
            <div className="bid-section bid-risks">
              <div className="bid-section-title">Risk Indicators</div>
              <div className="bid-risk-list">
                {bid.riskFlags.map((flag, i) => (
                  <div key={i} className={`bid-risk-flag ${flag.severity}`}>
                    <span className="bid-risk-icon">
                      {flag.severity === 'error' ? '⛔' : '⚠️'}
                    </span>
                    <span>{flag.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          {bid.lineItems.length > 0 && (
            <div className="bid-section bid-totals">
              <div className="bid-totals-breakdown">
                <div className="bid-total-row">
                  <span>Total Labor Hours</span>
                  <span>{formatHours(totalLaborHours)}</span>
                </div>
                {costBreakdown && (
                  <>
                    <div className="bid-total-row">
                      <span>Labor Cost ({costBreakdown.laborPercent.toFixed(0)}%)</span>
                      <span>{formatCurrency(costBreakdown.labor)}</span>
                    </div>
                    <div className="bid-total-row">
                      <span>Material Cost ({costBreakdown.materialPercent.toFixed(0)}%)</span>
                      <span>{formatCurrency(costBreakdown.material)}</span>
                    </div>
                    <div className="bid-total-row">
                      <span>Equipment ({costBreakdown.equipmentPercent.toFixed(0)}%)</span>
                      <span>{formatCurrency(costBreakdown.equipment)}</span>
                    </div>
                  </>
                )}
                <div className="bid-total-row bid-subtotal">
                  <span>Subtotal</span>
                  <span>{formatCurrency(bid.subtotal)}</span>
                </div>
                <div className="bid-total-row">
                  <span>Margin ({(bid.margin * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(bid.marginAmount)}</span>
                </div>
                <div className="bid-total-row bid-grand-total">
                  <span>TOTAL</span>
                  <span>{formatCurrency(bid.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Export Actions */}
          <div className="bid-section bid-actions">
            <button className="btn" onClick={handleExportCSV}>
              📊 Export CSV
            </button>
            <button className="btn" onClick={handleExportIIF}>
              📒 Export QuickBooks
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Pricing Config Modal */}
      {showPricingConfig && (
        <PricingConfigModal onClose={() => setShowPricingConfig(false)} />
      )}
    </div>
  )
}

// Line Item Row Component
function LineItemRow({
  lineItem,
  onUpdate,
  onRemove,
}: {
  lineItem: BidLineItem
  onUpdate: (updates: { quantity?: number; description?: string; overridePrice?: number }) => void
  onRemove: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editQty, setEditQty] = useState(lineItem.quantity)
  const [editPrice, setEditPrice] = useState<number | ''>(lineItem.overridePrice ?? '')

  const effectivePrice = lineItem.overridePrice ?? lineItem.subtotal

  const handleSave = () => {
    onUpdate({
      quantity: editQty,
      overridePrice: editPrice === '' ? undefined : editPrice,
    })
    setIsEditing(false)
  }

  return (
    <div className="bid-line-item">
      <div className="bid-line-item-main">
        <div className="bid-line-item-info">
          <span className="bid-line-item-name">{lineItem.serviceName}</span>
          <span className="bid-line-item-meta">
            {lineItem.quantity.toLocaleString()} {lineItem.unit} |{' '}
            {formatHours(lineItem.laborHours)} labor
          </span>
        </div>
        <div className="bid-line-item-price">
          {formatCurrency(effectivePrice)}
          {lineItem.overridePrice !== undefined && (
            <span className="bid-override-badge">custom</span>
          )}
        </div>
        <div className="bid-line-item-actions">
          <button
            className="btn btn-sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button className="btn btn-sm btn-danger" onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="bid-line-item-edit">
          <div className="bid-line-item-edit-field">
            <label>Quantity ({lineItem.unit})</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={editQty}
              onChange={(e) => setEditQty(Number(e.target.value))}
            />
          </div>
          <div className="bid-line-item-edit-field">
            <label>Override Price ($)</label>
            <input
              type="number"
              min={0}
              step={1}
              placeholder={lineItem.subtotal.toFixed(2)}
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save
          </button>
        </div>
      )}

      <div className="bid-line-item-breakdown">
        <span>Labor: {formatCurrency(lineItem.laborCost)}</span>
        <span>Material: {formatCurrency(lineItem.materialCost)}</span>
        <span>Equipment: {formatCurrency(lineItem.equipmentCost)}</span>
      </div>
    </div>
  )
}
