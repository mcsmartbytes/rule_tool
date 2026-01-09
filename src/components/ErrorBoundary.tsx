"use client"
import React from 'react'

type Props = { label: string; children: React.ReactNode; fallback?: React.ReactNode }
type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="glass" style={{ padding: 12, borderRadius: 12 }}>
          <div style={{ fontWeight: 600 }}>Component failed: {this.props.label}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>See console for details.</div>
        </div>
      )
    }
    return this.props.children
  }
}

