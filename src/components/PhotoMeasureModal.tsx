"use client"
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react'

type Point = { x: number; y: number }
type Measurement = { id: string; name: string; start: Point; end: Point }
type Photo = {
  id: string
  name: string
  url: string
  measurements: Measurement[]
  scale?: { unitsPerRelative: number; unitLabel: string; referenceActual: number; referenceName?: string }
}

type ActiveTool = { photoId: string; type: 'scale' | 'measure'; start?: Point; current?: Point }

const STORAGE_KEY = 'PHOTO_MEASURE_STORE_V2'

// Common reference sizes for setting scale
const SCALE_REFERENCES = [
  { name: 'Standard Door Height', value: 80, unit: 'in', display: '6\'8" (80")' },
  { name: 'Standard Door Width', value: 36, unit: 'in', display: '36"' },
  { name: 'Garage Door (Single)', value: 84, unit: 'in', display: '7\' (84")' },
  { name: 'Garage Door (Double)', value: 96, unit: 'in', display: '8\' (96")' },
  { name: 'Standard Window', value: 36, unit: 'in', display: '36"' },
  { name: 'Brick Course (3 rows)', value: 8, unit: 'in', display: '8"' },
  { name: 'Cinder Block', value: 8, unit: 'in', display: '8"' },
  { name: 'Siding Panel Width', value: 12, unit: 'in', display: '12"' },
  { name: 'Custom...', value: 0, unit: 'ft', display: 'Enter custom value' },
]

