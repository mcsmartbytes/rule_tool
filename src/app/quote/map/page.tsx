"use client"
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MapView from '@/components/MapView'
import QuoteToolbar from '@/components/QuoteToolbar'
import { ServiceRail } from '@/components/ServiceRail'
import { QuoteSummaryV2 } from '@/components/QuoteSummaryV2'
import CursorTooltip from '@/components/CursorTooltip'
import PrefHydrator from '@/components/PrefHydrator'
import PhotoMeasureModal from '@/components/PhotoMeasureModal'
import { useMounted } from '@/lib/useMounted'
import ErrorBoundary from '@/components/ErrorBoundary'
import BidBuilder from '@/components/BidBuilder'
import PricingConfigModal from '@/components/PricingConfigModal'
import { usePricingStore } from '@/lib/pricing-store'
import { useQuoteStore } from '@/lib/quote/store'
import { useSyncMeasurements } from '@/lib/quote/useSyncMeasurements'
import { getIndustryTemplates } from '@/lib/quote/industries'
import { readToken } from '@/lib/token'
import { useAppStore } from '@/lib/store'
import LiveQuotePanelConcrete from '@/components/LiveQuotePanelConcrete'
import ConcreteSlabDetails from '@/components/ConcreteSlabDetails'
import ConcreteLineSelector from '@/components/ConcreteLineSelector'
import ConcreteMeasurementsList from '@/components/ConcreteMeasurementsList'
import { useConcreteStore, useSelectedMeasurement } from '@/lib/concrete/store'

function QuoteMapPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null)
  const lastAddressRef = useRef<string | null>(null)
  const [industryId, setIndustryId] = useState<string | null>(null)
  const mounted = useMounted()
  const [showBidBuilder, setShowBidBuilder] = useState(false)
  const [showPricingConfig, setShowPricingConfig] = useState(false)
  const [showPhotoMeasure, setShowPhotoMeasure] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [flags, setFlags] = useState<{ legacy?: boolean }>({})
  const [showConcreteMeasurements, setShowConcreteMeasurements] = useState(false)
  const addressParam = searchParams?.get('address')?.trim() ?? ''
  const isConcrete = industryId === 'concrete'
  const selectedConcreteMeasurement = useSelectedMeasurement()
  const clearConcrete = useConcreteStore((s) => s.clearAll)

  const createNewBid = usePricingStore((s) => s.createNewBid)
  const hydratePricing = usePricingStore((s) => s.hydrate)
  const pricingHydrated = usePricingStore((s) => s.hydrated)

  // New quote store
  const setTemplates = useQuoteStore(s => s.setTemplates)
  const setActiveService = useQuoteStore(s => s.setActiveService)
  const setQuoteAddress = useQuoteStore(s => s.setQuoteAddress)
  const requestMapFocus = useQuoteStore(s => s.requestMapFocus)
  const quoteAddress = useQuoteStore(s => s.quoteAddress)
  const mode = useQuoteStore(s => s.mode)
  const setStyleId = useAppStore((s) => s.setStyleId)
  const setMode = useAppStore((s) => s.setMode)

  useEffect(() => {
    if (!mounted) return

    // Check URL params for industry (embedded mode)
    const urlIndustry = searchParams?.get('industry')
    if (urlIndustry) {
      try { localStorage.setItem('QUOTE_INDUSTRY', urlIndustry) } catch {}
      setIndustryId(urlIndustry)
      return
    }

    try {
      const stored = localStorage.getItem('QUOTE_INDUSTRY') || null
      if (!stored) {
        router.replace('/onboarding')
        return
      }
      setIndustryId(stored)
    } catch {
      setIndustryId(null)
    }
  }, [router, mounted, searchParams])

  useEffect(() => {
    if (!industryId) return
    const templates = getIndustryTemplates(industryId)
    setTemplates(templates)
    if (templates.length > 0) {
      setActiveService(templates[0].id)
    }
  }, [industryId, setTemplates, setActiveService])

  useEffect(() => {
    setStyleId('mapbox://styles/mapbox/satellite-streets-v12')
  }, [setStyleId])

  // Auto-set concrete mode when industry is concrete
  useEffect(() => {
    if (isConcrete) {
      setMode('concrete')
    }
  }, [isConcrete, setMode])

  useEffect(() => {
    if (addressParam) {
      setQuoteAddress(addressParam)
    }
  }, [addressParam, setQuoteAddress])

  useEffect(() => {
    if (!mounted) return
    if (!addressParam && !quoteAddress) {
      router.replace('/quote/new')
    }
  }, [addressParam, quoteAddress, router, mounted])

  useEffect(() => {
    const targetAddress = addressParam || quoteAddress
    if (!targetAddress) return
    if (lastAddressRef.current === targetAddress) return

    let cancelled = false
    const lookup = async () => {
      const { token } = readToken()
      if (!token) {
        setGeocodeStatus('error')
        setGeocodeMessage('Add a Mapbox token to locate the site')
        return
      }
      setGeocodeStatus('loading')
      setGeocodeMessage('Locking onto address…')
      try {
        const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(targetAddress)}.json?limit=1&access_token=${token}`)
        const data = await resp.json()
        if (cancelled) return
        const feature = data?.features?.[0]
        if (feature?.center?.length >= 2) {
          const [lng, lat] = feature.center
          requestMapFocus({ lng, lat, zoom: 19, address: feature.place_name || targetAddress })
          lastAddressRef.current = targetAddress
          setGeocodeStatus('success')
          setGeocodeMessage(feature?.place_name || targetAddress)
        } else {
          setGeocodeStatus('error')
          setGeocodeMessage('Could not find that address')
        }
      } catch (err) {
        if (cancelled) return
        setGeocodeStatus('error')
        setGeocodeMessage('Address lookup failed')
      }
    }
    lookup()
    return () => { cancelled = true }
  }, [addressParam, quoteAddress, requestMapFocus])

  // Bridge old measurements to new quote store
  useSyncMeasurements()

  // Hydrate pricing store on mount
  useEffect(() => {
    if (!pricingHydrated) {
      hydratePricing()
    }
  }, [pricingHydrated, hydratePricing])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      setFlags({
        legacy: url.searchParams.get('legacy') != null,
      })
    } catch {}
  }, [])

  const handleBuildQuote = () => {
    createNewBid()
    setShowBidBuilder(true)
  }

  // Get quote data from store (needed for Send Quote and Save Draft)
  const toMeasurementDoc = useQuoteStore(s => s.toMeasurementDoc)
  const geometries = useQuoteStore(s => s.geometries)
  const lines = useQuoteStore(s => s.lines)
  const total = useQuoteStore(s => s.total)

  const handleSendQuote = async () => {
    // Check if embedded - if so, send to parent via postMessage
    const isEmbedded = typeof window !== 'undefined' && window.parent !== window

    // Debug logging
    console.log('handleSendQuote called')
    console.log('lines:', lines)
    console.log('geometries:', geometries)
    console.log('total:', total)

    if (isEmbedded) {
      try {
        const { integrationAPI } = await import('@/lib/integration')
        if (integrationAPI) {
          // Build measurement data from current state
          // Map lines to the format expected by sealn-super-site
          let mappedLines = lines.map(line => ({
            serviceId: line.serviceId,
            serviceName: line.serviceName,
            measurementValue: line.qty, // Map qty to measurementValue
            rate: line.rate,
            minimum: 0,
            subtotal: line.subtotal,
          }))

          // If lines is empty but we have geometries, create lines from geometries
          // This handles the case where sync hasn't completed yet
          if (mappedLines.length === 0 && geometries.length > 0) {
            const templates = useQuoteStore.getState().templates
            const templateMap = new Map(templates.map(t => [t.id, t]))
            const qtyByService = new Map<string, number>()

            for (const g of geometries) {
              qtyByService.set(g.serviceId, (qtyByService.get(g.serviceId) ?? 0) + (g.measurementValue ?? 0))
            }

            for (const [serviceId, qty] of qtyByService.entries()) {
              const template = templateMap.get(serviceId)
              if (template) {
                const subtotal = Math.max(qty * template.defaultRate, template.minimumCharge || 0)
                mappedLines.push({
                  serviceId,
                  serviceName: template.name,
                  measurementValue: qty,
                  rate: template.defaultRate,
                  minimum: template.minimumCharge || 0,
                  subtotal,
                })
              }
            }
            console.log('Created lines from geometries:', mappedLines)
          }

          const calculatedTotal = mappedLines.reduce((sum, l) => sum + l.subtotal, 0)
          const totalArea = geometries
            .filter(g => g.kind === 'POLYGON')
            .reduce((sum, g) => sum + (g.measurementValue || 0), 0)
          const totalPerimeter = geometries
            .filter(g => g.kind === 'POLYLINE')
            .reduce((sum, g) => sum + (g.measurementValue || 0), 0)

          const measurementData = {
            totalArea,
            totalPerimeter,
            unit: 'imperial' as const,
            shapes: geometries.map(g => ({
              id: g.id,
              type: g.kind === 'POLYLINE' ? 'line' as const : 'polygon' as const,
              area: g.kind === 'POLYGON' ? g.measurementValue : 0,
              perimeter: g.kind === 'POLYLINE' ? g.measurementValue : 0,
              coordinates: [] as [number, number][],
            })),
            heights: [],
            notes: '',
            timestamp: new Date().toISOString(),
            // Include quote data with properly mapped lines
            lines: mappedLines,
            total: calculatedTotal || total,
            address: quoteAddress || addressParam,
          }

          console.log('Sending measurementData:', measurementData)
          integrationAPI.exportToQuote(measurementData as any)

          // Show feedback to user
          alert(`Quote sent! ${mappedLines.length} service(s), $${Math.round(calculatedTotal || total).toLocaleString()} total.\nClick "Create Estimate" in the green banner.`)
          return
        }
      } catch (err) {
        console.error('Integration export failed:', err)
      }
    }

    // Fallback: open bid builder
    createNewBid()
    setShowBidBuilder(true)
  }

  const handleSaveDraft = () => {
    try {
      const address = quoteAddress || addressParam || 'Untitled Quote'
      const draft = {
        id: `draft_${Date.now()}`,
        name: address,
        address: address,
        industryId: industryId,
        geometries: geometries,
        lines: lines,
        total: total,
        savedAt: new Date().toISOString(),
      }

      // Get existing drafts
      const existingDrafts = JSON.parse(localStorage.getItem('QUOTE_DRAFTS') || '[]')

      // Add new draft (keep last 10)
      const updatedDrafts = [draft, ...existingDrafts].slice(0, 10)
      localStorage.setItem('QUOTE_DRAFTS', JSON.stringify(updatedDrafts))

      // Show success feedback
      alert(`Draft saved: ${address}\n\nTotal: $${Math.round(total).toLocaleString()}\nServices: ${lines.length}`)
    } catch (error) {
      console.error('Failed to save draft:', error)
      alert('Failed to save draft. Please try again.')
    }
  }

  if (!mounted || !industryId) {
    return <div className="quote-layout-loading">Loading your services…</div>
  }

  // Legacy mode for backwards compatibility
  if (flags.legacy) {
    const Toolbar = require('@/components/Toolbar').default
    const MetricsPanel = require('@/components/MetricsPanel').default
    const StatusBar = require('@/components/StatusBar').default

    return (
      <div className="app-root">
        <PrefHydrator />
        <ErrorBoundary label="MapView">
          <MapView />
        </ErrorBoundary>
        <div className="overlay top-left">
          <ErrorBoundary label="Toolbar">
            <Toolbar />
          </ErrorBoundary>
        </div>
        <div className="overlay bottom-right">
          <ErrorBoundary label="MetricsPanel">
            <MetricsPanel />
          </ErrorBoundary>
        </div>
        <div className="overlay bottom-left">
          <ErrorBoundary label="StatusBar">
            <StatusBar />
          </ErrorBoundary>
        </div>
      </div>
    )
  }

  return (
    <div className="quote-layout">
      <PrefHydrator />

      {/* Header with Toolbar */}
      <div className="quote-layout-header">
        <ErrorBoundary label="QuoteToolbar">
          <QuoteToolbar
            onSettings={() => setShowPricingConfig(true)}
            onSendQuote={handleSendQuote}
            onSaveDraft={handleSaveDraft}
            address={quoteAddress || addressParam}
            geocodeStatus={geocodeStatus}
            geocodeMessage={geocodeMessage}
          />
        </ErrorBoundary>
      </div>

      {/* Left Panel - Services */}
      <div className="quote-layout-services">
        <ErrorBoundary label="ServiceRail">
          <ServiceRail />
        </ErrorBoundary>
      </div>

      {/* Center - Map or Photo */}
      <div className="quote-layout-map">
        {mode === "MAP" ? (
          <>
            <ErrorBoundary label="MapView">
              <MapView />
            </ErrorBoundary>
            <CursorTooltip />
          </>
        ) : (
          <div className="photo-mode-prompt">
            <div className="photo-mode-icon">📷</div>
            <h3>Photo Measure Mode</h3>
            <p>Take measurements directly on photos</p>
            <button className="btn btn-primary" onClick={() => setShowPhotoMeasure(true)}>
              Open Photo Measure
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Quote Summary */}
      <div className="quote-layout-summary">
        <ErrorBoundary label="QuoteSummary">
          {isConcrete ? (
            <LiveQuotePanelConcrete onShowList={() => setShowConcreteMeasurements(true)} />
          ) : (
            <QuoteSummaryV2 />
          )}
        </ErrorBoundary>
      </div>

      {/* Concrete-specific floating panels */}
      {isConcrete && (
        <>
          {/* Line type selector */}
          <div style={{
            position: 'fixed',
            bottom: 100,
            left: 320,
            zIndex: 100,
          }}>
            <div className="glass" style={{ padding: 12, borderRadius: 8 }}>
              <ConcreteLineSelector />
            </div>
          </div>

          {/* Slab details drawer when selected */}
          {selectedConcreteMeasurement?.type === 'CONCRETE_SLAB' && (
            <div style={{
              position: 'fixed',
              top: 80,
              right: 320,
              zIndex: 100,
              maxHeight: 'calc(100vh - 160px)',
              overflowY: 'auto',
            }}>
              <ConcreteSlabDetails />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showBidBuilder && (
        <BidBuilder onClose={() => setShowBidBuilder(false)} />
      )}
      {showPricingConfig && (
        <PricingConfigModal onClose={() => setShowPricingConfig(false)} />
      )}
      {showPhotoMeasure && (
        <PhotoMeasureModal onClose={() => setShowPhotoMeasure(false)} />
      )}
      {showConcreteMeasurements && (
        <div className="modal-overlay" onClick={() => setShowConcreteMeasurements(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ConcreteMeasurementsList onClose={() => setShowConcreteMeasurements(false)} />
          </div>
        </div>
      )}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Instant Quote - Quick Tips</div>
            <div className="modal-content">
              <strong>Drawing Tools:</strong><br/>
              - Draw (F): Freehand draw areas<br/>
              - Polygon (A): Click vertices, double-click to finish<br/>
              - Line (L): Measure linear distances<br/>
              - Select (V): Select and move shapes<br/><br/>
              <strong>Shapes:</strong><br/>
              - Rectangle (R) and Circle (O) tools<br/><br/>
              <strong>Quick Keys:</strong><br/>
              - C: Clear all drawings<br/>
              - U: Toggle units (Imperial/Metric)<br/><br/>
              <strong>Services Panel:</strong><br/>
              - Click a service to start drawing with that rate<br/>
              - Prices update live as you draw<br/><br/>
              <strong>Quote Summary:</strong><br/>
              - See measurements and estimates in real-time<br/>
              - Click &quot;Build Quote&quot; to finalize
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="quote-layout-loading">Preparing quote workspace…</div>}>
      <QuoteMapPageInner />
    </Suspense>
  )
}
