'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import MapView from '@/components/MapView';
import { ObjectPanel } from '@/components/panels/ObjectPanel';
import { TradePanel } from '@/components/panels/TradePanel';
import ObjectClassifier from '@/components/ObjectClassifier';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useSiteStore } from '@/lib/site/store';
import { useMounted } from '@/lib/useMounted';
import { readToken } from '@/lib/token';
import { useAppStore } from '@/lib/store';
import { getDefaultTrades, getServices } from '@/lib/supabase';

function SitePageInner() {
  const mounted = useMounted();
  const searchParams = useSearchParams();
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [siteAddress, setSiteAddress] = useState('');
  const lastAddressRef = useRef<string | null>(null);

  const site = useSiteStore((s) => s.site);
  const setSite = useSiteStore((s) => s.setSite);
  const setTrades = useSiteStore((s) => s.setTrades);
  const setServices = useSiteStore((s) => s.setServices);
  const objects = useSiteStore((s) => s.objects);

  const setStyleId = useAppStore((s) => s.setStyleId);
  const requestMapFocus = useAppStore((s) => s.requestMapFocus);

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
          requestMapFocus({ lng, lat, zoom: 19 });
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
          {siteAddress && (
            <span className="site-address" title={geocodeMessage || siteAddress}>
              {geocodeStatus === 'loading' ? 'Locating...' : siteAddress}
            </span>
          )}
        </div>
        <div className="site-header-right">
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
            <MapView />
          </ErrorBoundary>

          {/* Drawing toolbar hint */}
          <div className="map-hint">
            Press <kbd>A</kbd> for polygon, <kbd>L</kbd> for line, <kbd>V</kbd> to select
          </div>
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
