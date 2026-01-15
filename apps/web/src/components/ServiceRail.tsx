"use client"
import { useState } from 'react'
import { useQuoteStore } from "@/lib/quote/store"
import { useAppStore } from '@/lib/store'

export function ServiceRail() {
  const templates = useQuoteStore(s => s.templates)
  const activeServiceId = useQuoteStore(s => s.activeServiceId)
  const setActiveService = useQuoteStore(s => s.setActiveService)
  const mode = useAppStore(s => s.mode)
  const setMode = useAppStore(s => s.setMode)
  const requestClear = useAppStore(s => s.requestClear)

  const [toolsExpanded, setToolsExpanded] = useState(true)
  const [areaExpanded, setAreaExpanded] = useState(true)
  const [linearExpanded, setLinearExpanded] = useState(false)
  const [countExpanded, setCountExpanded] = useState(false)

  const handleServiceClick = (serviceId: string) => {
    setActiveService(serviceId)
    const template = templates.find(t => t.id === serviceId)
    if (template) {
      if (template.measurementType === "AREA") {
        setMode('polygon')
      } else if (template.measurementType === "LENGTH") {
        setMode('line')
      } else {
        setMode('polygon')
      }
    }
  }

  const areaServices = templates.filter(t => t.measurementType === "AREA")
  const linearServices = templates.filter(t => t.measurementType === "LENGTH")
  const countServices = templates.filter(t => t.measurementType === "COUNT")

  const toolOptions: { id: 'freehand' | 'polygon' | 'line'; label: string; hint: string; shortcut: string }[] = [
    { id: 'freehand', label: 'Quick Fill', hint: 'Paint areas fast', shortcut: 'F' },
    { id: 'polygon', label: 'Polygon', hint: 'Click corners', shortcut: 'A' },
    { id: 'line', label: 'Line', hint: 'Linear measure', shortcut: 'L' },
  ]

  const DropdownHeader = ({
    label,
    count,
    expanded,
    onToggle,
    color
  }: {
    label: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
    color: string;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="dropdown-header"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: expanded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: expanded ? '8px 8px 0 0' : '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        color: 'inherit',
        marginBottom: expanded ? 0 : 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
        }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <span style={{
          fontSize: 11,
          color: 'var(--muted)',
          background: 'rgba(255,255,255,0.1)',
          padding: '2px 6px',
          borderRadius: 4,
        }}>{count}</span>
      </div>
      <svg
        style={{
          width: 16,
          height: 16,
          transition: 'transform 0.2s ease',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          opacity: 0.6,
        }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )

  return (
    <div className="services-panel">
      <div className="services-panel-header">
        <div className="services-panel-eyebrow">Create Quote</div>
        <h2>Services & Tools</h2>
      </div>

      {/* Drawing Tools Dropdown */}
      <div style={{ marginBottom: 12 }}>
        <DropdownHeader
          label="Drawing Tools"
          count={3}
          expanded={toolsExpanded}
          onToggle={() => setToolsExpanded(!toolsExpanded)}
          color="#60a5fa"
        />
        {toolsExpanded && (
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--glass-border)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: 8,
            marginBottom: 8,
          }}>
            {toolOptions.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setMode(tool.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: mode === tool.id ? 'rgba(96,165,250,0.2)' : 'transparent',
                  border: mode === tool.id ? '1px solid rgba(96,165,250,0.4)' : '1px solid transparent',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: 'inherit',
                  marginBottom: 4,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{tool.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tool.hint}</span>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                }}>{tool.shortcut}</span>
              </button>
            ))}
            {/* Extra tools */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4,
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid var(--glass-border)',
            }}>
              <button type="button" onClick={() => setMode('rectangle')} style={{
                padding: '6px 8px',
                fontSize: 11,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: 4,
                cursor: 'pointer',
                color: 'inherit',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Rectangle</span>
                <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>R</span>
              </button>
              <button type="button" onClick={() => setMode('circle')} style={{
                padding: '6px 8px',
                fontSize: 11,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: 4,
                cursor: 'pointer',
                color: 'inherit',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Circle</span>
                <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>O</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => {
            if (confirm('Clear all drawings and start over?')) {
              requestClear()
            }
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid rgba(255,100,100,0.3)',
            background: 'rgba(255,100,100,0.1)',
            color: '#ff6b6b',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Clear All</span>
          <span style={{ fontFamily: 'monospace' }}>C</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('pan')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Select Mode</span>
          <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>V</span>
        </button>
      </div>

      {/* Services Dropdowns */}
      <div className="services-list">
        {areaServices.length > 0 && (
          <div>
            <DropdownHeader
              label="Area Services"
              count={areaServices.length}
              expanded={areaExpanded}
              onToggle={() => setAreaExpanded(!areaExpanded)}
              color="#22c55e"
            />
            {areaExpanded && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                padding: 6,
                marginBottom: 8,
              }}>
                {areaServices.map(t => (
                  <button
                    key={t.id}
                    className={`service-button ${activeServiceId === t.id ? 'service-button-selected' : ''}`}
                    onClick={() => handleServiceClick(t.id)}
                    style={{ marginBottom: 4 }}
                  >
                    <span className="service-color-dot service-color-area" />
                    <div className="service-button-info">
                      <span className="service-button-name">{t.name}</span>
                      <span className="service-button-rate">
                        ${t.defaultRate.toFixed(2)}/{t.unitLabel}
                        {t.minimumCharge ? ` · $${Math.round(t.minimumCharge).toLocaleString()} min` : ''}
                      </span>
                    </div>
                    {activeServiceId === t.id && <span className="service-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {linearServices.length > 0 && (
          <div>
            <DropdownHeader
              label="Linear Services"
              count={linearServices.length}
              expanded={linearExpanded}
              onToggle={() => setLinearExpanded(!linearExpanded)}
              color="#f59e0b"
            />
            {linearExpanded && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                padding: 6,
                marginBottom: 8,
              }}>
                {linearServices.map(t => (
                  <button
                    key={t.id}
                    className={`service-button ${activeServiceId === t.id ? 'service-button-selected' : ''}`}
                    onClick={() => handleServiceClick(t.id)}
                    style={{ marginBottom: 4 }}
                  >
                    <span className="service-color-dot service-color-linear" />
                    <div className="service-button-info">
                      <span className="service-button-name">{t.name}</span>
                      <span className="service-button-rate">
                        ${t.defaultRate.toFixed(2)}/{t.unitLabel}
                        {t.minimumCharge ? ` · $${Math.round(t.minimumCharge).toLocaleString()} min` : ''}
                      </span>
                    </div>
                    {activeServiceId === t.id && <span className="service-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {countServices.length > 0 && (
          <div>
            <DropdownHeader
              label="Per-Unit Services"
              count={countServices.length}
              expanded={countExpanded}
              onToggle={() => setCountExpanded(!countExpanded)}
              color="#a855f7"
            />
            {countExpanded && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                padding: 6,
                marginBottom: 8,
              }}>
                {countServices.map(t => (
                  <button
                    key={t.id}
                    className={`service-button ${activeServiceId === t.id ? 'service-button-selected' : ''}`}
                    onClick={() => handleServiceClick(t.id)}
                    style={{ marginBottom: 4 }}
                  >
                    <span className="service-color-dot service-color-count" />
                    <div className="service-button-info">
                      <span className="service-button-name">{t.name}</span>
                      <span className="service-button-rate">
                        ${t.defaultRate.toFixed(2)}/{t.unitLabel}
                        {t.minimumCharge ? ` · $${Math.round(t.minimumCharge).toLocaleString()} min` : ''}
                      </span>
                    </div>
                    {activeServiceId === t.id && <span className="service-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
