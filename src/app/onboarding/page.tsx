"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { industryOptions } from '@/lib/quote/industries'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)

    // Check for industry in URL params first (for embedded mode)
    const urlIndustry = searchParams?.get('industry')
    if (urlIndustry) {
      const isValid = industryOptions.some(opt => opt.id === urlIndustry)
      if (isValid) {
        try { localStorage.setItem('QUOTE_INDUSTRY', urlIndustry) } catch {}
        // Preserve other URL params when redirecting
        const address = searchParams?.get('address')
        const embedded = searchParams?.get('embedded')
        let redirectUrl = '/quote/new'
        const params = new URLSearchParams()
        if (address) params.set('address', address)
        if (embedded) params.set('embedded', embedded)
        if (params.toString()) redirectUrl += `?${params.toString()}`
        router.replace(redirectUrl)
        return
      }
    }

    try {
      const stored = localStorage.getItem('QUOTE_INDUSTRY')
      // Only skip onboarding if stored industry is valid
      if (stored) {
        const isValid = industryOptions.some(opt => opt.id === stored)
        if (isValid) {
          router.replace('/quote/new')
        } else {
          // Invalid/old industry ID - clear it and stay on onboarding
          localStorage.removeItem('QUOTE_INDUSTRY')
        }
      }
    } catch {}
  }, [router, searchParams])

  const handleSelect = (industryId: string) => {
    try { localStorage.setItem('QUOTE_INDUSTRY', industryId) } catch {}
    router.push('/quote/new')
  }

  if (!isHydrated) {
    return <div className="quote-layout-loading">Loading…</div>
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="quote-entry-label">Welcome to Area Bid Helper</div>
        <h1>Choose your industry</h1>
        <p className="onboarding-subtitle">We'll preload the tools, services, and rates for your trade. You can change this anytime.</p>
        <div className="industry-grid">
          {industryOptions.map((industry) => {
            const colors = industry.fullConfig.branding
            return (
              <button
                key={industry.id}
                className="industry-card"
                onClick={() => handleSelect(industry.id)}
                style={{
                  '--industry-primary': colors.primaryColor,
                  '--industry-accent': colors.accentColor,
                  borderColor: colors.primaryColor,
                  background: `linear-gradient(135deg, ${colors.primaryColor}15 0%, ${colors.accentColor}10 100%)`,
                } as React.CSSProperties}
              >
                <div
                  className="industry-card-badge"
                  style={{
                    background: colors.primaryColor,
                    color: '#fff',
                  }}
                >
                  {industry.fullConfig.services.length} services
                </div>
                <div className="industry-card-title" style={{ color: colors.primaryColor }}>
                  {industry.name}
                </div>
                <div className="industry-card-hero">{industry.hero}</div>
                <div className="industry-card-services">
                  {industry.fullConfig.services.slice(0, 4).map(s => s.name).join(' · ')}
                  {industry.fullConfig.services.length > 4 && ' ...'}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="quote-layout-loading">Loading…</div>}>
      <OnboardingContent />
    </Suspense>
  )
}
