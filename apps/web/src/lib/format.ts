export function formatArea(m2: number, system: 'metric' | 'imperial') {
  if (system === 'imperial') {
    const ft2 = m2 * 10.76391041671
    if (ft2 >= 27878400) return (ft2 / 27878400).toFixed(2) + ' mi²'
    if (ft2 >= 43560) return (ft2 / 43560).toFixed(2) + ' ac'
    if (ft2 >= 1000) return (ft2 / 1000).toFixed(1) + 'k ft²'
    return ft2.toFixed(0) + ' ft²'
  }
  // metric
  if (m2 >= 1_000_000) return (m2 / 1_000_000).toFixed(2) + ' km²'
  if (m2 >= 10_000) return (m2 / 10_000).toFixed(2) + ' ha'
  if (m2 >= 1000) return (m2 / 1000).toFixed(1) + 'k m²'
  return m2.toFixed(0) + ' m²'
}

export function formatLength(m: number, system: 'metric' | 'imperial') {
  if (system === 'imperial') {
    const ft = m * 3.280839895
    if (ft >= 5280) return (ft / 5280).toFixed(2) + ' mi'
    if (ft >= 1000) return (ft / 1000).toFixed(1) + 'k ft'
    return ft.toFixed(0) + ' ft'
  }
  // metric
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km'
  if (m >= 100) return (m).toFixed(0) + ' m'
  return m.toFixed(1) + ' m'
}

