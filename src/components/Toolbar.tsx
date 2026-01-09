"use client"
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { usePricingStore } from '@/lib/pricing-store'
import { readToken } from '@/lib/token'
import { useMounted } from '@/lib/useMounted'
import { integrationAPI } from '@/lib/integration'
import PhotoMeasureModal from '@/components/PhotoMeasureModal'
import BidBuilder from '@/components/BidBuilder'
import PricingConfigModal from '@/components/PricingConfigModal'

// Collapsible group component for mobile menu
function MenuGroup({ title, icon, children, defaultOpen = false }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="menu-group">
      <button className="menu-group-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{icon} {title}</span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="menu-group-content">{children}</div>}
    </div>
  )
}

export default function Toolbar() {
  const [showHelp, setShowHelp] = useState(false)
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const toggleUnits = useAppStore((s) => s.toggleUnits)
  const requestClear = useAppStore((s) => s.requestClear)
  const styleId = useAppStore((s) => s.styleId)
  const setStyleId = useAppStore((s) => s.setStyleId)
  const smoothing = useAppStore((s) => s.smoothing)
  const setSmoothing = useAppStore((s) => s.setSmoothing)
  const requestCommand = useAppStore((s) => s.requestCommand)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mounted = useMounted()
  const mapEnabled = useAppStore((s) => s.mapEnabled)
  const setMapEnabled = useAppStore((s) => s.setMapEnabled)
  const notes = useAppStore((s) => s.notes)
  const setNotes = useAppStore((s) => s.setNotes)
  const enable3D = useAppStore((s) => s.enable3D)
  const setEnable3D = useAppStore((s) => s.setEnable3D)
  const [showMapSettings, setShowMapSettings] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showPhotoMeasure, setShowPhotoMeasure] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [context, setContext] = useState<{ customerName?: string; jobName?: string }>({})
  const [showBidBuilder, setShowBidBuilder] = useState(false)
  const [showPricingConfig, setShowPricingConfig] = useState(false)

  // Pricing store
  const createNewBid = usePricingStore((s) => s.createNewBid)
  const currentBid = usePricingStore((s) => s.currentBid)
  const hydratePricing = usePricingStore((s) => s.hydrate)
  const pricingHydrated = usePricingStore((s) => s.hydrated)

  // Hydrate pricing store on mount
  useEffect(() => {
    if (!pricingHydrated) {
      hydratePricing()
    }
  }, [pricingHydrated, hydratePricing])

  useEffect(() => {
    if (integrationAPI) {
      setIsEmbedded(integrationAPI.isEmbedded())
      setContext(integrationAPI.getContext())
      const unsubscribe = integrationAPI.on('PARENT_SET_CONTEXT', (data) => {
        setContext(data)
      })
      return unsubscribe
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Lower breakpoint from 900px to 768px for better tablet experience
    const media = window.matchMedia('(max-width: 768px)')
    const update = () => setIsCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isCompact) setMobileMenuOpen(false)
  }, [isCompact])

  const closeMobileMenu = () => setMobileMenuOpen(false)
  const openMapSettingsModal = () => {
    setShowMapSettings(true)
    if (isCompact) closeMobileMenu()
  }
  const openNotesModal = () => {
    setShowNotes(true)
    if (isCompact) closeMobileMenu()
  }
  const openPhotoMeasure = () => {
    setShowPhotoMeasure(true)
    if (isCompact) closeMobileMenu()
  }
  const openHelpModal = () => {
    setShowHelp(true)
    if (isCompact) closeMobileMenu()
  }

  const openBidBuilder = () => {
    const ctx = integrationAPI ? integrationAPI.getContext() : {}

    createNewBid(undefined, {
      customerName: ctx.customerName,
      jobName: ctx.jobName,
      address: ctx.address,
    })

    setShowBidBuilder(true)
    if (isCompact) closeMobileMenu()
  }

  const openPricingConfig = () => {
    setShowPricingConfig(true)
    if (isCompact) closeMobileMenu()
  }

  // Tool icons and labels for dropdown
  const toolConfig: Record<string, { icon: string; label: string; shortcut: string }> = {
    freehand: { icon: '✎', label: 'Freehand', shortcut: 'F' },
    polygon: { icon: '⬠', label: 'Polygon', shortcut: 'A' },
    line: { icon: '／', label: 'Line', shortcut: 'L' },
    text: { icon: 'T', label: 'Text', shortcut: 'T' },
    height: { icon: '↕', label: 'Height', shortcut: 'H' },
    pan: { icon: '🖱', label: 'Select/Pan', shortcut: 'V' },
    stall: { icon: '▥', label: 'Stall Layout', shortcut: 'S' },
    concrete: { icon: '▦', label: 'Concrete', shortcut: 'G' },
  }

  const currentTool = toolConfig[mode] || toolConfig.pan

  const toolbarControls = (
    <>
      {/* Drawing Tools Dropdown */}
      <span className="btn btn-dropdown btn-compact active" title="Drawing Tools" style={{ minWidth: 110 }}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{currentTool.icon}</span>
          <span>{currentTool.label}</span>
        </label>
        <select
          value={mode}
          onChange={(e) => {
            const v = e.target.value
            if (v) setMode(v as typeof mode)
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer', width: 20 }}
        >
          <option value="freehand">✎ Freehand (F)</option>
          <option value="polygon">⬠ Polygon (A)</option>
          <option value="line">／ Line (L)</option>
          <option value="text">T Text (T)</option>
          <option value="height">↕ Height (H)</option>
          <option value="pan">🖱 Select/Pan (V)</option>
          <option value="stall">▥ Stall Layout (S)</option>
          <option value="concrete">▦ Concrete (G)</option>
        </select>
      </span>

      {/* Shapes dropdown */}
      <span className="btn btn-dropdown btn-compact" title="Shapes">
        <label style={{ cursor: 'pointer' }}>▭ Shapes</label>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            requestCommand(v)
            e.currentTarget.value = ''
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer', width: 20 }}
        >
          <option value="">▼</option>
          <option value="draw:rectangle">▭ Rectangle (R)</option>
          <option value="draw:circle">◯ Circle (O)</option>
        </select>
      </span>

      {/* View dropdown */}
      <span className="btn btn-dropdown btn-compact" title="View options">
        <label style={{ cursor: 'pointer' }}>👁 View</label>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            if (v === 'toggle3d') {
              setEnable3D(!enable3D)
            } else {
              requestCommand(v)
            }
            e.currentTarget.value = ''
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer', width: 20 }}
        >
          <option value="">▼</option>
          <option value="view:reset">⟲ Reset View</option>
          <option value="toggle3d">{enable3D ? '☑' : '☐'} 3D Buildings</option>
          <option value="view:streetview">📷 Street View</option>
        </select>
      </span>

      {/* Actions dropdown */}
      <span className="btn btn-dropdown btn-compact" title="Actions">
        <label style={{ cursor: 'pointer' }}>⚡ Actions</label>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            if (v === 'clear') requestClear()
            else if (v === 'map') openMapSettingsModal()
            else if (v === 'notes') openNotesModal()
            else if (v === 'help') openHelpModal()
            e.currentTarget.value = ''
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer', width: 20 }}
        >
          <option value="">▼</option>
          <option value="clear">✕ Clear All (C)</option>
          <option value="map">🗺 Map Settings</option>
          <option value="notes">📝 Site Notes</option>
          <option value="help">❓ Help</option>
        </select>
      </span>

      {/* Main action buttons - keep visible */}
      <button className="btn btn-compact btn-photo-measure" onClick={openPhotoMeasure} title="Photo Measure">📐 Photo</button>
      <button className="btn btn-compact btn-build-quote" onClick={openBidBuilder} title="Build Quote (B)">💰 Quote</button>
      <button className="btn btn-compact" onClick={openPricingConfig} title="Pricing">⚙</button>

      {/* Settings dropdown */}
      <span className="btn btn-dropdown btn-compact" title="Settings">
        <label style={{ cursor: 'pointer' }}>⚙ Settings</label>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            if (v === 'units') toggleUnits()
            else if (v.startsWith('style:')) setStyleId(v.replace('style:', '') as any)
            e.currentTarget.value = ''
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer', width: 20 }}
        >
          <option value="">▼</option>
          <option value="units">📏 Units: {mounted ? (unitSystem === 'metric' ? 'Metric' : 'Imperial') : '…'}</option>
          <option disabled>── Map Style ──</option>
          <option value="style:auto">Auto</option>
          <option value="style:mapbox://styles/mapbox/streets-v12">Streets</option>
          <option value="style:mapbox://styles/mapbox/satellite-streets-v12">Satellite</option>
          <option value="style:mapbox://styles/mapbox/light-v11">Light</option>
          <option value="style:mapbox://styles/mapbox/dark-v11">Dark</option>
        </select>
      </span>

      {/* Export/Import dropdown */}
      <span className="btn btn-dropdown btn-compact" title="Export/Import">
        <label style={{ cursor: 'pointer' }}>📤 Export</label>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            if (v === 'import') {
              fileInputRef.current?.click()
            } else {
              requestCommand(v)
            }
            e.currentTarget.value = ''
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer', width: 20 }}
        >
          <option value="">▼</option>
          {isEmbedded && <option value="export:quote">📤 Send to Quote</option>}
          <option value="export:png">🖼 PNG Snapshot</option>
          <option value="export:json">📄 GeoJSON</option>
          <option value="export:csv">📊 CSV Report</option>
          <option value="export:iif">📒 QuickBooks IIF</option>
          <option disabled>──────────</option>
          <option value="import">⤒ Import GeoJSON</option>
        </select>
      </span>
      <input
        ref={fileInputRef}
        type="file"
        id="import-file"
        name="import-file"
        accept=".json,.geojson,application/geo+json,application/json"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const input = e.currentTarget
          const f = input.files?.[0]
          if (!f) return
          try {
            const txt = await f.text()
            requestCommand('import:json', txt)
          } catch {}
          if (input) input.value = ''
        }}
      />

      <span className="btn btn-compact brand-btn" style={{ cursor: 'default' }}>
        <span className="brand">Area Bid</span>
      </span>
    </>
  )

  return (
    <div className="toolbar-wrapper">
      <div className="glass toolbar">
        {!isCompact ? (
          <div className="toolbar-content">{toolbarControls}</div>
        ) : (
          <div className="toolbar-mobile-shell">
            <button className="btn" onClick={() => setMobileMenuOpen(true)} title="Open tools menu (M)">☰</button>
            <div className="segmented" role="group" aria-label="Quick modes">
              <button className={'btn' + (mode === 'polygon' ? ' active' : '')} onClick={() => setMode('polygon')} title="Polygon">⬠</button>
              <button className={'btn' + (mode === 'line' ? ' active' : '')} onClick={() => setMode('line')} title="Length">／</button>
              <button className={'btn' + (mode === 'pan' ? ' active' : '')} onClick={() => setMode('pan')} title="Pan">🖱</button>
            </div>
            <button className="btn btn-build-quote" onClick={openBidBuilder} title="Build Quote">💰</button>
          </div>
        )}
      </div>
      {isCompact && mobileMenuOpen && (
        <>
          {/* Invisible tap target to close menu when tapping on map */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div className="modal-overlay" onClick={closeMobileMenu}>
            <div className="glass modal toolbar-mobile-menu" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-menu-scroll">
              <MenuGroup title="Drawing Tools" icon="✎" defaultOpen={true}>
                <button className={'btn' + (mode === 'freehand' ? ' active' : '')} onClick={() => { setMode('freehand'); closeMobileMenu() }}>✎ Freehand</button>
                <button className={'btn' + (mode === 'polygon' ? ' active' : '')} onClick={() => { setMode('polygon'); closeMobileMenu() }}>⬠ Polygon</button>
                <button className={'btn' + (mode === 'line' ? ' active' : '')} onClick={() => { setMode('line'); closeMobileMenu() }}>／ Length</button>
                <button className={'btn' + (mode === 'text' ? ' active' : '')} onClick={() => { setMode('text'); closeMobileMenu() }}>T Text</button>
                <button className={'btn' + (mode === 'height' ? ' active' : '')} onClick={() => { setMode('height'); closeMobileMenu() }}>↕ Height</button>
                <button className={'btn' + (mode === 'pan' ? ' active' : '')} onClick={() => { setMode('pan'); closeMobileMenu() }}>🖱 Pan</button>
                <button className="btn" onClick={() => { requestCommand('draw:rectangle'); closeMobileMenu() }}>▭ Rectangle</button>
                <button className="btn" onClick={() => { requestCommand('draw:circle'); closeMobileMenu() }}>◯ Circle</button>
              </MenuGroup>

              <MenuGroup title="Measure & Quote" icon="💰">
                <button className="btn btn-photo-measure" onClick={openPhotoMeasure}>📐 Photo Measure</button>
                <button className="btn btn-build-quote" onClick={openBidBuilder}>💰 Build Quote</button>
                <button className="btn" onClick={openPricingConfig}>⚙ Pricing Config</button>
              </MenuGroup>

              <MenuGroup title="View & Map" icon="🗺">
                <button className="btn" onClick={() => { requestCommand('view:reset'); closeMobileMenu() }}>⟲ Reset View</button>
                <button className={'btn' + (enable3D ? ' active' : '')} onClick={() => { setEnable3D(!enable3D); closeMobileMenu() }}>⬒ 3D Buildings</button>
                <button className="btn" onClick={() => { requestCommand('view:streetview'); closeMobileMenu() }}>📷 Street View</button>
                <button className="btn" onClick={openMapSettingsModal}>🗺 Map Settings</button>
                <button className="btn" onClick={() => { requestClear(); closeMobileMenu() }}>✕ Clear All</button>
              </MenuGroup>

              <MenuGroup title="Settings" icon="⚙">
                <button className="btn" onClick={() => { toggleUnits(); closeMobileMenu() }} suppressHydrationWarning>
                  Units: {mounted ? (unitSystem === 'metric' ? 'Metric' : 'Imperial') : '…'}
                </button>
                <div className="menu-row">
                  <span>Style:</span>
                  {mounted && (
                    <select
                      value={styleId}
                      onChange={(e) => { setStyleId(e.target.value as any); closeMobileMenu() }}
                      className="menu-select"
                    >
                      <option value="auto">Auto</option>
                      <option value="mapbox://styles/mapbox/streets-v12">Streets</option>
                      <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
                      <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite</option>
                      <option value="mapbox://styles/mapbox/light-v11">Light</option>
                      <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
                    </select>
                  )}
                </div>
                <div className="menu-row">
                  <span>Smoothing:</span>
                  {mounted && (
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={smoothing}
                      onChange={(e) => setSmoothing(Number(e.target.value))}
                      className="menu-range"
                    />
                  )}
                </div>
              </MenuGroup>

              <MenuGroup title="Export & Import" icon="📤">
                {isEmbedded && <button className="btn" onClick={() => { requestCommand('export:quote'); closeMobileMenu() }}>📤 Send to Quote</button>}
                <button className="btn" onClick={() => { requestCommand('export:png'); closeMobileMenu() }}>🖼 PNG Snapshot</button>
                <button className="btn" onClick={() => { requestCommand('export:json'); closeMobileMenu() }}>📄 GeoJSON</button>
                <button className="btn" onClick={() => { requestCommand('export:csv'); closeMobileMenu() }}>📊 CSV Report</button>
                <button className="btn" onClick={() => { requestCommand('export:iif'); closeMobileMenu() }}>📒 QuickBooks IIF</button>
                <button className="btn" onClick={() => fileInputRef.current?.click()}>⤒ Import GeoJSON</button>
              </MenuGroup>

              <MenuGroup title="Other" icon="📝">
                <button className="btn" onClick={openNotesModal}>📝 Site Notes</button>
                <button className="btn" onClick={openHelpModal}>❓ Help</button>
              </MenuGroup>

              {isEmbedded && (
                <div className="menu-context">
                  {context.customerName ? `${context.customerName}${context.jobName ? ` – ${context.jobName}` : ''}` : 'Embedded session'}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={closeMobileMenu}>Close</button>
            </div>
          </div>
        </div>
        </>
      )}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Quick Tips</div>
            <div className="modal-content">
              - Freehand (F): drag to draw; release to finish.<br/>
              - Polygon (A): click vertices; double-click to finish.<br/>
              - Length (L): measure linear distance.<br/>
              - Text (T): click to add text labels.<br/>
              - Height (H): click to add height measurements.<br/>
              - Pan (V): select/move shapes.<br/>
              - Rectangle (R) and Circle (O) tools available.<br/>
              - Clear (C), Toggle Units (U).<br/>
              - Export: PNG (P), GeoJSON (J), CSV (K), QuickBooks IIF (Q).<br/>
              - 3D buildings toggle and Street helper live near Reset.<br/>
              - When embedded: &ldquo;Send to Quote&rdquo; sends data to the parent site.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showMapSettings && (
        <div className="modal-overlay" onClick={() => setShowMapSettings(false)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Map Settings</div>
            <div className="modal-content" style={{ display: 'grid', gap: 10 }}>
              <div>
                <strong>Status:</strong> {mapEnabled ? 'Enabled' : 'Disabled'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!mapEnabled ? (
                  <button className="btn" onClick={() => setMapEnabled(true)}>Enable Map</button>
                ) : (
                  <button className="btn" onClick={() => setMapEnabled(false)}>Disable Map</button>
                )}
                <button className="btn" onClick={() => requestCommand('view:reset')}>Reset View</button>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={enable3D}
                  onChange={(e) => setEnable3D(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                Enable 3D buildings and tilt view
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <span>Street View helper</span>
                <button className="btn" onClick={() => { setShowMapSettings(false); requestCommand('view:streetview') }}>Launch Street View</button>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>After launching, click anywhere on the map to enter Street mode.</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Token source: {readToken().source || 'none'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="modal-token-input">Token</label>
                <input
                  id="modal-token-input"
                  name="modal-token-input"
                  type="text"
                  placeholder="pk.eyJ..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                />
                <button className="btn" onClick={() => { try { localStorage.setItem('MAPBOX_TOKEN', tokenInput.trim()) } catch {}; setMapEnabled(false); setTimeout(() => setMapEnabled(true), 0) }}>Save</button>
                <button className="btn" onClick={() => { try { localStorage.removeItem('MAPBOX_TOKEN') } catch {}; setMapEnabled(false) }}>Clear</button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowMapSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showNotes && (
        <div className="modal-overlay" onClick={() => setShowNotes(false)} style={{ alignItems: 'flex-start', paddingTop: 60 }}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <div className="modal-title">Site Notes</div>
            <div className="modal-content">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this site..."
                style={{
                  width: '100%',
                  height: 150,
                  maxHeight: '40vh',
                  padding: '8px',
                  borderRadius: 8,
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowNotes(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showPhotoMeasure && (
        <PhotoMeasureModal onClose={() => setShowPhotoMeasure(false)} />
      )}
      {showBidBuilder && (
        <BidBuilder onClose={() => setShowBidBuilder(false)} />
      )}
      {showPricingConfig && (
        <PricingConfigModal onClose={() => setShowPricingConfig(false)} />
      )}
    </div>
  )
}
