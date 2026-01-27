"use client"
import { useQuoteStore } from "@/lib/quote/store"

export function ModeToggle() {
  const mode = useQuoteStore(s => s.mode)
  const setMode = useQuoteStore(s => s.setMode)

  return (
    <div className="mode-toggle">
      <button
        onClick={() => setMode("MAP")}
        className={`mode-toggle-btn ${mode === "MAP" ? "active" : ""}`}
      >
        <span className="mode-icon">🗺</span>
        <span className="mode-label">Map</span>
      </button>
      <button
        onClick={() => setMode("PHOTO")}
        className={`mode-toggle-btn ${mode === "PHOTO" ? "active" : ""}`}
      >
        <span className="mode-icon">📷</span>
        <span className="mode-label">Photo</span>
      </button>
    </div>
  )
}
