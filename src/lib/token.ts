export type TokenSource = 'env' | 'window' | 'url' | 'localStorage'

export function readToken(): { token?: string; source?: TokenSource } {
  // Build-time env (exposed by Next.js for NEXT_PUBLIC_*)
  const envPublic = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (envPublic) return { token: envPublic, source: 'env' }
  // Some setups use MAPBOX_TOKEN (non-public). Next will still inline it if defined at build.
  const envAny = (process.env as any).MAPBOX_TOKEN as string | undefined
  if (envAny) return { token: envAny, source: 'env' }

  if (typeof window !== 'undefined') {
    // Global window token for legacy integrations
    const winAny = (window as any).MAPBOX_TOKEN as string | undefined
    if (winAny) return { token: winAny, source: 'window' }

    // URL param ?token=xxx (also persist to localStorage)
    try {
      const url = new URL(window.location.href)
      const t = url.searchParams.get('token') || undefined
      if (t) {
        try { localStorage.setItem('MAPBOX_TOKEN', t) } catch {}
        return { token: t, source: 'url' }
      }
    } catch {}

    // Local storage fallback
    try {
      const ls = localStorage.getItem('MAPBOX_TOKEN') || undefined
      if (ls) return { token: ls, source: 'localStorage' }
    } catch {}
  }
  return {}
}