function distanceBetween(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function formatMeasurement(photo: Photo, measurement: Measurement) {
  const dist = distanceBetween(measurement.start, measurement.end)
  if (photo.scale && Number.isFinite(photo.scale.unitsPerRelative) && photo.scale.unitsPerRelative > 0) {
    const value = dist * photo.scale.unitsPerRelative
    const unit = photo.scale.unitLabel
    // Convert to feet and inches if in inches and > 12
    if (unit === 'in' && value >= 12) {
      const feet = Math.floor(value / 12)
      const inches = (value % 12).toFixed(1)
      return `${feet}' ${inches}"`
    }
    return `${value.toFixed(2)} ${unit}`
  }
  return `${(dist * 100).toFixed(1)}% of frame`
}

function getMeasurementValue(photo: Photo, measurement: Measurement): number {
  const dist = distanceBetween(measurement.start, measurement.end)
  if (photo.scale && Number.isFinite(photo.scale.unitsPerRelative) && photo.scale.unitsPerRelative > 0) {
    return dist * photo.scale.unitsPerRelative
  }
  return 0
}

export default function PhotoMeasureModal({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [showScaleHelper, setShowScaleHelper] = useState<string | null>(null)
  const [pendingScale, setPendingScale] = useState<{ photoId: string; start: Point; end: Point } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setPhotos(parsed)
          if (parsed.length > 0 && !selectedPhotoId) {
            setSelectedPhotoId(parsed[0].id)
          }
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
    } catch {}
  }, [photos])

  useEffect(() => {
    if (!activeTool) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool(null)
        setPendingScale(null)
        setShowScaleHelper(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTool])

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result
        if (typeof url !== 'string') return
        const newId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        setPhotos((prev) => [
          ...prev,
          {
            id: newId,
            name: file.name?.replace(/\.[^.]+$/, '') || 'Photo',
            url,
            measurements: [],
          },
        ])
        setSelectedPhotoId(newId)
      }
      reader.readAsDataURL(file)
    })
  }

  const applyScale = (photoId: string, start: Point, end: Point, refValue: number, refUnit: string, refName: string) => {
    const dist = distanceBetween(start, end)
    if (dist < 0.002) return
    const unitsPerRelative = refValue / dist
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId
          ? { ...photo, scale: { unitsPerRelative, unitLabel: refUnit, referenceActual: refValue, referenceName: refName } }
          : photo
      )
    )
    setPendingScale(null)
    setShowScaleHelper(null)
    setActiveTool(null)
  }

  const completeLine = (photoId: string, tool: ActiveTool, endPoint: Point) => {
    if (!tool.start) return
    const dist = distanceBetween(tool.start, endPoint)
    if (dist < 0.002) {
      setActiveTool(null)
      return
    }
    if (tool.type === 'scale') {
      // Show scale helper to pick reference
      setPendingScale({ photoId, start: tool.start, end: endPoint })
      setShowScaleHelper(photoId)
      setActiveTool(null)
    } else {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                measurements: [
                  ...photo.measurements,
                  {
                    id: `measure_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name: `Measurement ${photo.measurements.length + 1}`,
                    start: tool.start!,
                    end: endPoint,
                  },
                ],
              }
            : photo
        )
      )
      setActiveTool(null)
    }
  }

  const handleStagePointer = (photoId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeTool || activeTool.photoId !== photoId) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const clamp = (val: number) => Math.max(0, Math.min(1, val))
    const point = {
      x: clamp((e.clientX - rect.left) / rect.width),
      y: clamp((e.clientY - rect.top) / rect.height),
    }
    e.preventDefault()
    e.stopPropagation()
    if (!activeTool.start) {
      setActiveTool((prev) => (prev && prev.photoId === photoId ? { ...prev, start: point, current: point } : prev))
    } else if (e.type === 'pointerdown') {
      completeLine(photoId, activeTool, point)
    } else if (activeTool.start) {
      setActiveTool((prev) => (prev && prev.photoId === photoId ? { ...prev, current: point } : prev))
    }
  }

  const activeMessage = useMemo(() => {
    if (!activeTool) return ''
    if (!activeTool.start) {
      return activeTool.type === 'scale'
        ? 'Click START point of your reference object (e.g., top of door)'
        : 'Click START point of what you want to measure'
    }
    return activeTool.type === 'scale'
      ? 'Click END point of your reference object'
      : 'Click END point to complete measurement'
  }, [activeTool])

  const resetScale = (photoId: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, scale: undefined } : p)))
  }

  const deletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    if (activeTool?.photoId === photoId) setActiveTool(null)
    if (selectedPhotoId === photoId) {
      const remaining = photos.filter((p) => p.id !== photoId)
      setSelectedPhotoId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const deleteMeasurement = (photoId: string, measurementId: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId
          ? { ...photo, measurements: photo.measurements.filter((m) => m.id !== measurementId) }
          : photo
      )
    )
  }

  const renameMeasurement = (photoId: string, measurementId: string, name: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              measurements: photo.measurements.map((m) => (m.id === measurementId ? { ...m, name } : m)),
            }
          : photo
      )
    )
  }

  const renamePhoto = (photoId: string, name: string) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === photoId ? { ...photo, name } : photo))
    )
  }

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId)

  // Calculate totals for summary
  const totalMeasurements = photos.reduce((sum, p) => sum + p.measurements.length, 0)

  const exportSummary = () => {
    let csv = 'Photo Measurement Summary\n'
    csv += `Generated: ${new Date().toLocaleString()}\n\n`

    photos.forEach((photo, i) => {
      csv += `\n--- ${photo.name} ---\n`
      if (photo.scale) {
        csv += `Scale: ${photo.scale.referenceActual} ${photo.scale.unitLabel} reference (${photo.scale.referenceName || 'custom'})\n`
      } else {
        csv += `Scale: Not set\n`
      }
      csv += `\n`
      if (photo.measurements.length === 0) {
        csv += `No measurements\n`
      } else {
        photo.measurements.forEach((m, j) => {
          csv += `${j + 1}. ${m.name}: ${formatMeasurement(photo, m)}\n`
        })
      }
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'photo-measurements.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 20 }}>
      <div className="glass modal photo-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="photo-header">
          <div className="photo-header-title">
            <span className="photo-header-icon">📐</span>
            <div>
              <div className="modal-title" style={{ marginBottom: 0 }}>Photo Measure Pro</div>
              <div className="photo-header-subtitle">Take measurements on any photo</div>
            </div>
          </div>
          <div className="photo-header-stats">
            <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{totalMeasurements} measurement{totalMeasurements !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="photo-layout">
          {/* Sidebar - Photo List */}
          <div className="photo-sidebar">
            <div className="photo-sidebar-header">
              <span className="photo-sidebar-title">Photos</span>
              <div className="photo-upload-buttons">
                <label className="btn btn-sm btn-primary" title="Take photo with camera">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFiles(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  📷
                </label>
                <label className="btn btn-sm" title="Upload from device">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  📤
                </label>
              </div>
            </div>

            <div className="photo-list">
              {photos.length === 0 ? (
                <div className="photo-empty-sidebar">
                  <div className="photo-empty-icon">📷</div>
                  <div>No photos yet</div>
                  <div className="photo-empty-hint">Take or upload a photo to start measuring</div>
                </div>
              ) : (
                photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`photo-list-item ${selectedPhotoId === photo.id ? 'active' : ''}`}
                    onClick={() => setSelectedPhotoId(photo.id)}
                  >
                    <img src={photo.url} alt={photo.name} className="photo-thumb" />
                    <div className="photo-list-info">
                      <div className="photo-list-name">{photo.name}</div>
                      <div className="photo-list-meta">
                        {photo.scale ? '✓ Scaled' : '⚠ No scale'} • {photo.measurements.length} measurement{photo.measurements.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {photos.length > 0 && (
              <button className="btn btn-sm photo-export-btn" onClick={exportSummary}>
                📊 Export Summary
              </button>
            )}
          </div>

          {/* Main Content - Selected Photo */}
          <div className="photo-main">
            {!selectedPhoto ? (
              <div className="photo-empty-main">
                <div className="photo-empty-icon-large">📐</div>
                <h3>Welcome to Photo Measure Pro</h3>
                <p>Take measurements directly on photos of properties</p>
                <div className="photo-workflow">
                  <div className="photo-workflow-step">
                    <span className="step-number">1</span>
                    <span>Take or upload a photo</span>
                  </div>
                  <div className="photo-workflow-step">
                    <span className="step-number">2</span>
                    <span>Set scale using a known reference</span>
                  </div>
                  <div className="photo-workflow-step">
                    <span className="step-number">3</span>
                    <span>Draw lines to measure anything</span>
                  </div>
                </div>
                <div className="photo-upload-main">
                  <label className="btn btn-primary btn-lg">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFiles(e.target.files)}
                      style={{ display: 'none' }}
                    />
                    📷 Take Photo
                  </label>
                  <label className="btn btn-lg">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFiles(e.target.files)}
                      style={{ display: 'none' }}
                    />
                    📤 Upload Photos
                  </label>
                </div>
              </div>
            ) : (
              <>
                {/* Photo Name & Actions */}
                <div className="photo-main-header">
                  <input
                    type="text"
                    value={selectedPhoto.name}
                    onChange={(e) => renamePhoto(selectedPhoto.id, e.target.value)}
                    className="photo-name-input"
                  />
                  <button className="btn btn-sm btn-danger" onClick={() => deletePhoto(selectedPhoto.id)}>
                    🗑 Delete
                  </button>
                </div>

                {/* Active Tool Message */}
                {activeTool && activeTool.photoId === selectedPhoto.id && (
                  <div className="photo-active-tool">
                    <span className="tool-indicator">{activeTool.type === 'scale' ? '📏' : '📐'}</span>
                    {activeMessage}
                    <button className="btn btn-sm btn-quiet" onClick={() => setActiveTool(null)}>Cancel</button>
                  </div>
                )}

                {/* Scale Helper Modal */}
                {showScaleHelper === selectedPhoto.id && pendingScale && (
                  <div className="scale-helper">
                    <div className="scale-helper-title">What did you trace?</div>
                    <div className="scale-helper-subtitle">Select a common reference or enter custom</div>
                    <div className="scale-helper-options">
                      {SCALE_REFERENCES.map((ref) => (
                        <button
                          key={ref.name}
                          className="scale-option"
                          onClick={() => {
                            if (ref.value === 0) {
                              // Custom value
                              const valueStr = window.prompt('Enter the length:', '10')
                              if (!valueStr) { setShowScaleHelper(null); setPendingScale(null); return }
                              const value = Number(valueStr)
                              if (!Number.isFinite(value) || value <= 0) { setShowScaleHelper(null); setPendingScale(null); return }
                              const unit = window.prompt('Unit (ft, in, m, cm):', 'ft')?.trim() || 'ft'
                              applyScale(pendingScale.photoId, pendingScale.start, pendingScale.end, value, unit, 'Custom')
                            } else {
                              applyScale(pendingScale.photoId, pendingScale.start, pendingScale.end, ref.value, ref.unit, ref.name)
                            }
                          }}
                        >
                          <span className="scale-option-name">{ref.name}</span>
                          <span className="scale-option-value">{ref.display}</span>
                        </button>
                      ))}
                    </div>
                    <button className="btn btn-quiet" onClick={() => { setShowScaleHelper(null); setPendingScale(null); }}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Scale Status */}
                <div className={`photo-scale-status ${selectedPhoto.scale ? 'scaled' : 'unscaled'}`}>
                  {selectedPhoto.scale ? (
                    <>
                      <span>✓ Scale set: {selectedPhoto.scale.referenceName || 'Custom'} ({selectedPhoto.scale.referenceActual} {selectedPhoto.scale.unitLabel})</span>
                      <button className="btn btn-sm btn-quiet" onClick={() => resetScale(selectedPhoto.id)}>Reset</button>
                    </>
                  ) : (
                    <>
                      <span>⚠ No scale set - measurements will be approximate</span>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setActiveTool({ photoId: selectedPhoto.id, type: 'scale' })}
                      >
                        Set Scale
                      </button>
                    </>
                  )}
                </div>

                {/* Photo Stage */}
                <div
                  className="photo-stage"
                  onPointerDown={(e) => handleStagePointer(selectedPhoto.id, e)}
                  onPointerMove={(e) => {
                    if (activeTool?.photoId === selectedPhoto.id && activeTool.start) handleStagePointer(selectedPhoto.id, e)
                  }}
                  style={{ cursor: activeTool?.photoId === selectedPhoto.id ? 'crosshair' : 'default' }}
                >
                  <img src={selectedPhoto.url} alt={selectedPhoto.name} />
                  <svg className="photo-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    {/* Scale reference line */}
                    {pendingScale && pendingScale.photoId === selectedPhoto.id && (
                      <line
                        x1={pendingScale.start.x * 1000}
                        y1={pendingScale.start.y * 1000}
                        x2={pendingScale.end.x * 1000}
                        y2={pendingScale.end.y * 1000}
                        stroke="#00ff88"
                        strokeWidth={5}
                        strokeLinecap="round"
                        strokeDasharray="10 5"
                      />
                    )}
                    {/* Measurement lines */}
                    {selectedPhoto.measurements.map((m) => (
                      <line
                        key={m.id}
                        x1={m.start.x * 1000}
                        y1={m.start.y * 1000}
                        x2={m.end.x * 1000}
                        y2={m.end.y * 1000}
                        stroke="var(--accent)"
                        strokeWidth={4}
                        strokeLinecap="round"
                      />
                    ))}
                    {/* Preview line */}
                    {activeTool && activeTool.photoId === selectedPhoto.id && activeTool.start && activeTool.current && (
                      <line
                        x1={activeTool.start.x * 1000}
                        y1={activeTool.start.y * 1000}
                        x2={activeTool.current.x * 1000}
                        y2={activeTool.current.y * 1000}
                        stroke={activeTool.type === 'scale' ? '#00ff88' : 'var(--accent-2)'}
                        strokeDasharray="8 8"
                        strokeWidth={4}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  {/* Measurement labels */}
                  {selectedPhoto.measurements.map((m) => {
                    const midX = ((m.start.x + m.end.x) / 2) * 100
                    const midY = ((m.start.y + m.end.y) / 2) * 100
                    return (
                      <div
                        key={`${m.id}-label`}
                        className="photo-measure-label"
                        style={{ left: `${midX}%`, top: `${midY}%` }}
                      >
                        {formatMeasurement(selectedPhoto, m)}
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                <div className="photo-actions">
                  <button
                    className={`btn ${activeTool?.type === 'scale' ? 'active' : ''}`}
                    onClick={() => setActiveTool({ photoId: selectedPhoto.id, type: 'scale' })}
                  >
                    📏 Set Scale
                  </button>
                  <button
                    className={`btn btn-primary ${activeTool?.type === 'measure' ? 'active' : ''}`}
                    onClick={() => setActiveTool({ photoId: selectedPhoto.id, type: 'measure' })}
                    disabled={!selectedPhoto.scale}
                    title={selectedPhoto.scale ? 'Click two points to measure' : 'Set a scale first'}
                  >
                    📐 Measure
                  </button>
                </div>

                {/* Measurements List */}
                <div className="photo-measurements">
                  <div className="photo-measurements-header">
                    <span>Measurements</span>
                    {selectedPhoto.measurements.length > 0 && (
                      <span className="photo-measurements-count">{selectedPhoto.measurements.length}</span>
                    )}
                  </div>
                  {selectedPhoto.measurements.length === 0 ? (
                    <div className="photo-empty-measurements">
                      {selectedPhoto.scale
                        ? 'Click "Measure" then draw lines on the photo'
                        : 'Set a scale first, then add measurements'}
                    </div>
                  ) : (
                    selectedPhoto.measurements.map((m) => (
                      <div key={m.id} className="photo-measure-row">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => renameMeasurement(selectedPhoto.id, m.id, e.target.value)}
                          placeholder="Measurement name"
                        />
                        <div className="photo-measure-value">
                          {formatMeasurement(selectedPhoto, m)}
                        </div>
                        <button className="btn btn-sm btn-quiet" onClick={() => deleteMeasurement(selectedPhoto.id, m.id)}>✕</button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-actions">
          <button className="btn" onClick={() => { setActiveTool(null); onClose() }}>Close</button>
        </div>
      </div>
    </div>
  )
}
