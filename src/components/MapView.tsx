"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import mapboxgl, { type MapMouseEvent } from 'mapbox-gl'
import { useAppStore } from '@/lib/store'
import { useSiteStore } from '@/lib/site/store'
import { readToken } from '@/lib/token'
import { usePricingStore } from '@/lib/pricing-store'
import type { MeasurementSnapshot } from '@/lib/pricing-types'
import { useQuoteStore } from '@/lib/quote/store'
import { useStallTool } from '@/tools/useStallTool'
import { useConcreteTool } from '@/tools/useConcreteTool'
import type { StallGroupMeasurement } from '@/types/measurements'
import { enableGoogleSatellite, disableGoogleSatellite } from '@/components/maps/useImageryToggle'
import { GoogleAttributionOverlay } from '@/components/maps/GoogleAttributionOverlay'
import type { AIDetectedFeature, MapBounds } from '@/lib/ai/types'

const SQFT_PER_SQM = 10.76391041671
const FT_PER_METER = 3.2808398950131

export interface MapCaptureResult {
  image: string;
  bounds: MapBounds;
  zoom: number;
  width: number;
  height: number;
}

// Blueprint overlay data structure
export interface BlueprintOverlay {
  pageId: string;
  documentId: string;
  imageUrl: string;
  pageNumber: number;
  category: string | null;
  corners?: [[number, number], [number, number], [number, number], [number, number]];
  opacity?: number;
}

interface MapViewProps {
  onGeometryCreate?: (geometry: GeoJSON.Geometry, featureId: string) => void;
  aiFeatures?: AIDetectedFeature[];
  highlightedAIFeatureId?: string | null;
  captureRef?: React.MutableRefObject<(() => Promise<MapCaptureResult | null>) | null>;
  blueprintOverlay?: BlueprintOverlay | null;
}

