"use client"
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { usePricingStore } from '@/lib/pricing-store'
import { ModeToggle } from './ModeToggle'
import { useQuoteStore } from '@/lib/quote/store'

interface QuoteToolbarProps {
  onSettings?: () => void
  onSendQuote?: () => void
  onSaveDraft?: () => void
  address?: string
  geocodeStatus?: 'idle' | 'loading' | 'error' | 'success'
  geocodeMessage?: string | null
}

export default function QuoteToolbar({ onSettings, onSendQuote, onSaveDraft, address, geocodeStatus = 'idle', geocodeMessage }: QuoteToolbarProps) {
  const router = useRouter()
  const liveMeasurements = usePricingStore((s) => s.liveMeasurements)
  const hasDrawings = liveMeasurements && (liveMeasurements.totalArea > 0 || liveMeasurements.totalPerimeter > 0)
  const requestClear = useAppStore((s) => s.requestClear)
  const requestCommand = useAppStore((s) => s.requestCommand)
  const workflowMode = useQuoteStore((s) => s.workflowMode)
  const setWorkflowMode = useQuoteStore((s) => s.setWorkflowMode)

  const advancedActive = workflowMode === 'EDIT'
  const toggleWorkflowMode = () => {
    setWorkflowMode(advancedActive ? 'QUOTE' : 'EDIT')
  }

  const statusLabel = (() => {
    if (geocodeStatus === 'loading') return geocodeMessage || 'Locking onto address…'
    if (geocodeStatus === 'error') return geocodeMessage || 'Unable to locate address'
    if (geocodeStatus === 'success') return geocodeMessage || null
    return geocodeMessage
  })()

  return (
    <div className="quote-toolbar">
      <div className="quote-toolbar-info">
        <div className={`quote-mode-badge ${advancedActive ? 'quote-mode-edit' : ''}`}>
          <span className="quote-mode-dot" />
          {advancedActive ? 'EDIT MODE' : 'QUOTE MODE'}
        </div>
        <div className="quote-toolbar-address">
          <button
            className="quote-toolbar-label quote-toolbar-address-btn"
            onClick={() => router.push('/quote/new')}
            title="Click to change address or start new quote"
          >
            {address || 'Waiting for address'}
            <span className="quote-toolbar-change">✎</span>
          </button>
          {statusLabel && (
            <div className={`quote-toolbar-status status-${geocodeStatus}`}>
              {statusLabel}
            </div>
          )}
        </div>
      </div>

      <div className="quote-toolbar-controls">
        <div className="quote-toolbar-group">
          <button
            className="btn btn-tool"
            onClick={() => requestCommand('undo')}
            title="Undo (Ctrl+Z)"
          >
            <span className="tool-icon">↩</span>
          </button>
          <button
            className="btn btn-tool"
            onClick={() => requestCommand('redo')}
            title="Redo (Ctrl+Y)"
          >
            <span className="tool-icon">↪</span>
          </button>
          <button
            className="btn btn-tool"
            onClick={requestClear}
            title="Clear All"
          >
            <span className="tool-icon">✕</span>
          </button>
        </div>

        <div className="quote-toolbar-group advanced-toggle">
          <button
            className={`btn btn-tool ${advancedActive ? 'btn-tool-active' : ''}`}
            onClick={toggleWorkflowMode}
            title="Toggle Advanced Mode"
          >
            ⚙ Advanced
          </button>
          {advancedActive && (
            <>
              <ModeToggle />
              <button className="btn btn-tool" onClick={onSettings}>
                Pricing
              </button>
            </>
          )}
        </div>

        <div className="quote-toolbar-actions">
          <button
            className="btn btn-secondary"
            onClick={onSaveDraft}
          >
            Save Draft
          </button>
          <button
            className="btn btn-primary btn-send-quote"
            onClick={onSendQuote}
            disabled={!hasDrawings}
            title={hasDrawings ? 'Send quote to customer' : 'Draw on the map first'}
          >
            Send Quote
          </button>
        </div>
      </div>
    </div>
  )
}
