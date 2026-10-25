import { useEffect, useState } from 'react'

export interface ScenarioInfo {
  id: string
  level: 'beginner' | 'intermediate'
}

/** The situations on offer, in display order. Empty until the list arrives, and
 *  when it cannot: free conversation never depends on it. */
export function useScenarios(): ScenarioInfo[] {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/scenarios', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : []))
      .then((data: ScenarioInfo[]) => { if (!cancelled) setScenarios(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return scenarios
}
