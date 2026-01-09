"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuoteStore } from "@/lib/quote/store"
import { industryOptions } from "@/lib/quote/industries"

export default function NewQuotePage() {
  const router = useRouter()
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [industryId, setIndustryId] = useState<string | null>(null)
  const setQuoteAddress = useQuoteStore((s) => s.setQuoteAddress)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('QUOTE_INDUSTRY')
      if (!stored) {
        router.replace('/onboarding')
        return
      }
      setIndustryId(stored)
    } catch {}
  }, [router])

  const industry = industryOptions.find((option) => option.id === industryId)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = address.trim()
    if (!value) {
      setError("Enter a job address to start a quote")
      return
    }
    setError(null)
    setIsSubmitting(true)
    setQuoteAddress(value)
    const params = new URLSearchParams({ address: value })
    router.push(`/quote/map?${params.toString()}`)
  }

  return (
    <div className="quote-entry">
      <div className="quote-entry-card">
        <div className="quote-entry-label">Instant Quote (Map)</div>
        <h1>Create Quote</h1>
        <p>Start every bid by locking in the job address. Nothing else.</p>
        {industry && (
          <div className="quote-entry-industry">
            <span>Industry:</span>
            <strong>{industry.name}</strong>
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                localStorage.removeItem('QUOTE_INDUSTRY')
                router.replace('/onboarding')
              }}
            >
              change
            </button>
          </div>
        )}
        <form className="quote-entry-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="job-address">Job address</label>
          <input
            id="job-address"
            type="text"
            placeholder="123 Main St, Austin TX"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting}
            className={error ? "input-error" : undefined}
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Loading map…" : "Start Quote"}
          </button>
        </form>
      </div>
    </div>
  )
}
