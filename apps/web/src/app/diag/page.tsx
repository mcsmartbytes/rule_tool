"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMounted } from '@/lib/useMounted'
import { useAppStore } from '@/lib/store'

export default function DiagPage() {
  const mounted = useMounted()
  const store = useAppStore()
  const [ua, setUa] = useState('')
  const [ts, setTs] = useState('')

  useEffect(() => {
    setUa(typeof navigator !== 'undefined' ? navigator.userAgent : 'no-navigator')
    setTs(new Date().toISOString())
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>Diagnostics</h1>
      <p>Mounted: {String(mounted)}</p>
      <p>UserAgent: {ua}</p>
      <p>Time: {ts}</p>
      <p>Env NODE_ENV: {process.env.NODE_ENV}</p>
      <h2>Store</h2>
      <pre style={{ background: '#111827', color: '#e5e7eb', padding: 12, borderRadius: 8 }}>
        {JSON.stringify({ unitSystem: store.unitSystem, mode: store.mode, styleId: store.styleId, smoothing: store.smoothing }, null, 2)}
      </pre>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={store.toggleUnits} style={{ padding: '6px 10px' }}>Toggle Units</button>
        <button onClick={() => store.setMode('pan')} style={{ padding: '6px 10px' }}>Set Mode: Pan</button>
      </div>
      <h2>Links</h2>
      <ul>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/health">/health</Link></li>
        <li><a href="/api/health" target="_blank" rel="noreferrer">/api/health</a></li>
      </ul>
      <p style={{ color: '#6b7280' }}>This page renders no map or heavy UI. If this page loads, hydration works and issues are isolated to the main page’s UI. If this page also errors, the issue is project/config level.</p>
    </div>
  )
}

