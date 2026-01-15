"use client"
import { useEffect } from 'react'
import { useAppStore, type MapStyleId, type UnitSystem } from '@/lib/store'

export default function PrefHydrator() {
  const setUnitSystem = useAppStore((s) => s.setUnitSystem)
  const setStyleId = useAppStore((s) => s.setStyleId)
  const setSmoothing = useAppStore((s) => s.setSmoothing)
  const setEnable3D = useAppStore((s) => s.setEnable3D)
  const setHydrated = useAppStore((s) => s.setHydrated)

  useEffect(() => {
    try {
      const us = (localStorage.getItem('UNIT_SYSTEM') as UnitSystem | null) || null
      if (us === 'metric' || us === 'imperial') setUnitSystem(us)
    } catch {}
    try {
      const st = (localStorage.getItem('MAP_STYLE') as MapStyleId | null) || null
      if (st) setStyleId(st)
    } catch {}
    try {
      const sm = Number(localStorage.getItem('SMOOTHING') || '')
      if (!Number.isNaN(sm) && sm >= 0 && sm <= 10) setSmoothing(sm)
    } catch {}
    try {
      const enable3d = localStorage.getItem('ENABLE_3D')
      if (enable3d === '0') setEnable3D(false)
      else if (enable3d === '1') setEnable3D(true)
    } catch {}
    try { setHydrated() } catch {}
  }, [setUnitSystem, setStyleId, setSmoothing, setEnable3D, setHydrated])

  return null
}
