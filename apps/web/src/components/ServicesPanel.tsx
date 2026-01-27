"use client"
import { useState } from 'react'
import { usePricingStore } from '@/lib/pricing-store'
import { useAppStore } from '@/lib/store'
import type { ServiceType, PricingConfig } from '@/lib/pricing-types'

interface ServicesPanelProps {
  onServiceSelect?: (service: ServiceType) => void
}

// Calculate effective rate per unit for a service
function calculateEffectiveRate(service: ServiceType, config: PricingConfig): number {
  const laborCostPerUnit = (service.defaultHourlyRate * service.defaultCrewSize * config.laborBurdenRate) / service.productionRate
  const materialCostPerUnit = (service.materialCostPerUnit || 0) * (service.materialWasteFactor || 1)
  return laborCostPerUnit + materialCostPerUnit
}

export default function ServicesPanel({ onServiceSelect }: ServicesPanelProps) {
  const pricingConfigs = usePricingStore((s) => s.pricingConfigs)
  const activePricingConfigId = usePricingStore((s) => s.activePricingConfigId)
  const hydrated = usePricingStore((s) => s.hydrated)
  const liveMeasurements = usePricingStore((s) => s.liveMeasurements)
  const setMode = useAppStore((s) => s.setMode)

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const hasDrawings = liveMeasurements && (liveMeasurements.totalArea > 0 || liveMeasurements.totalPerimeter > 0)

  const activeConfig = pricingConfigs.find(c => c.id === activePricingConfigId)
  const services = activeConfig?.serviceTypes || []

  // Group services by pricing model for better organization
  const areaServices = services.filter(s => s.pricingModel === 'area')
  const linearServices = services.filter(s => s.pricingModel === 'linear')

  const handleServiceClick = (service: ServiceType) => {
    setSelectedServiceId(service.id)

    // AUTO-ARM: Service selection = drawing intent
    // Immediately set the appropriate drawing mode
    if (service.pricingModel === 'area') {
      setMode('freehand') // or 'polygon' - freehand is more intuitive
    } else if (service.pricingModel === 'linear') {
      setMode('line')
    }

    onServiceSelect?.(service)
  }

  if (!hydrated) {
    return (
      <div className="services-panel">
        <div className="services-panel-header">
          <span className="services-panel-step">1</span>
          <span className="services-panel-title">Select Service</span>
        </div>
        <div className="services-loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="services-panel">
      <div className="services-panel-header">
        <span className="services-panel-step">1</span>
        <span className="services-panel-title">Select Service</span>
      </div>
      {!hasDrawings && (
        <div className="services-panel-hint">
          Select a service, then draw on the map
        </div>
      )}

      <div className="services-list">
        {areaServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Area Services</div>
            {areaServices.map(service => {
              const rate = activeConfig ? calculateEffectiveRate(service, activeConfig) : 0
              const isSelected = selectedServiceId === service.id
              return (
                <button
                  key={service.id}
                  className={`service-button ${isSelected ? 'service-button-selected' : ''}`}
                  onClick={() => handleServiceClick(service)}
                >
                  <span className="service-color-dot service-color-area" />
                  <div className="service-button-info">
                    <span className="service-button-name">{service.name}</span>
                    <span className="service-button-rate">
                      ${rate.toFixed(2)}/sq ft
                    </span>
                  </div>
                  {isSelected && <span className="service-check">✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {linearServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Linear Services</div>
            {linearServices.map(service => {
              const rate = activeConfig ? calculateEffectiveRate(service, activeConfig) : 0
              const isSelected = selectedServiceId === service.id
              return (
                <button
                  key={service.id}
                  className={`service-button ${isSelected ? 'service-button-selected' : ''}`}
                  onClick={() => handleServiceClick(service)}
                >
                  <span className="service-color-dot service-color-linear" />
                  <div className="service-button-info">
                    <span className="service-button-name">{service.name}</span>
                    <span className="service-button-rate">
                      ${rate.toFixed(2)}/ft
                    </span>
                  </div>
                  {isSelected && <span className="service-check">✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {services.length === 0 && (
          <div className="services-empty">
            No services configured. Click the gear icon to add services.
          </div>
        )}
      </div>
    </div>
  )
}
