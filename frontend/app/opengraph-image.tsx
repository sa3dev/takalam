import { readFileSync } from 'fs'
import { join } from 'path'
import { ImageResponse } from 'next/og'

// The card people see before they see the site: WhatsApp, iMessage, LinkedIn,
// Slack. Generated at build time rather than shipped as a PNG, so it stays
// editable as text and never drifts from the landing page it advertises.
export const alt = "Takalam — apprendre l'arabe par la voix, sans jugement"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Satori has no CSS variable support and does not parse oklch, so the palette of
// globals.css is restated here in hex. Same colours, converted once.
const CREAM = '#F9F2E9'
const TERRA = '#C45F38'
const TERRA_DEEP = '#8C3D22'
const TERRA_SOFT = '#F6D3BC'
const CLAY = '#5D2E1C'

function font(file: string) {
  return readFileSync(join(process.cwd(), 'app/fonts', file))
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          backgroundColor: TERRA_DEEP,
          backgroundImage: `radial-gradient(120% 140% at 50% 100%, ${TERRA} 0%, ${TERRA_DEEP} 60%, ${CLAY} 100%)`,
          fontFamily: 'Space Grotesk',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, backgroundColor: TERRA_SOFT }} />
          <div
            style={{
              fontSize: 26,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TERRA_SOFT,
            }}
          >
            Takalam
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 104, lineHeight: 1.02, color: CREAM }}>
            Osez parler.
          </div>
          <div style={{ display: 'flex', fontSize: 104, lineHeight: 1.02, color: TERRA_SOFT }}>
            Vraiment.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 26,
              fontFamily: 'Cairo',
              fontSize: 62,
              color: CREAM,
              opacity: 0.92,
            }}
          >
            تكلّم
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 30, color: CREAM, opacity: 0.82 }}>
            Apprendre l&apos;arabe par la voix, sans jugement.
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: TERRA_SOFT, opacity: 0.75 }}>
            takalamapp.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Space Grotesk', data: font('SpaceGrotesk-Bold.ttf'), weight: 700, style: 'normal' },
        // Cairo, not the site's Reem Kufi: Satori cannot yet apply GSUB
        // lookupType 5 (contextual substitution), which Reem Kufi — like Noto
        // Kufi and Amiri — needs to join Arabic letters, and the build dies on
        // it. Cairo shapes the word correctly with the lookups Satori does
        // support. The site itself still renders Reem Kufi in the browser.
        { name: 'Cairo', data: font('Cairo-SemiBold.ttf'), weight: 600, style: 'normal' },
      ],
    }
  )
}
