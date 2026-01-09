"use client"

import { useState } from 'react'
import { usePricingStore } from '@/lib/pricing-store'
import type { ServiceType } from '@/lib/pricing-types'

interface PricingConfigModalProps {
  onClose: () => void
}

export default function PricingConfigModal({ onClose }: PricingConfigModalProps) {
  const pricingConfigs = usePricingStore((s) => s.pricingConfigs)
  const activePricingConfigId = usePricingStore((s) => s.activePricingConfigId)
  const getActiveConfig = usePricingStore((s) => s.getActiveConfig)
  const updatePricingConfig = usePricingStore((s) => s.updatePricingConfig)
  const addServiceType = usePricingStore((s) => s.addServiceType)
  const updateServiceType = usePricingStore((s) => s.updateServiceType)
  const removeServiceType = usePricingStore((s) => s.removeServiceType)

  const config = getActiveConfig()
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [showAddService, setShowAddService] = useState(false)

  const [newService, setNewService] = useState<Partial<ServiceType>>({
    name: '',
    pricingModel: 'area',
    productionRate: 100,
    productionRateUnit: 'sq ft/hr',
    defaultCrewSize: 2,
    defaultHourlyRate: 25,
    materialCostPerUnit: 0,
    materialWasteFactor: 1.1,
    equipmentCostFixed: 0,
    minJobCharge: 200,
  })

  const handleAddService = () => {
    if (!newService.name?.trim()) return

    const service: ServiceType = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newService.name.trim(),
      pricingModel: newService.pricingModel || 'area',
      productionRate: newService.productionRate || 100,
      productionRateUnit: newService.pricingModel === 'linear' ? 'linear ft/hr' : 'sq ft/hr',
      defaultCrewSize: newService.defaultCrewSize || 2,
      defaultHourlyRate: newService.defaultHourlyRate || 25,
      materialCostPerUnit: newService.materialCostPerUnit || 0,
      materialWasteFactor: newService.materialWasteFactor || 1.1,
      equipmentCostFixed: newService.equipmentCostFixed || 0,
      minJobCharge: newService.minJobCharge || 200,
    }

    addServiceType(service)
    setShowAddService(false)
    setNewService({
      name: '',
      pricingModel: 'area',
      productionRate: 100,
      productionRateUnit: 'sq ft/hr',
      defaultCrewSize: 2,
      defaultHourlyRate: 25,
      materialCostPerUnit: 0,
      materialWasteFactor: 1.1,
      equipmentCostFixed: 0,
      minJobCharge: 200,
    })
  }

  const editingService = config.serviceTypes.find((s) => s.id === editingServiceId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass modal pricing-config-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">Pricing Configuration</div>

        <div className="modal-content" style={{ display: 'grid', gap: 16 }}>
          {/* Global Settings */}
          <div className="pricing-section">
            <div className="pricing-section-title">Global Settings</div>
            <div className="pricing-grid">
              <div className="pricing-field">
                <label>Default Margin</label>
                <div className="pricing-input-group">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(config.defaultMargin * 100)}
                    onChange={(e) =>
                      updatePricingConfig({ defaultMargin: Number(e.target.value) / 100 })
                    }
                  />
                  <span className="pricing-input-suffix">%</span>
                </div>
              </div>
              <div className="pricing-field">
                <label>Labor Burden Rate</label>
                <div className="pricing-input-group">
                  <input
                    type="number"
                    min={100}
                    max={200}
                    step={1}
                    value={Math.round(config.laborBurdenRate * 100)}
                    onChange={(e) =>
                      updatePricingConfig({ laborBurdenRate: Number(e.target.value) / 100 })
                    }
                  />
                  <span className="pricing-input-suffix">%</span>
                </div>
                <span className="pricing-hint">
                  Includes taxes, insurance, benefits (e.g., 130% = 30% burden)
                </span>
              </div>
            </div>
          </div>

          {/* Service Types */}
          <div className="pricing-section">
            <div className="pricing-section-header">
              <span className="pricing-section-title">Service Types</span>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowAddService(true)}
              >
                + Add Service
              </button>
            </div>

            <div className="service-list">
              {config.serviceTypes.map((service) => (
                <div key={service.id} className="service-item">
                  <div className="service-item-header">
                    <div className="service-item-info">
                      <span className="service-name">{service.name}</span>
                      <span className="service-meta">
                        {service.pricingModel === 'area' ? 'Area-based' : 'Linear-based'} |{' '}
                        {service.productionRate} {service.productionRateUnit}
                      </span>
                    </div>
                    <div className="service-item-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setEditingServiceId(editingServiceId === service.id ? null : service.id)
                        }
                      >
                        {editingServiceId === service.id ? 'Close' : 'Edit'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (confirm(`Delete "${service.name}"?`)) {
                            removeServiceType(service.id)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingServiceId === service.id && editingService && (
                    <div className="service-edit-form">
                      <div className="pricing-grid">
                        <div className="pricing-field">
                          <label>Service Name</label>
                          <input
                            type="text"
                            value={editingService.name}
                            onChange={(e) =>
                              updateServiceType(service.id, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="pricing-field">
                          <label>Pricing Model</label>
                          <select
                            value={editingService.pricingModel}
                            onChange={(e) =>
                              updateServiceType(service.id, {
                                pricingModel: e.target.value as 'area' | 'linear',
                                productionRateUnit:
                                  e.target.value === 'linear' ? 'linear ft/hr' : 'sq ft/hr',
                              })
                            }
                          >
                            <option value="area">Area (sq ft)</option>
                            <option value="linear">Linear (ft)</option>
                          </select>
                        </div>
                        <div className="pricing-field">
                          <label>Production Rate</label>
                          <div className="pricing-input-group">
                            <input
                              type="number"
                              min={1}
                              value={editingService.productionRate}
                              onChange={(e) =>
                                updateServiceType(service.id, {
                                  productionRate: Number(e.target.value),
                                })
                              }
                            />
                            <span className="pricing-input-suffix">
                              {editingService.productionRateUnit}
                            </span>
                          </div>
                        </div>
                        <div className="pricing-field">
                          <label>Crew Size</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={editingService.defaultCrewSize}
                            onChange={(e) =>
                              updateServiceType(service.id, {
                                defaultCrewSize: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="pricing-field">
                          <label>Hourly Rate (per person)</label>
                          <div className="pricing-input-group">
                            <span className="pricing-input-prefix">$</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={editingService.defaultHourlyRate}
                              onChange={(e) =>
                                updateServiceType(service.id, {
                                  defaultHourlyRate: Number(e.target.value),
                                })
                              }
                            />
                            <span className="pricing-input-suffix">/hr</span>
                          </div>
                        </div>
                        <div className="pricing-field">
                          <label>Material Cost</label>
                          <div className="pricing-input-group">
                            <span className="pricing-input-prefix">$</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={editingService.materialCostPerUnit || 0}
                              onChange={(e) =>
                                updateServiceType(service.id, {
                                  materialCostPerUnit: Number(e.target.value),
                                })
                              }
                            />
                            <span className="pricing-input-suffix">
                              /{editingService.pricingModel === 'linear' ? 'ft' : 'sq ft'}
                            </span>
                          </div>
                        </div>
                        <div className="pricing-field">
                          <label>Waste Factor</label>
                          <div className="pricing-input-group">
                            <input
                              type="number"
                              min={100}
                              max={200}
                              step={1}
                              value={Math.round((editingService.materialWasteFactor || 1) * 100)}
                              onChange={(e) =>
                                updateServiceType(service.id, {
                                  materialWasteFactor: Number(e.target.value) / 100,
                                })
                              }
                            />
                            <span className="pricing-input-suffix">%</span>
                          </div>
                          <span className="pricing-hint">110% = 10% waste allowance</span>
                        </div>
                        <div className="pricing-field">
                          <label>Equipment Cost (Fixed)</label>
                          <div className="pricing-input-group">
                            <span className="pricing-input-prefix">$</span>
                            <input
                              type="number"
                              min={0}
                              step={5}
                              value={editingService.equipmentCostFixed || 0}
                              onChange={(e) =>
                                updateServiceType(service.id, {
                                  equipmentCostFixed: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="pricing-field">
                          <label>Minimum Job Charge</label>
                          <div className="pricing-input-group">
                            <span className="pricing-input-prefix">$</span>
                            <input
                              type="number"
                              min={0}
                              step={25}
                              value={editingService.minJobCharge || 0}
                              onChange={(e) =>
                                updateServiceType(service.id, {
                                  minJobCharge: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Service Form */}
          {showAddService && (
            <div className="pricing-section add-service-form">
              <div className="pricing-section-title">Add New Service</div>
              <div className="pricing-grid">
                <div className="pricing-field">
                  <label>Service Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Deck Staining"
                    value={newService.name || ''}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  />
                </div>
                <div className="pricing-field">
                  <label>Pricing Model</label>
                  <select
                    value={newService.pricingModel}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        pricingModel: e.target.value as 'area' | 'linear',
                        productionRateUnit:
                          e.target.value === 'linear' ? 'linear ft/hr' : 'sq ft/hr',
                      })
                    }
                  >
                    <option value="area">Area (sq ft)</option>
                    <option value="linear">Linear (ft)</option>
                  </select>
                </div>
                <div className="pricing-field">
                  <label>Production Rate</label>
                  <div className="pricing-input-group">
                    <input
                      type="number"
                      min={1}
                      value={newService.productionRate || 100}
                      onChange={(e) =>
                        setNewService({ ...newService, productionRate: Number(e.target.value) })
                      }
                    />
                    <span className="pricing-input-suffix">{newService.productionRateUnit}</span>
                  </div>
                </div>
                <div className="pricing-field">
                  <label>Hourly Rate</label>
                  <div className="pricing-input-group">
                    <span className="pricing-input-prefix">$</span>
                    <input
                      type="number"
                      min={0}
                      value={newService.defaultHourlyRate || 25}
                      onChange={(e) =>
                        setNewService({ ...newService, defaultHourlyRate: Number(e.target.value) })
                      }
                    />
                    <span className="pricing-input-suffix">/hr</span>
                  </div>
                </div>
              </div>
              <div className="add-service-actions">
                <button className="btn" onClick={() => setShowAddService(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddService}
                  disabled={!newService.name?.trim()}
                >
                  Add Service
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
