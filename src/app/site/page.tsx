'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MapView, { type MapCaptureResult } from '@/components/MapView';
import { ObjectPanel } from '@/components/panels/ObjectPanel';
import { TradePanel } from '@/components/panels/TradePanel';
import ObjectClassifier from '@/components/ObjectClassifier';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useSiteStore } from '@/lib/site/store';
import { useMounted } from '@/lib/useMounted';
import { readToken } from '@/lib/token';
import { useAppStore } from '@/lib/store';
import { useQuoteStore } from '@/lib/quote/store';
import { getDefaultTrades, getServices } from '@/lib/supabase';
import { AIDetectionButton } from '@/components/AIDetectionButton';
import { AIReviewPanel } from '@/components/AIReviewPanel';
import { BlueprintOverlayModal } from '@/components/BlueprintOverlayModal';
import type { AIDetectedFeature } from '@/lib/ai/types';

function SitePageInner() {
  const mounted = useMounted();
  const searchParams = useSearchParams();
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [siteAddress, setSiteAddress] = useState('');
  const lastAddressRef = useRef<string | null>(null);

  // AI Detection state
  const [aiFeatures, setAIFeatures] = useState<AIDetectedFeature[]>([]);
  const [highlightedAIFeatureId, setHighlightedAIFeatureId] = useState<string | null>(null);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const mapCaptureRef = useRef<(() => Promise<MapCaptureResult | null>) | null>(null);
  const [showBlueprintOverlayModal, setShowBlueprintOverlayModal] = useState(false);
  const [placingBlueprint, setPlacingBlueprint] = useState<null | { pageId: string; imageUrl: string; label: string }>(null);
  const [blueprintCorners, setBlueprintCorners] = useState<Array<[number, number]>>([]);
  const [blueprintOverlay, setBlueprintOverlay] = useState<null | { id: string; imageUrl: string; corners: Array<[number, number]> }>(null);

  const site = useSiteStore((s) => s.site);
  const setSite = useSiteStore((s) => s.setSite);
  const setTrades = useSiteStore((s) => s.setTrades);
  const setServices = useSiteStore((s) => s.setServices);
  const objects = useSiteStore((s) => s.objects);
  const selectedObjectId = useSiteStore((s) => s.selectedObjectId);
  const openClassifier = useSiteStore((s) => s.openClassifier);
  const addObject = useSiteStore((s) => s.addObject);

  // Get selected object for filtering AI detection
  const selectedObject = objects.find((obj) => obj.id === selectedObjectId);
  const selectedPolygon = selectedObject?.geometry?.type === 'Polygon' || selectedObject?.geometry?.type === 'MultiPolygon'
    ? selectedObject.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
    : null;

  const setStyleId = useAppStore((s) => s.setStyleId);

  // Use quote store for map focus (MapView listens to this)
  const requestMapFocus = useQuoteStore((s) => s.requestMapFocus);

  // Handle geometry creation from MapView - open classifier
  const handleGeometryCreate = useCallback((geometry: GeoJSON.Geometry, featureId: string) => {
    openClassifier(geometry);
  }, [openClassifier]);

  // AI Detection handlers
  const handleCaptureRequest = useCallback(async () => {
    if (!mapCaptureRef.current) return null;
    return await mapCaptureRef.current();
  }, []);

  const handleMapClick = useCallback((lng: number, lat: number) => {
    if (!placingBlueprint) return;
    setBlueprintCorners((prev) => {
      if (prev.length >= 4) return prev;
      const next = [...prev, [lng, lat] as [number, number]];
      if (next.length === 4) {
        setBlueprintOverlay({
          id: placingBlueprint.pageId,
          imageUrl: placingBlueprint.imageUrl,
          corners: next,
        });
        setPlacingBlueprint(null);
      }
      return next;
    });
  }, [placingBlueprint]);

  const cancelBlueprintPlacement = useCallback(() => {
    setPlacingBlueprint(null);
    setBlueprintCorners([]);
  }, []);

  const handleDetectionComplete = useCallback((features: AIDetectedFeature[]) => {
    setAIFeatures(features);
    if (features.length > 0) {
      setShowReviewPanel(true);
    }
  }, []);

  const handleApproveFeatures = useCallback((features: AIDetectedFeature[]) => {
    // Add approved features as site objects
    for (const feature of features) {
      addObject({
        site_id: site?.id || '',
        object_type: feature.type,
        sub_type: feature.subType || null,
        tags: [],
        geometry: feature.geometry,
        properties: {},
        source: 'ai-suggested',
        confidence: feature.confidence,
        label: feature.label || null,
        color: null,
      });
    }

    // Remove approved features from pending
    const approvedIds = new Set(features.map((f) => f.id));
    setAIFeatures((prev) => prev.filter((f) => !approvedIds.has(f.id)));
  }, [addObject, site?.id]);

  const handleRejectFeatures = useCallback((featureIds: string[]) => {
    const rejectedIds = new Set(featureIds);
    setAIFeatures((prev) => prev.filter((f) => !rejectedIds.has(f.id)));
  }, []);

  const handleCloseReviewPanel = useCallback(() => {
    setShowReviewPanel(false);
    setAIFeatures([]);
    setHighlightedAIFeatureId(null);
  }, []);

  // Handle address search
  const handleAddressSearch = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('address') as HTMLInputElement;
    if (input.value.trim()) {
      setSiteAddress(input.value.trim());
      // Also create/update the site
      setSite({
        id: site?.id || `site_${Date.now()}`,
        organization_id: null,
        created_by: null,
        name: input.value.trim(),
        address: input.value.trim(),
        city: null,
        state: null,
        zip: null,
        coordinates: null,
        bounds: null,
        settings: {
          defaultUnits: 'imperial',
          mobilizationShared: true,
          contingencyPercent: 5,
        },
        status: 'draft',
        created_at: site?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [site, setSite]);

  // Initialize with satellite style
  useEffect(() => {
    setStyleId('mapbox://styles/mapbox/satellite-streets-v12');
  }, [setStyleId]);

  // Load trades and services from Supabase
  useEffect(() => {
    if (!mounted) return;

    async function loadData() {
      try {
        const [trades, services] = await Promise.all([
          getDefaultTrades(),
          getServices(),
        ]);
        setTrades(trades);
        setServices(services);
      } catch (err) {
        console.error('Failed to load trades/services:', err);
      }
    }

    loadData();
  }, [mounted, setTrades, setServices]);

  // Handle address from URL or create new site
  useEffect(() => {
    if (!mounted) return;

    const addressParam = searchParams?.get('address');
    if (addressParam) {
      setSiteAddress(addressParam);
      if (!site) {
        setSite({
          id: `site_${Date.now()}`,
          organization_id: null,
          created_by: null,
          name: addressParam,
          address: addressParam,
          city: null,
          state: null,
          zip: null,
          coordinates: null,
          bounds: null,
          settings: {
            defaultUnits: 'imperial',
            mobilizationShared: true,
            contingencyPercent: 5,
          },
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }, [mounted, searchParams, site, setSite]);

  // Geocode address and focus map
  useEffect(() => {
    if (!siteAddress || lastAddressRef.current === siteAddress) return;

    let cancelled = false;

    async function geocode() {
      const { token } = readToken();
      if (!token) {
        setGeocodeStatus('error');
        setGeocodeMessage('Add a Mapbox token to locate the site');
        return;
      }

      setGeocodeStatus('loading');
      setGeocodeMessage('Locating site...');

      try {
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(siteAddress)}.json?limit=1&access_token=${token}`
        );
        const data = await resp.json();

        if (cancelled) return;

        const feature = data?.features?.[0];
        if (feature?.center?.length >= 2) {
          const [lng, lat] = feature.center;
          requestMapFocus({ lng, lat, zoom: 19, address: feature.place_name || siteAddress });
          lastAddressRef.current = siteAddress;
          setGeocodeStatus('success');
          setGeocodeMessage(feature.place_name || siteAddress);
        } else {
          setGeocodeStatus('error');
          setGeocodeMessage('Could not find that address');
        }
      } catch {
        if (!cancelled) {
          setGeocodeStatus('error');
          setGeocodeMessage('Address lookup failed');
        }
      }
    }

    geocode();
    return () => { cancelled = true; };
  }, [siteAddress, requestMapFocus]);

  if (!mounted) {
    return <div className="site-loading">Loading...</div>;
  }

  return (
    <div className="site-layout">
      {/* Header */}
      <header className="site-header">
        <div className="site-header-left">
          <h1 className="site-title">Rule Tool</h1>
          <form onSubmit={handleAddressSearch} style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
            <input
              type="text"
              name="address"
              placeholder="Enter address to locate..."
              defaultValue={siteAddress}
              style={{
                padding: '6px 12px',
                border: '1px solid #4b5563',
                borderRadius: '6px',
                backgroundColor: '#374151',
                color: 'white',
                fontSize: '14px',
                width: '280px',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '6px 12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Search
            </button>
          </form>
          {geocodeStatus === 'loading' && (
            <span style={{ marginLeft: '12px', color: '#9ca3af', fontSize: '14px' }}>Locating...</span>
          )}
          {geocodeStatus === 'error' && (
            <span style={{ marginLeft: '12px', color: '#ef4444', fontSize: '14px' }}>{geocodeMessage}</span>
          )}
        </div>
        <div className="site-header-right">
          <Link href="/dashboard" className="btn btn-secondary btn-sm">Dashboard</Link>
          <Link href="/blueprint" className="btn btn-secondary btn-sm">Blueprints</Link>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowBlueprintOverlayModal(true)}
            title="Select a blueprint page and place it on the map"
          >
            Blueprint Overlay
          </button>
          {blueprintOverlay && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setBlueprintOverlay(null)}
              title="Remove blueprint overlay"
            >
              Clear Overlay
            </button>
          )}
          <AIDetectionButton
            onCaptureRequest={handleCaptureRequest}
            onDetectionComplete={handleDetectionComplete}
            selectionPolygon={selectedPolygon}
            filterToSelection={!!selectedPolygon}
          />
          <span className="object-count-badge">{objects.length} objects</span>
          <button className="btn btn-primary btn-sm">Save Site</button>
        </div>
      </header>

      {/* Main content - 3 panels */}
      <div className="site-content">
        {/* Left Panel - Objects */}
        <aside className="site-panel site-panel-left">
          <ErrorBoundary label="ObjectPanel">
            <ObjectPanel />
          </ErrorBoundary>
        </aside>

        {/* Center - Map */}
        <main className="site-map">
          <ErrorBoundary label="MapView">
            <MapView
              onGeometryCreate={handleGeometryCreate}
              aiFeatures={aiFeatures}
              highlightedAIFeatureId={highlightedAIFeatureId}
              captureRef={mapCaptureRef}
              onMapClick={placingBlueprint ? handleMapClick : undefined}
              blueprintOverlay={blueprintOverlay ? { ...blueprintOverlay, opacity: 0.6 } : null}
            />
          </ErrorBoundary>

          {placingBlueprint && (
            <div className="map-hint" style={{ top: 12, left: 12, right: 'auto', background: 'rgba(17,24,39,0.9)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Placing: {placingBlueprint.label}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                Click 4 corners on the map: <strong>top-left → top-right → bottom-right → bottom-left</strong>
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Corner {Math.min(blueprintCorners.length + 1, 4)} / 4
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setBlueprintCorners([])}>Restart</button>
                <button className="btn btn-secondary btn-sm" onClick={cancelBlueprintPlacement}>Cancel</button>
              </div>
            </div>
          )}

          {/* Drawing toolbar hint */}
          <div className="map-hint">
            Press <kbd>A</kbd> for polygon, <kbd>L</kbd> for line, <kbd>V</kbd> to select
          </div>

          {/* AI Review Panel */}
          {showReviewPanel && aiFeatures.length > 0 && (
            <AIReviewPanel
              features={aiFeatures}
              onApprove={handleApproveFeatures}
              onReject={handleRejectFeatures}
              onClose={handleCloseReviewPanel}
              onHover={setHighlightedAIFeatureId}
            />
          )}
        </main>

        {/* Right Panel - Estimates */}
        <aside className="site-panel site-panel-right">
          <ErrorBoundary label="TradePanel">
            <TradePanel />
          </ErrorBoundary>
        </aside>
      </div>

      {/* Object Classifier Modal */}
      <ObjectClassifier />

      <BlueprintOverlayModal
        open={showBlueprintOverlayModal}
        onClose={() => setShowBlueprintOverlayModal(false)}
        onSelectPage={(page) => {
          setBlueprintCorners([]);
          setBlueprintOverlay(null);
          setPlacingBlueprint(page);
        }}
      />
    </div>
  );
}

export default function SitePage() {
  return (
    <Suspense fallback={<div className="site-loading">Loading site...</div>}>
      <SitePageInner />
    </Suspense>
  );
}