export default function MapView({
  onGeometryCreate,
  aiFeatures = [],
  highlightedAIFeatureId,
  captureRef,
  blueprintOverlay,
}: MapViewProps = {}) {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hasToken, setHasToken] = useState<boolean>(false)
  const [tokenSource, setTokenSource] = useState<string | undefined>(undefined)
  const [skipInit, setSkipInit] = useState(false)
  const enabled = useAppStore((s) => s.mapEnabled)
  const setEnabled = useAppStore((s) => s.setMapEnabled)
  const [initTick, setInitTick] = useState(0)
  const [initError, setInitError] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [forceManual, setForceManual] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [textAnnotations, setTextAnnotations] = useState<Array<{id: string; lng: number; lat: number; text: string}>>([])
  const textMarkersRef = useRef<Array<mapboxgl.Marker>>([])
  const [heightMeasurements, setHeightMeasurements] = useState<Array<{id: string; lng: number; lat: number; value: number; label: string}>>([])
  const heightMarkersRef = useRef<Array<mapboxgl.Marker>>([])
  const [streetViewPrompt, setStreetViewPrompt] = useState<string | null>(null)
  const [streetViewState, setStreetViewState] = useState<{ location: [number, number]; prev: { center: [number, number]; zoom: number; pitch: number; bearing: number } } | null>(null)
  const streetViewCleanupRef = useRef<(() => void) | null>(null)
  const streetMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapReadyTick, setMapReadyTick] = useState(0)
  const committedFeaturesRef = useRef<any[]>([])
  const pendingCommitRef = useRef(false)
  const turfRef = useRef<any>(null)
  const [commitTick, setCommitTick] = useState(0)
  const committedMetricsRef = useRef<{ areaSqM: number; lengthM: number }>({ areaSqM: 0, lengthM: 0 })
  const heightMeasurementsRef = useRef(heightMeasurements)
  const computeMeasurementsRef = useRef<(() => void) | null>(null)
  const [stallGroups, setStallGroups] = useState<StallGroupMeasurement[]>([])
  const [liveStallPreview, setLiveStallPreview] = useState<{ rowLengthFt: number; stallCount: number; linealFeet: number } | null>(null)
  const onGeometryCreateRef = useRef(onGeometryCreate)
  const [imageryMode, setImageryMode] = useState<'mapbox' | 'google'>('mapbox')
  const [googleAttribution, setGoogleAttribution] = useState<string>('')
  const [imageryLoading, setImageryLoading] = useState(false)

  // Blueprint overlay position and size state
  const [overlayTransform, setOverlayTransform] = useState({ x: 0, y: 0, width: 400, height: 500, rotation: 0 })
  const overlayDragRef = useRef<{ startX: number; startY: number; startTransformX: number; startTransformY: number } | null>(null)
  const overlayResizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number; corner: string } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    onGeometryCreateRef.current = onGeometryCreate
  }, [onGeometryCreate])

  useEffect(() => {
    heightMeasurementsRef.current = heightMeasurements
  }, [heightMeasurements])

  const mode = useAppStore((s) => s.mode)
  const setMeasurements = useAppStore((s) => s.setMeasurements)
  const clearTick = useAppStore((s) => s.clearTick)
  const command = useAppStore((s) => s.command)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const toggleUnits = useAppStore((s) => s.toggleUnits)
  const enable3D = useAppStore((s) => s.enable3D)
  const updateLivePricingMeasurements = usePricingStore((s) => s.updateLiveMeasurements)
  const commitPricingMeasurements = usePricingStore((s) => s.commitMeasurements)
  const pendingMapFocus = useQuoteStore((s) => s.pendingMapFocus)
  const consumeMapFocus = useQuoteStore((s) => s.consumeMapFocus)

  // Site objects for rendering on map
  const siteObjects = useSiteStore((s) => s.objects)
  const selectedObjectId = useSiteStore((s) => s.selectedObjectId)
  const selectObject = useSiteStore((s) => s.selectObject)

  // Stall Tool integration
  useStallTool(mapRef.current, {
    enabled: mode === 'stall',
    stallWidthFt: 9,
    stallDepthFt: 18,
    layout: 'single',
    hasStopBars: true,
    stopBarCountMode: 'auto',
    existing: stallGroups,
    onCreate: (measurement) => {
      setStallGroups((prev) => [...prev, measurement])
    },
    onLiveUpdate: setLiveStallPreview,
    onDelete: (id) => {
      setStallGroups((prev) => prev.filter((s) => s.id !== id))
    },
  })

  // Concrete Tool integration
  useConcreteTool(mapRef.current, drawRef.current, {
    enabled: mode === 'concrete',
  })

  const formatHeightsForSnapshot = () => {
    const heights = heightMeasurementsRef.current || []
    return heights.map((h) => ({
      id: h.id,
      value: Math.round(h.value * FT_PER_METER * 10) / 10,
      label: h.label,
    }))
  }

  const emitLiveSnapshot = (areaSqM?: number, lengthM?: number) => {
    const snapshot: MeasurementSnapshot = {
      totalArea: Math.round((areaSqM || 0) * SQFT_PER_SQM),
      totalPerimeter: Math.round((lengthM || 0) * FT_PER_METER),
      shapes: [],
      heights: formatHeightsForSnapshot(),
    }
    updateLivePricingMeasurements(snapshot)
  }

  const buildSnapshotFromFeatures = (features: any[]) => {
    const turf = turfRef.current
    let areaSqM = 0
    let lengthM = 0
    const shapes: MeasurementSnapshot['shapes'] = []
    if (turf && Array.isArray(features)) {
      features.forEach((feature: any, index: number) => {
        const geometryType = feature?.geometry?.type
        if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          try {
            const featureArea = turf.area(feature)
            areaSqM += featureArea
            let perimMeters = 0
            try {
              const line = turf.polygonToLine(feature)
              perimMeters = turf.length(line, { units: 'meters' })
            } catch {}
            shapes.push({
              id: feature.id || `shape-${index + 1}`,
              type: geometryType,
              area: Math.round(featureArea * SQFT_PER_SQM),
              perimeter: Math.round(perimMeters * FT_PER_METER),
            })
          } catch {}
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
          try {
            const lengthMeters = turf.length(feature, { units: 'meters' })
            lengthM += lengthMeters
            shapes.push({
              id: feature.id || `shape-${index + 1}`,
              type: geometryType,
              area: 0,
              perimeter: Math.round(lengthMeters * FT_PER_METER),
            })
          } catch {}
        }
      })
    }

    const snapshot: MeasurementSnapshot = {
      totalArea: Math.round(areaSqM * SQFT_PER_SQM),
      totalPerimeter: Math.round(lengthM * FT_PER_METER),
      shapes,
      heights: formatHeightsForSnapshot(),
    }

    return {
      snapshot,
      metrics: { areaSqM, lengthM },
    }
  }

  const markPendingCommit = () => {
    pendingCommitRef.current = true
  }

  const simplifyFeature = (feature: any) => {
    const turf = turfRef.current
    if (!turf) return feature
    const smoothing = useAppStore.getState().smoothing
    const tol = Math.max(0, Math.min(10, smoothing)) * 0.00005
    if (!tol) return feature
    try {
      return turf.simplify(feature, { tolerance: tol, highQuality: false })
    } catch {
      return feature
    }
  }

  const persistCommittedGeometry = () => {
    const draw = drawRef.current as any
    if (!draw) return
    pendingCommitRef.current = false
    const all = draw.getAll()
    const simplified = all.features.map((feature: any) => simplifyFeature(feature))
    committedFeaturesRef.current = simplified
    const { snapshot, metrics } = buildSnapshotFromFeatures(simplified)
    committedMetricsRef.current = metrics
    commitPricingMeasurements(snapshot)
    setCommitTick((tick) => tick + 1)
  }

  const flushPendingCommit = () => {
    if (!pendingCommitRef.current) return
    persistCommittedGeometry()
  }

  const ensure3DLayer = () => {
    const map = mapRef.current
    if (!map) return
    if (!useAppStore.getState().enable3D) return
    try {
      const style = map.getStyle()
      if (!style?.sources?.composite) return
      const layers = style.layers || []
      const labelLayerId = layers.find((layer) => layer.type === 'symbol' && (layer as any).layout?.['text-field'])?.id
      if (map.getLayer('3d-buildings')) {
        map.removeLayer('3d-buildings')
      }
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      } as any, labelLayerId as any)
    } catch (err) {
      console.warn('Failed to sync 3D buildings layer', err)
    }
  }

  const clear3DLayer = () => {
    const map = mapRef.current
    if (!map) return
    try {
      if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings')
    } catch (err) {
      console.warn('Failed to remove 3D layer', err)
    }
  }

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('skipinit')) setSkipInit(true)
      if (url.searchParams.has('autoinit')) setEnabled(true)
      if (url.searchParams.has('disablemap')) { setEnabled(false); setForceManual(true) }
    } catch {}
  }, [setEnabled])

  // Auto-enable when a token is available
  useEffect(() => {
    if (skipInit || enabled || forceManual) return
    try {
      const { token } = readToken()
      if (token) setEnabled(true)
    } catch {}
  }, [skipInit, enabled, forceManual, setEnabled])

  useEffect(() => {
    if (skipInit || !enabled) return
    let cancelled = false
    const { token, source } = readToken()
    setHasToken(!!token)
    setTokenSource(source)
    if (!token) return

    ;(async () => {
      try {
        const [
          { default: mapboxgl, NavigationControl },
          { default: MapboxDraw },
          turf,
        ] = await Promise.all([
          import('mapbox-gl') as any,
          import('@mapbox/mapbox-gl-draw') as any,
          import('@turf/turf') as any,
        ])
        if (cancelled) return
        ;(mapboxgl as any).accessToken = token
        turfRef.current = turf
        // Compute style, supporting 'auto' (system theme)
        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        const computeStyle = (styleId: string) => {
          if (styleId === 'auto') {
            return mql.matches ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'
          }
          return styleId
        }

        setMapLoading(true)
        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: computeStyle(useAppStore.getState().styleId),
          center: [-97.75, 30.27],
          zoom: 11,
          attributionControl: true,
          preserveDrawingBuffer: true,
        })
        mapRef.current = map

        const onMapLoad = async () => {
          if (cancelled) return
          try { map.setFog({ 'horizon-blend': 0.1, color: '#d2e9ff', 'high-color': '#aad4ff' } as any) } catch {}

          // Add 3D buildings once the style is idle so tilt mode works immediately when enabled
          map.once('idle', ensure3DLayer)

          // Controls after load
          const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true, line_string: true },
            defaultMode: 'simple_select',
          })
          drawRef.current = draw
          try { map.addControl(draw, 'top-right') } catch {}
          try { map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right') } catch {}

          // Address search (Mapbox Geocoder)
          try {
            const geocoderMod: any = await import('@mapbox/mapbox-gl-geocoder')
            const Geocoder: any = geocoderMod?.default || geocoderMod
            const geocoder = new Geocoder({
              accessToken: (mapboxgl as any).accessToken,
              mapboxgl,
              marker: false,
              collapsed: true,
              placeholder: 'Search address…',
            })
            map.addControl(geocoder as any, 'top-right')
          } catch {}

          // Measurement compute
          const compute = () => {
            if (!drawRef.current) return
            const all = (drawRef.current as any).getAll()
            let area = 0
            let length = 0
            for (const f of all.features as any[]) {
              const g = f as any
              if (g.geometry?.type === 'Polygon' || g.geometry?.type === 'MultiPolygon') {
                try { area += (turf as any).area(g as any) } catch {}
              }
              if (g.geometry?.type === 'LineString' || g.geometry?.type === 'MultiLineString') {
                try { length += (turf as any).length(g as any, { units: 'meters' }) } catch {}
              }
            }
            emitLiveSnapshot(area || 0, length || 0)
          }
          const computeRef: { current: () => void } = { current: compute }
          computeMeasurementsRef.current = () => {
            compute()
            persistCommittedGeometry()
          }

          const onCreate = (e: any) => {
            compute()
            persistCommittedGeometry()
            // Notify callback about new geometry
            if (onGeometryCreateRef.current && e?.features?.length) {
              for (const feature of e.features) {
                if (feature.geometry && feature.id) {
                  onGeometryCreateRef.current(feature.geometry, String(feature.id))
                }
              }
            }
          }
          const onUpdate = () => {
            compute()
            markPendingCommit()
          }
          const onDelete = () => {
            compute()
            persistCommittedGeometry()
          }
          map.on('draw.create', onCreate)
          map.on('draw.update', onUpdate)
          map.on('draw.delete', onDelete)

          // Respond to style toggle
          const onMql = () => {
            if (useAppStore.getState().styleId === 'auto') {
              try {
                map.setStyle(computeStyle('auto'))
                map.once('style.load', ensure3DLayer)
              } catch {}
            }
          }
          mql.addEventListener?.('change', onMql)
          const unsubStyle = useAppStore.subscribe((state, prev) => {
            if (state.styleId !== prev.styleId) {
              try {
                map.setStyle(computeStyle(state.styleId))
                map.once('style.load', ensure3DLayer)
              } catch {}
            }
          })

          // Freehand drawing support
          let drawing = false
          let points: number[][] = []
          let lastScreen: { x: number; y: number } | null = null
          const pxThreshold = 3
          function startFreehand(e: MapMouseEvent) {
            drawing = true
            points = [[e.lngLat.lng, e.lngLat.lat]]
            lastScreen = map.project(e.lngLat)
            try { map.dragPan.disable() } catch {}
          }
          function moveFreehand(e: MapMouseEvent) {
            if (!drawing) return
            const p = map.project(e.lngLat)
            if (!lastScreen || Math.hypot(p.x - lastScreen.x, p.y - lastScreen.y) >= pxThreshold) {
              points.push([e.lngLat.lng, e.lngLat.lat])
              lastScreen = p
            }
          }
          function endFreehand() {
            if (!drawing) return
            drawing = false
            try { map.dragPan.enable() } catch {}
            if (points.length > 3) {
              const ls = (turf as any).lineString(points)
              const smoothing = useAppStore.getState().smoothing
              const tol = Math.max(0, Math.min(10, smoothing)) * 0.00005
              const simplified = tol > 0 ? (turf as any).simplify(ls as any, { tolerance: tol, highQuality: false }) as any : ls
              const coords = simplified.geometry.coordinates.slice()
              if (coords.length > 3) {
                coords.push(coords[0])
                const geometry = { type: 'Polygon', coordinates: [coords] } as GeoJSON.Geometry
                const poly = { type: 'Feature', properties: {}, geometry } as any
                const featureIds = (drawRef.current as any)?.add(poly)
                computeRef.current()
                persistCommittedGeometry()
                // Notify callback about new freehand geometry
                if (onGeometryCreateRef.current && featureIds?.length) {
                  onGeometryCreateRef.current(geometry, String(featureIds[0]))
                }
              }
            }
            points = []
            lastScreen = null
          }
          const onMouseDown = (e: MapMouseEvent) => {
            const shiftHeld = (e.originalEvent as any).shiftKey
            const shouldFreehand = useAppStore.getState().mode === 'freehand' || (useAppStore.getState().mode === 'polygon' && shiftHeld)
            if (shouldFreehand) startFreehand(e)
          }
          const onMouseMove = (e: MapMouseEvent) => moveFreehand(e)
          const onMouseUp = () => {
            endFreehand()
            flushPendingCommit()
          }

          // Touch event handlers for mobile/tablet
          const onTouchStart = (e: MapMouseEvent) => {
            const shouldFreehand = useAppStore.getState().mode === 'freehand'
            if (shouldFreehand) {
              e.preventDefault()
              startFreehand(e)
            }
          }
          const onTouchMove = (e: MapMouseEvent) => {
            if (useAppStore.getState().mode === 'freehand') {
              e.preventDefault()
              moveFreehand(e)
            }
          }
          const onTouchEnd = () => {
            endFreehand()
            flushPendingCommit()
          }

          map.on('mousedown', onMouseDown)
          map.on('mousemove', onMouseMove)
          map.on('mouseup', onMouseUp)
          map.on('mouseout', onMouseUp)
          map.on('touchstart', onTouchStart)
          map.on('touchmove', onTouchMove)
          map.on('touchend', onTouchEnd)
          map.on('touchcancel', onTouchEnd)

          // Text annotation click handler
          const onMapClick = (e: MapMouseEvent) => {
            const currentMode = useAppStore.getState().mode

            if (currentMode === 'text') {
              const text = prompt('Enter text label:')
              if (!text) return
              const id = 'text_' + Date.now()
              const annotation = { id, lng: e.lngLat.lng, lat: e.lngLat.lat, text }
              setTextAnnotations(prev => [...prev, annotation])
            } else if (currentMode === 'height') {
              const isImp = useAppStore.getState().unitSystem === 'imperial'
              const input = prompt(`Enter height (${isImp ? 'feet' : 'meters'}):`, isImp ? '10' : '3')
              if (!input) return
              const value = Number(input)
              if (Number.isNaN(value) || value <= 0) return

              // Convert to meters for storage
              const valueInMeters = isImp ? value * 0.3048 : value
              const label = isImp ? `${value} ft` : `${value} m`

              const id = 'height_' + Date.now()
              const measurement = { id, lng: e.lngLat.lng, lat: e.lngLat.lat, value: valueInMeters, label }
              setHeightMeasurements(prev => [...prev, measurement])
            }
          }
          map.on('click', onMapClick)

          // Cleanup on unload
          const cleanup = () => {
            try { unsubStyle() } catch {}
            try { mql.removeEventListener?.('change', onMql) } catch {}
            try { map.off('draw.create', onCreate) } catch {}
            try { map.off('draw.update', onUpdate) } catch {}
            try { map.off('draw.delete', onDelete) } catch {}
            try { map.off('mousedown', onMouseDown) } catch {}
            try { map.off('mousemove', onMouseMove) } catch {}
            try { map.off('mouseup', onMouseUp) } catch {}
            try { map.off('mouseout', onMouseUp) } catch {}
            try { map.off('touchstart', onTouchStart) } catch {}
            try { map.off('touchmove', onTouchMove) } catch {}
            try { map.off('touchend', onTouchEnd) } catch {}
            try { map.off('touchcancel', onTouchEnd) } catch {}
            try { map.off('click', onMapClick) } catch {}
            textMarkersRef.current.forEach(m => m.remove())
            textMarkersRef.current = []
            heightMarkersRef.current.forEach(m => m.remove())
            heightMarkersRef.current = []
          }
          // Store cleanup on ref for outer dispose
          ;(map as any).__abp_cleanup = cleanup
          setMapReadyTick((n) => n + 1)
          setMapLoading(false)
        }

        map.once('load', onMapLoad)

        return () => {
          try { streetViewCleanupRef.current?.() } catch {}
          try { (mapRef.current as any)?.__abp_cleanup?.() } catch {}
          try { mapRef.current?.off('load', onMapLoad) } catch {}
          try { mapRef.current?.remove() } catch {}
          mapRef.current = null
          drawRef.current = null
        }
      } catch (err) {
        console.warn('Map failed to initialize:', err)
        if (!cancelled) {
          setHasToken(false)
          setInitError(err instanceof Error ? err.message : String(err))
        }
      }
    })()

    return () => { cancelled = true }
  }, [skipInit, enabled, initTick, updateLivePricingMeasurements, commitPricingMeasurements])

  // Setup capture function for AI detection
  useEffect(() => {
    if (!captureRef) return;

    captureRef.current = async (): Promise<MapCaptureResult | null> => {
      const map = mapRef.current;
      if (!map) return null;

      try {
        const canvas = map.getCanvas();
        const bounds = map.getBounds();
        const zoom = map.getZoom();

        // Convert canvas to base64
        const dataUrl = await new Promise<string>((resolve) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve('');
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          }, 'image/png');
        });

        if (!dataUrl) return null;

        return {
          image: dataUrl,
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          },
          zoom,
          width: canvas.width,
          height: canvas.height,
        };
      } catch (err) {
        console.error('Failed to capture map:', err);
        return null;
      }
    };

    return () => {
      if (captureRef) captureRef.current = null;
    };
  }, [captureRef]);

  // Render AI detected features as overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = 'ai-features-source';
    const fillLayerId = 'ai-features-fill';
    const lineLayerId = 'ai-features-line';
    const highlightLayerId = 'ai-features-highlight';

    // Create GeoJSON from features
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: aiFeatures.map((f) => ({
        type: 'Feature',
        id: f.id,
        properties: {
          id: f.id,
          type: f.type,
          confidence: f.confidence,
          highlighted: f.id === highlightedAIFeatureId,
        },
        geometry: f.geometry,
      })),
    };

    // Add or update source
    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      // Add fill layer for polygons
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'type'], 'building-footprint'], '#ef4444',
            '#6366f1'
          ],
          'fill-opacity': [
            'case',
            ['get', 'highlighted'], 0.4,
            0.2
          ],
        },
      });

      // Add line layer for outlines
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'type'], 'building-footprint'], '#ef4444',
            '#6366f1'
          ],
          'line-width': [
            'case',
            ['get', 'highlighted'], 3,
            2
          ],
          'line-dasharray': [2, 2],
        },
      });
    }

    // Cleanup on unmount or when features change
    return () => {
      try {
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [aiFeatures, highlightedAIFeatureId, mapReadyTick]);

  // Render site objects on map with selection highlighting
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = 'site-objects-source';
    const fillLayerId = 'site-objects-fill';
    const lineLayerId = 'site-objects-line';
    const selectedFillLayerId = 'site-objects-selected-fill';
    const selectedLineLayerId = 'site-objects-selected-line';

    // Create GeoJSON from site objects
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: siteObjects.map((obj) => ({
        type: 'Feature',
        id: obj.id,
        properties: {
          id: obj.id,
          objectType: obj.object_type,
          subType: obj.sub_type,
          label: obj.label,
          isSelected: obj.id === selectedObjectId,
        },
        geometry: obj.geometry,
      })),
    };

    // Remove existing layers/source
    try {
      if (map.getLayer(selectedLineLayerId)) map.removeLayer(selectedLineLayerId);
      if (map.getLayer(selectedFillLayerId)) map.removeLayer(selectedFillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {}

    if (siteObjects.length === 0) return;

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
    });

    // Add fill layer for polygons (non-selected)
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      filter: ['all', ['==', '$type', 'Polygon'], ['!=', ['get', 'isSelected'], true]],
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.2,
      },
    });

    // Add line layer (non-selected)
    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      filter: ['!=', ['get', 'isSelected'], true],
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
      },
    });

    // Add selected fill layer
    map.addLayer({
      id: selectedFillLayerId,
      type: 'fill',
      source: sourceId,
      filter: ['all', ['==', '$type', 'Polygon'], ['==', ['get', 'isSelected'], true]],
      paint: {
        'fill-color': '#f59e0b',
        'fill-opacity': 0.4,
      },
    });

    // Add selected line layer
    map.addLayer({
      id: selectedLineLayerId,
      type: 'line',
      source: sourceId,
      filter: ['==', ['get', 'isSelected'], true],
      paint: {
        'line-color': '#f59e0b',
        'line-width': 4,
      },
    });

    // Add click handler to select objects
    const handleClick = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [fillLayerId, lineLayerId, selectedFillLayerId, selectedLineLayerId],
      });

      if (features.length > 0) {
        const clickedId = features[0].properties?.id;
        if (clickedId) {
          selectObject(clickedId === selectedObjectId ? null : clickedId);
        }
      }
    };

    map.on('click', fillLayerId, handleClick);
    map.on('click', lineLayerId, handleClick);
    map.on('click', selectedFillLayerId, handleClick);
    map.on('click', selectedLineLayerId, handleClick);

    // Change cursor on hover
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('mouseenter', fillLayerId, handleMouseEnter);
    map.on('mouseenter', lineLayerId, handleMouseEnter);
    map.on('mouseleave', fillLayerId, handleMouseLeave);
    map.on('mouseleave', lineLayerId, handleMouseLeave);

    return () => {
      map.off('click', fillLayerId, handleClick);
      map.off('click', lineLayerId, handleClick);
      map.off('click', selectedFillLayerId, handleClick);
      map.off('click', selectedLineLayerId, handleClick);
      map.off('mouseenter', fillLayerId, handleMouseEnter);
      map.off('mouseenter', lineLayerId, handleMouseEnter);
      map.off('mouseleave', fillLayerId, handleMouseLeave);
      map.off('mouseleave', lineLayerId, handleMouseLeave);
      try {
        if (map.getLayer(selectedLineLayerId)) map.removeLayer(selectedLineLayerId);
        if (map.getLayer(selectedFillLayerId)) map.removeLayer(selectedFillLayerId);
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [siteObjects, selectedObjectId, selectObject, mapReadyTick]);

  useEffect(() => {
    const { areaSqM, lengthM } = committedMetricsRef.current
    setMeasurements({
      area: areaSqM || undefined,
      length: lengthM || undefined,
      heights: heightMeasurements.length ? heightMeasurements : undefined,
    })
  }, [commitTick, heightMeasurements, setMeasurements])

  useEffect(() => {
    if (!commitPricingMeasurements) return
    const { snapshot, metrics } = buildSnapshotFromFeatures(committedFeaturesRef.current)
    committedMetricsRef.current = metrics
    commitPricingMeasurements(snapshot)
  }, [heightMeasurements, commitPricingMeasurements])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (enable3D) {
      if (map.isStyleLoaded()) ensure3DLayer()
      else map.once('style.load', ensure3DLayer)
      try {
        map.easeTo({ pitch: Math.max(55, map.getPitch()), bearing: map.getBearing(), duration: 800, essential: true })
      } catch {}
    } else {
      clear3DLayer()
      try {
        map.easeTo({ pitch: 0, duration: 600, essential: true })
      } catch {}
    }
  }, [enable3D, mapReadyTick])

  // Google satellite imagery toggle
  useEffect(() => {
    const map = mapRef.current
    console.log('[Imagery] Effect triggered, mode:', imageryMode, 'map:', !!map)
    if (!map) return

    const apply = async () => {
      console.log('[Imagery] Applying mode:', imageryMode)
      if (imageryMode === 'google') {
        setImageryLoading(true)
        try {
          console.log('[Imagery] Enabling Google satellite...')
          const session = await enableGoogleSatellite(map)
          console.log('[Imagery] Google satellite enabled, session:', session)
          setGoogleAttribution(session.attributionText || 'Data © Google')
        } catch (err) {
          console.error('[Imagery] Failed to enable Google satellite:', err)
          setImageryMode('mapbox')
        } finally {
          setImageryLoading(false)
        }
      } else {
        console.log('[Imagery] Disabling Google satellite')
        disableGoogleSatellite(map)
        setGoogleAttribution('')
      }
    }

    // Wait for style to be ready before applying
    const tryApply = () => {
      if (map.isStyleLoaded()) {
        console.log('[Imagery] Style loaded, applying now')
        void apply()
      } else {
        console.log('[Imagery] Style not loaded, waiting for idle...')
        map.once('idle', () => {
          console.log('[Imagery] Map idle, applying now')
          void apply()
        })
      }
    }

    tryApply()
  }, [imageryMode, mapReadyTick])

  useEffect(() => {
    if (!pendingMapFocus) return
    const map = mapRef.current
    if (!map) return
    // Wait until map 'load' event has fired (mapReadyTick > 0)
    if (mapReadyTick === 0) return
    try {
      map.flyTo({
        center: [pendingMapFocus.lng, pendingMapFocus.lat],
        zoom: pendingMapFocus.zoom ?? Math.max(map.getZoom(), 18),
        essential: true,
      })
      consumeMapFocus()
    } catch {
      // flyTo failed - will retry when mapReadyTick changes
    }
  }, [pendingMapFocus, consumeMapFocus, mapReadyTick])

  // Capture unhandled rejections while initializing
  useEffect(() => {
    if (!enabled) return
    const onRej = (e: PromiseRejectionEvent) => {
      try {
        const msg = e?.reason?.message || String(e?.reason || 'unknown')
        setInitError((prev) => prev || msg)
      } catch {}
    }
    const onErr = (e: ErrorEvent) => {
      try { setInitError((prev) => prev || (e?.error?.message || e.message || 'error')) } catch {}
    }
    window.addEventListener('unhandledrejection', onRej)
    window.addEventListener('error', onErr)
    return () => {
      window.removeEventListener('unhandledrejection', onRej)
      window.removeEventListener('error', onErr)
    }
  }, [enabled])

  // respond to mode changes - include mapReadyTick to re-run when draw is ready
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    try {
      if (mode === 'polygon' || mode === 'concrete') {
        draw.changeMode('draw_polygon')
      } else if (mode === 'line') {
        draw.changeMode('draw_line_string')
      } else if (mode === 'freehand') {
        // Freehand uses custom mouse handlers, keep draw in polygon mode
        // so the freehand handlers can work without MapboxDraw interference
        draw.changeMode('draw_polygon')
      } else if (mode === 'pan') {
        // Only switch to simple_select (hand/pan mode) when explicitly requested
        draw.changeMode('simple_select')
      } else {
        // For other modes (text, height, stall), keep in simple_select but
        // these modes have their own click handlers that take precedence
        draw.changeMode('simple_select')
      }
    } catch {
      // draw not ready yet
    }
  }, [mode, mapReadyTick])

  // Render text annotations as markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing markers
    textMarkersRef.current.forEach(m => m.remove())
    textMarkersRef.current = []

    // Create new markers for each annotation
    textAnnotations.forEach(ann => {
      const el = document.createElement('div')
      el.className = 'text-marker'
      el.textContent = ann.text
      el.style.cssText = 'background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #000; border: 1px solid #333; cursor: pointer; white-space: nowrap;'

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ann.lng, ann.lat])
        .addTo(map)

      textMarkersRef.current.push(marker)
    })
  }, [textAnnotations])

  // Render height measurements as markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing markers
    heightMarkersRef.current.forEach(m => m.remove())
    heightMarkersRef.current = []

    // Create new markers for each height measurement
    heightMeasurements.forEach(h => {
      const el = document.createElement('div')
      el.className = 'height-marker'
      el.textContent = `↕ ${h.label}`
      el.style.cssText = 'background: rgba(122,162,255,0.9); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #fff; border: 1px solid #4a7acc; cursor: pointer; white-space: nowrap;'

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([h.lng, h.lat])
        .addTo(map)

      heightMarkersRef.current.push(marker)
    })
  }, [heightMeasurements])

  // respond to clear requests
  useEffect(() => {
    const draw = drawRef.current
    try { draw?.deleteAll() } catch {}
    committedFeaturesRef.current = []
    pendingCommitRef.current = false
    committedMetricsRef.current = { areaSqM: 0, lengthM: 0 }
    setTextAnnotations([])
    setHeightMeasurements([])
    setStallGroups([])
    const emptySnapshot: MeasurementSnapshot = { totalArea: 0, totalPerimeter: 0, shapes: [], heights: [] }
    updateLivePricingMeasurements(emptySnapshot)
    commitPricingMeasurements(emptySnapshot)
    setCommitTick((tick) => tick + 1)
  }, [clearTick, updateLivePricingMeasurements, commitPricingMeasurements])

  // Handle commands (export/rectangle/circle)
  useEffect(() => {
    if (!command) return
    const map = mapRef.current
    const draw = drawRef.current as any
    if (!map || !draw) return

    const currentId = command.id

    function download(name: string, type: string, data: BlobPart) {
      const blob = new Blob([data], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    const run = async () => {
      if (command.id !== currentId) return
      const all = draw.getAll()
      switch (command.type) {
        case 'export:json': {
          // Add text annotations as Point features
          const textFeatures = textAnnotations.map(ann => ({
            type: 'Feature',
            properties: { text: ann.text, type: 'text-annotation' },
            geometry: { type: 'Point', coordinates: [ann.lng, ann.lat] }
          }))
          // Add height measurements as Point features
          const heightFeatures = heightMeasurements.map(h => ({
            type: 'Feature',
            properties: { height: h.value, label: h.label, type: 'height-measurement' },
            geometry: { type: 'Point', coordinates: [h.lng, h.lat] }
          }))
          const combined = {
            type: 'FeatureCollection',
            features: [...all.features, ...textFeatures, ...heightFeatures]
          }
          download('areas.geojson', 'application/geo+json', JSON.stringify(combined))
          break
        }
        case 'export:png': {
          try {
            map.getCanvas().toBlob((blob) => {
              if (!blob) return
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = 'map-snapshot.png'
              document.body.appendChild(a)
              a.click()
              a.remove()
            })
          } catch {}
          break
        }
        case 'export:csv': {
          try {
            const turf = await import('@turf/turf') as any
            let areaSqM = 0
            let perimeterKm = 0
            const rows: string[] = []
            let idx = 0
            for (const f of all.features as any[]) {
              if (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') {
                try {
                  const a = turf.area(f)
                  const lines = turf.polygonToLine(f)
                  const p = turf.length(lines, { units: 'kilometers' })
                  areaSqM += a
                  perimeterKm += p
                  const areaSqFt = a * 10.76391041671
                  const perimM = p * 1000
                  const perimFt = p * 3280.8398950131
                  rows.push([String(++idx), areaSqFt.toFixed(2), a.toFixed(2), perimFt.toFixed(2), perimM.toFixed(2)].join(','))
                } catch {}
              }
            }
            const areaSqFt = areaSqM * 10.76391041671
            const perimM = perimeterKm * 1000
            const perimFt = perimeterKm * 3280.8398950131
            let csv = 'Area Measurement Report\n'
            csv += `Units:,${unitSystem === 'imperial' ? 'Imperial (ft/sq ft)' : 'Metric (m/sq m)'}\n\n`
            csv += 'SUMMARY\n'
            csv += `Total Area (sq ft):,${areaSqFt.toFixed(2)}\n`
            csv += `Total Area (sq m):,${areaSqM.toFixed(2)}\n`
            csv += `Total Perimeter (ft):,${perimFt.toFixed(2)}\n`
            csv += `Total Perimeter (m):,${perimM.toFixed(2)}\n`
            csv += `Number of Shapes:,${rows.length}\n`
            csv += `Number of Height Measurements:,${heightMeasurements.length}\n\n`
            csv += 'INDIVIDUAL SHAPES\n'
            csv += 'Shape #,Area (sq ft),Area (sq m),Perimeter (ft),Perimeter (m)\n'
            csv += rows.join('\n') + (rows.length ? '\n' : '')
            if (heightMeasurements.length > 0) {
              csv += '\nHEIGHT MEASUREMENTS\n'
              csv += 'Measurement #,Height (ft),Height (m)\n'
              heightMeasurements.forEach((h, i) => {
                const heightFt = h.value * 3.28084
                const heightM = h.value
                csv += `${i + 1},${heightFt.toFixed(2)},${heightM.toFixed(2)}\n`
              })
            }
            download('areas.csv', 'text/csv', csv)
          } catch {}
          break
        }
        case 'export:quote': {
          // Send measurement data to parent website via postMessage
          try {
            const { integrationAPI } = await import('@/lib/integration')
            if (!integrationAPI) break

            const turf = await import('@turf/turf') as any
            let areaSqM = 0
            let perimeterM = 0
            const shapes: any[] = []

            for (const f of all.features as any[]) {
              if (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') {
                try {
                  const a = turf.area(f)
                  const lines = turf.polygonToLine(f)
                  const p = turf.length(lines, { units: 'meters' })
                  areaSqM += a
                  perimeterM += p
                  shapes.push({
                    id: f.id || `shape-${shapes.length + 1}`,
                    type: f.properties?.draw_type || 'polygon',
                    area: a * 10.76391041671, // sq ft
                    perimeter: p * 3.28084, // ft
                    coordinates: f.geometry.coordinates
                  })
                } catch {}
              }
            }

            const measurementData = {
              totalArea: areaSqM * 10.76391041671, // sq ft
              totalPerimeter: perimeterM * 3.28084, // ft
              unit: unitSystem,
              shapes,
              heights: heightMeasurements.map(h => ({
                id: h.id,
                value: h.value * 3.28084, // ft
                unit: 'ft',
                coordinates: [h.lng, h.lat] as [number, number],
                label: h.label
              })),
              notes: useAppStore.getState().notes,
              timestamp: new Date().toISOString()
            }

            integrationAPI.exportToQuote(measurementData)

            // Show confirmation if not embedded (for testing)
            if (!integrationAPI.isEmbedded()) {
              console.log('Quote data (would be sent to parent):', measurementData)
              alert('Measurement data prepared! When embedded in a website, this will be sent to the parent page.')
            }
          } catch (err) {
            console.error('Export to quote failed:', err)
          }
          break
        }
        case 'export:iif': {
          // Export QuickBooks IIF format for estimates
          try {
            const turf = await import('@turf/turf') as any
            const notes = useAppStore.getState().notes
            const today = new Date()
            const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`

            let totalAreaSqFt = 0
            let totalPerimeterFt = 0
            const lineItems: { desc: string; qty: number; rate: number }[] = []
            let shapeIdx = 0

            for (const f of all.features as any[]) {
              if (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') {
                try {
                  const areaSqM = turf.area(f)
                  const lines = turf.polygonToLine(f)
                  const perimM = turf.length(lines, { units: 'meters' })
                  const areaSqFt = areaSqM * 10.76391041671
                  const perimFt = perimM * 3.28084
                  totalAreaSqFt += areaSqFt
                  totalPerimeterFt += perimFt
                  shapeIdx++

                  // Add as line item (area-based service)
                  lineItems.push({
                    desc: `Area ${shapeIdx}: ${areaSqFt.toFixed(0)} sq ft`,
                    qty: Math.ceil(areaSqFt),
                    rate: 0 // Rate to be filled in by user
                  })
                } catch {}
              }
            }

            // Add height measurements as line items
            heightMeasurements.forEach((h, i) => {
              const heightFt = h.value * 3.28084
              lineItems.push({
                desc: `Height ${i + 1}: ${heightFt.toFixed(1)} ft${h.label ? ` - ${h.label}` : ''}`,
                qty: 1,
                rate: 0
              })
            })

            // Build IIF file content
            // IIF is tab-delimited format for QuickBooks Desktop
            let iif = ''

            // Header for Estimate
            iif += '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\n'
            iif += '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tCLASS\tAMOUNT\tDOCNUM\tMEMO\tQNTY\tPRICE\tINVITEM\tTAXABLE\n'
            iif += '!ENDTRNS\n'

            // Estimate transaction (placeholder - user fills in customer name and amounts)
            const memo = notes ? notes.substring(0, 100).replace(/[\t\n\r]/g, ' ') : 'Area Bid Pro Measurement'
            const docNum = `ABP-${Date.now().toString(36).toUpperCase()}`

            iif += `TRNS\tESTIMATE\t${dateStr}\tAccounts Receivable\t\t\t0.00\t${docNum}\t${memo}\n`

            // Add line items
            lineItems.forEach((item) => {
              const itemDesc = item.desc.replace(/[\t\n\r]/g, ' ')
              iif += `SPL\tESTIMATE\t${dateStr}\tSales\t\t\t0.00\t${docNum}\t${itemDesc}\t${item.qty}\t${item.rate.toFixed(2)}\tServices\tN\n`
            })

            // Summary line
            iif += `SPL\tESTIMATE\t${dateStr}\tSales\t\t\t0.00\t${docNum}\tTotal: ${totalAreaSqFt.toFixed(0)} sq ft, ${totalPerimeterFt.toFixed(0)} ft perimeter\t1\t0.00\tServices\tN\n`

            iif += 'ENDTRNS\n'

            download(`estimate-${docNum}.iif`, 'application/octet-stream', iif)
          } catch (err) {
            console.error('IIF export failed:', err)
          }
          break
        }
        case 'draw:rectangle': {
          let first: [number, number] | null = null
          const onClick = (e: MapMouseEvent) => {
            if (!first) {
              first = [e.lngLat.lng, e.lngLat.lat]
            } else {
              const second: [number, number] = [e.lngLat.lng, e.lngLat.lat]
              const minX = Math.min(first[0], second[0])
              const maxX = Math.max(first[0], second[0])
              const minY = Math.min(first[1], second[1])
              const maxY = Math.max(first[1], second[1])
              const rect = {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Polygon', coordinates: [[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]]] },
              }
              try { draw.add(rect) } catch {}
              computeMeasurementsRef.current?.()
              map.off('click', onClick)
              first = null
            }
          }
          map.off('click', onClick)
          map.on('click', onClick)
          break
        }
        case 'draw:circle': {
          const once = (e: MapMouseEvent) => {
            const center: [number, number] = [e.lngLat.lng, e.lngLat.lat]
            const isImp = unitSystem === 'imperial'
            const input = window.prompt(`Enter radius (${isImp ? 'feet' : 'meters'}):`, isImp ? '50' : '15')
            if (!input) { map.off('click', once); return }
            const radius = Number(input)
            if (Number.isNaN(radius) || radius <= 0) { map.off('click', once); return }
            const miles = isImp ? radius / 5280 : (radius / 1000) * 0.621371
            import('@turf/turf').then((t: any) => {
              try {
                const circle = t.circle(center, miles, { steps: 128, units: 'miles' })
                draw.add(circle)
                computeMeasurementsRef.current?.()
              } catch {}
            }).finally(() => map.off('click', once))
          }
          map.off('click', once)
          map.on('click', once)
          break
        }
        case 'view:reset': {
          try {
            map.flyTo({ center: [-97.75, 30.27], zoom: 11 })
          } catch {}
          break
        }
        case 'view:streetview': {
          const canvas = map.getCanvas()
          const prevCursor = canvas.style.cursor
          streetViewCleanupRef.current?.()
          if (streetMarkerRef.current) {
            try { streetMarkerRef.current.remove() } catch {}
            streetMarkerRef.current = null
          }
          setStreetViewState(null)
          const exitSelection = () => {
            try { map.off('click', onClick) } catch {}
            window.removeEventListener('keydown', selectionKeyHandler)
            try { canvas.style.cursor = prevCursor } catch {}
            setStreetViewPrompt(null)
            streetViewCleanupRef.current = null
          }
          const selectionKeyHandler = (evt: KeyboardEvent) => {
            if (evt.key === 'Escape') exitSelection()
          }
          const onClick = (e: MapMouseEvent) => {
            exitSelection()
            const prevView = {
              center: map.getCenter().toArray() as [number, number],
              zoom: map.getZoom(),
              pitch: map.getPitch(),
              bearing: map.getBearing(),
            }
            const target: [number, number] = [e.lngLat.lng, e.lngLat.lat]
            setStreetViewState({ location: target, prev: prevView })
            const marker = new mapboxgl.Marker({ color: '#ff8c8c' }).setLngLat(target).addTo(map)
            streetMarkerRef.current = marker
            ensure3DLayer()
            setStreetViewPrompt('Street mode active. Drag to look around or press Esc to exit.')
            const exitKeyHandler = (evt: KeyboardEvent) => {
              if (evt.key === 'Escape') streetViewCleanupRef.current?.()
            }
            window.addEventListener('keydown', exitKeyHandler)
            streetViewCleanupRef.current = (restore = true) => {
              try { marker.remove() } catch {}
              streetMarkerRef.current = null
              window.removeEventListener('keydown', exitKeyHandler)
              setStreetViewState(null)
              setStreetViewPrompt(null)
              try { canvas.style.cursor = prevCursor } catch {}
              if (restore) {
                try {
                  map.easeTo({ center: prevView.center, zoom: prevView.zoom, pitch: prevView.pitch, bearing: prevView.bearing, duration: 800, essential: true })
                } catch {}
              }
            }
            try {
              map.easeTo({
                center: target,
                zoom: Math.max(17, prevView.zoom),
                pitch: Math.max(70, prevView.pitch, 70),
                bearing: prevView.bearing,
                duration: 1200,
                essential: true,
              })
            } catch {}
          }
          window.addEventListener('keydown', selectionKeyHandler)
          map.on('click', onClick)
          setStreetViewPrompt('Street mode: click a spot to dive in (Esc to cancel).')
          try { canvas.style.cursor = 'crosshair' } catch {}
          streetViewCleanupRef.current = exitSelection
          break
        }
        case 'import:json': {
          try {
            const payload = (command as any).payload as string | undefined
            if (!payload) break
            let parsed: any
            try { parsed = JSON.parse(payload) } catch { break }
            const addFeature = (f: any) => {
              try { draw.add(f) } catch {}
            }
            if (parsed?.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
              for (const f of parsed.features) addFeature(f)
            } else if (parsed?.type === 'Feature') {
              addFeature(parsed)
            } else {
              // try treating as geometry
              if (parsed?.type && parsed?.coordinates) addFeature({ type: 'Feature', properties: {}, geometry: parsed })
            }
            computeMeasurementsRef.current?.()
          } catch {}
          break
        }
      }
    }

    run()
  }, [command, unitSystem, textAnnotations, heightMeasurements])

  // Keyboard shortcuts
  useEffect(() => {
    const map = mapRef.current
    const draw = drawRef.current
    if (!map || !draw) return
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/selects
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const key = e.key.toLowerCase()
      if (key === 'v') useAppStore.getState().setMode('pan')
      else if (key === 'a') useAppStore.getState().setMode('polygon')
      else if (key === 'l') useAppStore.getState().setMode('line')
      else if (key === 'f') useAppStore.getState().setMode('freehand')
      else if (key === 't') useAppStore.getState().setMode('text')
      else if (key === 'h') useAppStore.getState().setMode('height')
      else if (key === 's') useAppStore.getState().setMode('stall')
      else if (key === 'g') useAppStore.getState().setMode('concrete')
      else if (key === 'c') useAppStore.getState().requestClear()
      else if (key === 'u') toggleUnits()
      else if (key === 'j') useAppStore.getState().requestCommand('export:json')
      else if (key === 'p') useAppStore.getState().requestCommand('export:png')
      else if (key === 'k') useAppStore.getState().requestCommand('export:csv')
      else if (key === 'q') useAppStore.getState().requestCommand('export:iif')
      else if (key === 'r') useAppStore.getState().requestCommand('draw:rectangle')
      else if (key === 'o') useAppStore.getState().requestCommand('draw:circle')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleUnits])

  const modals = (
    <>
      {!enabled && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg)', background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))', zIndex: 1000
        }}>
          <div className="glass" style={{ padding: 16, borderRadius: 12, maxWidth: 560 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Map disabled</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>
              Click Enable to initialize Mapbox. You can also add <code>?autoinit=1</code> to auto-run.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { setInitError(null); setEnabled(true) }}>Enable Map</button>
              <button className="btn" onClick={() => setEnabled(false)}>Keep Disabled</button>
            </div>
          </div>
        </div>
      )}
      {enabled && !hasToken && !skipInit && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg)', background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))', zIndex: 1000
        }}>
          <div className="glass" style={{ padding: 16, borderRadius: 12, maxWidth: 560 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Mapbox token required</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>
              Paste your public token below (saved to this browser), or set env <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="token-input" style={{ fontSize: 13 }}>Token</label>
              <input
                id="token-input"
                name="mapbox-token"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="pk.eyJ..."
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
              />
              <button
                className="btn"
                onClick={() => {
                  if (!tokenInput.trim()) return
                  try { localStorage.setItem('MAPBOX_TOKEN', tokenInput.trim()) } catch {}
                  setInitError(null)
                  setHasToken(true)
                  setTokenSource('localStorage')
                  setInitTick((n) => n + 1)
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
      {skipInit && (
        <div style={{ position: 'fixed', top: 8, left: 8, fontSize: 12, color: 'var(--muted)', zIndex: 1000 }}>
          Map init skipped via ?skipinit
        </div>
      )}
      {enabled && initError && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1000 }}>
          <div className="glass" style={{ padding: 14, borderRadius: 12, maxWidth: 560, pointerEvents: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Map initialization error</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{initError}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { setInitError(null); setInitTick((n) => n + 1) }}>Retry</button>
              <button className="btn" onClick={() => setEnabled(false)}>Disable</button>
            </div>
          </div>
        </div>
      )}
      {hasToken && tokenSource && (
        <div style={{ position: 'fixed', right: 8, top: 8, fontSize: 11, color: 'var(--muted)', zIndex: 1000 }}>
          token: {tokenSource}
        </div>
      )}
      {mapLoading && enabled && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 500 }}>
          <div className="glass" style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>Loading map...</div>
          </div>
        </div>
      )}
      {(streetViewPrompt || streetViewState) && (
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 900 }}>
          <div className="glass" style={{ padding: '8px 12px', fontSize: 12, textAlign: 'center', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span>{streetViewPrompt}</span>
            {streetViewState && (
              <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => streetViewCleanupRef.current?.()}>
                Exit Street
              </button>
            )}
          </div>
        </div>
      )}
      {/* Stall Tool Live Preview */}
      {mode === 'stall' && (
        <div style={{ position: 'fixed', bottom: 100, right: 16, zIndex: 900 }}>
          <div className="glass" style={{ padding: '12px 16px', borderRadius: 12, minWidth: 180 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--accent)' }}>
              Stall Tool (S)
            </div>
            {liveStallPreview ? (
              <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Row Length:</span>
                  <span>{liveStallPreview.rowLengthFt.toFixed(1)} ft</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Stalls:</span>
                  <span style={{ fontWeight: 600 }}>{liveStallPreview.stallCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Lineal Feet:</span>
                  <span>{liveStallPreview.linealFeet.toFixed(1)} lf</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                Click and drag to draw a stall row
              </div>
            )}
            {stallGroups.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--glass-border)', fontSize: 11 }}>
                <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Total: {stallGroups.length} row{stallGroups.length !== 1 ? 's' : ''}</div>
                <div>
                  {stallGroups.reduce((sum, g) => sum + g.stall_count, 0)} stalls |{' '}
                  {stallGroups.reduce((sum, g) => sum + g.lineal_feet, 0).toFixed(0)} lf
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Imagery Toggle */}
      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 900 }}>
        <div className="glass" style={{ padding: '6px 8px', borderRadius: 8, display: 'flex', gap: 4 }}>
          <button
            onClick={() => setImageryMode('mapbox')}
            disabled={imageryLoading}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 6,
              border: imageryMode === 'mapbox' ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
              background: imageryMode === 'mapbox' ? 'rgba(0,255,136,0.15)' : 'rgba(0,0,0,0.3)',
              color: imageryMode === 'mapbox' ? 'var(--accent)' : 'inherit',
              cursor: imageryLoading ? 'wait' : 'pointer',
              opacity: imageryLoading ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            Standard
          </button>
          <button
            onClick={() => setImageryMode('google')}
            disabled={imageryLoading}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 6,
              border: imageryMode === 'google' ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
              background: imageryMode === 'google' ? 'rgba(0,255,136,0.15)' : 'rgba(0,0,0,0.3)',
              color: imageryMode === 'google' ? 'var(--accent)' : 'inherit',
              cursor: imageryLoading ? 'wait' : 'pointer',
              opacity: imageryLoading ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            {imageryLoading ? 'Loading...' : 'High-Res'}
          </button>
        </div>
      </div>
      {/* Google Attribution Overlay */}
      {imageryMode === 'google' && googleAttribution && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, zIndex: 800 }}>
          <GoogleAttributionOverlay text={googleAttribution} />
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="map-container">
        <div ref={containerRef} className="map-canvas" />
      </div>
      {/* Blueprint Overlay Image - Interactive */}
      {blueprintOverlay?.imageUrl && (
        <div
          className="blueprint-overlay-container"
          style={{
            position: 'absolute',
            left: `calc(50% + ${overlayTransform.x}px)`,
            top: `calc(50% + ${overlayTransform.y}px)`,
            transform: `translate(-50%, -50%) rotate(${overlayTransform.rotation}deg)`,
            width: overlayTransform.width,
            height: overlayTransform.height,
            zIndex: 50,
            cursor: 'move',
          }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
            e.preventDefault();
            overlayDragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startTransformX: overlayTransform.x,
              startTransformY: overlayTransform.y,
            };
            const onMouseMove = (moveE: MouseEvent) => {
              const dragState = overlayDragRef.current;
              if (!dragState) return;
              const dx = moveE.clientX - dragState.startX;
              const dy = moveE.clientY - dragState.startY;
              setOverlayTransform((prev) => ({
                ...prev,
                x: dragState.startTransformX + dx,
                y: dragState.startTransformY + dy,
              }));
            };
            const onMouseUp = () => {
              overlayDragRef.current = null;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          <img
            src={blueprintOverlay.imageUrl}
            alt={`Blueprint page ${blueprintOverlay.pageNumber}`}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: blueprintOverlay.opacity ?? 0.7,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
              border: '2px solid rgba(59, 130, 246, 0.7)',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />
          {/* Resize handles */}
          {['nw', 'ne', 'sw', 'se'].map((corner) => (
            <div
              key={corner}
              className="resize-handle"
              style={{
                position: 'absolute',
                width: 16,
                height: 16,
                background: '#3b82f6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: `${corner}-resize`,
                ...(corner.includes('n') ? { top: -8 } : { bottom: -8 }),
                ...(corner.includes('w') ? { left: -8 } : { right: -8 }),
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                overlayResizeRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  startWidth: overlayTransform.width,
                  startHeight: overlayTransform.height,
                  corner,
                };
                const onMouseMove = (moveE: MouseEvent) => {
                  if (!overlayResizeRef.current) return;
                  const dx = moveE.clientX - overlayResizeRef.current.startX;
                  const dy = moveE.clientY - overlayResizeRef.current.startY;
                  const { corner: c, startWidth, startHeight } = overlayResizeRef.current;
                  let newWidth = startWidth;
                  let newHeight = startHeight;
                  let offsetX = 0;
                  let offsetY = 0;
                  if (c.includes('e')) newWidth = Math.max(100, startWidth + dx);
                  if (c.includes('w')) { newWidth = Math.max(100, startWidth - dx); offsetX = dx; }
                  if (c.includes('s')) newHeight = Math.max(100, startHeight + dy);
                  if (c.includes('n')) { newHeight = Math.max(100, startHeight - dy); offsetY = dy; }
                  setOverlayTransform((prev) => ({
                    ...prev,
                    width: newWidth,
                    height: newHeight,
                    x: prev.x + offsetX / 2,
                    y: prev.y + offsetY / 2,
                  }));
                };
                const onMouseUp = () => {
                  overlayResizeRef.current = null;
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            />
          ))}
          {/* Rotation handle */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 24,
              height: 24,
              background: '#3b82f6',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
            }}
            title="Drag to rotate"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
              const startRotation = overlayTransform.rotation;
              const onMouseMove = (moveE: MouseEvent) => {
                const currentAngle = Math.atan2(moveE.clientY - centerY, moveE.clientX - centerX) * (180 / Math.PI);
                const deltaAngle = currentAngle - startAngle;
                setOverlayTransform((prev) => ({
                  ...prev,
                  rotation: startRotation + deltaAngle,
                }));
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          >
            ↻
          </div>
          {/* Connection line to rotation handle */}
          <div
            style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 2,
              height: 20,
              background: 'rgba(59, 130, 246, 0.7)',
            }}
          />
        </div>
      )}
      {mounted && createPortal(modals, document.body)}
    </>
  )
}
