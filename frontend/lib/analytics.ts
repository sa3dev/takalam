// Umami expose window.umami une fois le tracker chargé. Absent en dev local, derrière un
// adblocker ou avant le chargement : suivre un événement ne doit jamais casser la page.
declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | number>) => void }
  }
}

/** A duration in coarse buckets: enough to see a distribution in an event's
 *  properties without making every value its own row. */
export function durationBucket(seconds: number): string {
  if (seconds < 120) return '<2min'
  if (seconds < 300) return '2-5min'
  if (seconds < 600) return '5-10min'
  return '10min+'
}

export function track(event: string, data?: Record<string, string | number>) {
  try {
    window.umami?.track(event, data)
  } catch {
    // l'analytics est un confort, pas une dépendance
  }
}
