// Umami expose window.umami une fois le tracker chargé. Absent en dev local, derrière un
// adblocker ou avant le chargement : suivre un événement ne doit jamais casser la page.
declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | number>) => void }
  }
}

export function track(event: string, data?: Record<string, string | number>) {
  try {
    window.umami?.track(event, data)
  } catch {
    // l'analytics est un confort, pas une dépendance
  }
}
