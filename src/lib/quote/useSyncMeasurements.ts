"use client"
import { useEffect, useRef, useCallback } from 'react'
import { usePricingStore } from '@/lib/pricing-store'
import { useQuoteStore } from './store'
import type { Geometry } from './types'

/**
 * Syncs measurements from the old pricing store to the new quote store.
 * This is a bridge to allow gradual migration.
 *
 * IMPORTANT: We track which service each shape was originally created for,
 * so switching services doesn't reassign existing drawings.
 */
export function useSyncMeasurements() {
  const liveMeasurements = usePricingStore(s => s.liveMeasurements)
  const committedMeasurements = usePricingStore(s => s.committedMeasurements)
  const activeServiceId = useQuoteStore(s => s.activeServiceId)
  const upsertGeometry = useQuoteStore(s => s.upsertGeometry)

  // Track which service each shape was originally created for
  // This persists across renders and service switches
  const shapeServiceMap = useRef<Map<string, string>>(new Map())

  // Track processed shape IDs to avoid duplicate processing
  const processedRef = useRef<Set<string>>(new Set())

  // When measurements change, sync to the quote store
  useEffect(() => {
    const measurements = committedMeasurements || liveMeasurements
    if (!measurements || !activeServiceId) return

    // If we have shapes, create geometries from them
    if (measurements.shapes && measurements.shapes.length > 0) {
      measurements.shapes.forEach(shape => {
        // Check if this shape already has a service assigned in our tracking map
        let serviceId = shapeServiceMap.current.get(shape.id)

        // If not tracked yet, this is a new shape - assign the current active service
        if (!serviceId) {
          serviceId = activeServiceId
          shapeServiceMap.current.set(shape.id, serviceId)
        }

        const geometry: Omit<Geometry, 'createdAt' | 'updatedAt'> = {
          id: shape.id,
          serviceId: serviceId,
          kind: shape.type === 'LineString' || shape.type === 'MultiLineString' ? 'POLYLINE' : 'POLYGON',
          measurementValue: shape.type === 'LineString' || shape.type === 'MultiLineString'
            ? shape.perimeter // linear feet
            : shape.area, // square feet
        }
        upsertGeometry(geometry)
      })
    } else if (measurements.totalArea > 0 || measurements.totalPerimeter > 0) {
      // Fallback: create a single aggregate geometry
      // For aggregate, always use active service since there's no shape tracking
      const geometry: Omit<Geometry, 'createdAt' | 'updatedAt'> = {
        id: 'aggregate',
        serviceId: activeServiceId,
        kind: measurements.totalArea > 0 ? 'POLYGON' : 'POLYLINE',
        measurementValue: measurements.totalArea > 0 ? measurements.totalArea : measurements.totalPerimeter,
      }
      upsertGeometry(geometry)
    }
  }, [liveMeasurements, committedMeasurements, activeServiceId, upsertGeometry])

  // Note: Clear is handled by the app store (clearTick), which clears the MapView.
  // The sync will naturally result in empty measurements, which won't create geometries.
}
