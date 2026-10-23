// Small flat illustrations, one per situation, drawn in the app's own palette so
// they read at a glance and follow the theme. They are meant to be understood
// before the label is read: a plate under a dome, a car with a roof sign.

const SOFT = 'var(--terra-soft)'
const TERRA = 'var(--terra)'
const DEEP = 'var(--terra-deep)'
const CLAY = 'var(--clay)'
const CREAM = 'var(--cream)'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 80" role="img" aria-hidden="true" className="w-full h-full">
      <rect width="120" height="80" fill={SOFT} />
      {children}
    </svg>
  )
}

const art: Record<string, () => React.ReactElement> = {
  // A plate under a serving dome, steam rising, cutlery either side.
  restaurant: () => (
    <Frame>
      <rect x="0" y="58" width="120" height="22" fill={CLAY} />
      <path d="M32 56 a28 28 0 0 1 56 0 Z" fill={CREAM} />
      <rect x="28" y="54" width="64" height="5" rx="2.5" fill={DEEP} />
      <circle cx="60" cy="25" r="3.5" fill={DEEP} />
      <path d="M52 16 q-4 -6 0 -10 M60 14 q-4 -6 0 -10 M68 16 q-4 -6 0 -10" stroke={CREAM} strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="12" y="38" width="3" height="20" rx="1.5" fill={CREAM} />
      <path d="M104 38 v20" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
      <path d="M99 38 v7 M104 38 v7 M109 38 v7" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
    </Frame>
  ),
  // A car in profile with the lit sign on its roof.
  taxi: () => (
    <Frame>
      <rect x="0" y="60" width="120" height="20" fill={CLAY} />
      <rect x="44" y="20" width="32" height="9" rx="2" fill={CREAM} />
      <rect x="48" y="23" width="24" height="3" rx="1.5" fill={DEEP} />
      <path d="M18 56 v-9 q0 -4 5 -5 l14 -3 q4 -9 9 -9 h26 q6 0 9 8 l11 4 q5 1 5 5 v9 Z" fill={TERRA} />
      <path d="M44 36 h14 v-8 h-9 Z M62 36 h18 q-3 -8 -8 -8 h-10 Z" fill={CREAM} />
      <circle cx="38" cy="58" r="8" fill={CLAY} />
      <circle cx="38" cy="58" r="3.5" fill={CREAM} />
      <circle cx="86" cy="58" r="8" fill={CLAY} />
      <circle cx="86" cy="58" r="3.5" fill={CREAM} />
    </Frame>
  ),
  // Two people meeting, one speech bubble between them.
  introduce: () => (
    <Frame>
      <rect x="0" y="62" width="120" height="18" fill={CLAY} />
      <circle cx="34" cy="38" r="10" fill={CREAM} />
      <path d="M16 66 q0 -17 18 -17 q18 0 18 17 Z" fill={TERRA} />
      <circle cx="88" cy="38" r="10" fill={CREAM} />
      <path d="M70 66 q0 -17 18 -17 q18 0 18 17 Z" fill={DEEP} />
      <path d="M44 10 h32 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 h-18 l-8 7 v-7 h-6 a6 6 0 0 1 -6 -6 v-10 a6 6 0 0 1 6 -6 Z" fill={CREAM} />
      <circle cx="52" cy="21" r="2.5" fill={TERRA} />
      <circle cx="60" cy="21" r="2.5" fill={TERRA} />
      <circle cx="68" cy="21" r="2.5" fill={TERRA} />
    </Frame>
  ),
  // A hotel front with lit windows and a reception bell on the desk.
  hotel: () => (
    <Frame>
      <rect x="0" y="62" width="120" height="18" fill={CLAY} />
      <rect x="22" y="12" width="52" height="50" rx="3" fill={TERRA} />
      <g fill={CREAM}>
        <rect x="30" y="20" width="9" height="9" rx="1.5" /><rect x="46" y="20" width="9" height="9" rx="1.5" /><rect x="62" y="20" width="7" height="9" rx="1.5" />
        <rect x="30" y="36" width="9" height="9" rx="1.5" /><rect x="46" y="36" width="9" height="9" rx="1.5" /><rect x="62" y="36" width="7" height="9" rx="1.5" />
      </g>
      <rect x="42" y="48" width="14" height="14" rx="2" fill={DEEP} />
      <path d="M82 62 a14 14 0 0 1 28 0 Z" fill={CREAM} />
      <rect x="78" y="60" width="36" height="5" rx="2.5" fill={DEEP} />
      <circle cx="96" cy="44" r="3" fill={CREAM} />
    </Frame>
  ),
  // A stall with a striped awning and crates of fruit.
  market: () => (
    <Frame>
      <rect x="0" y="62" width="120" height="18" fill={CLAY} />
      <path d="M14 14 h92 l8 18 H6 Z" fill={CREAM} />
      <path d="M26 14 l-4 18 M50 14 l-2 18 M74 14 l2 18 M98 14 l4 18" stroke={TERRA} strokeWidth="9" />
      <rect x="18" y="32" width="3" height="30" fill={DEEP} />
      <rect x="99" y="32" width="3" height="30" fill={DEEP} />
      <rect x="24" y="48" width="72" height="16" rx="3" fill={DEEP} />
      <g fill={TERRA}>
        <circle cx="36" cy="46" r="6" /><circle cx="50" cy="46" r="6" /><circle cx="64" cy="46" r="6" />
      </g>
      <g fill={CREAM}>
        <circle cx="78" cy="46" r="6" /><circle cx="90" cy="47" r="5" />
      </g>
    </Frame>
  ),
  // A table with a teapot and cups, three heads around it: a family meal.
  family: () => (
    <Frame>
      <rect x="0" y="62" width="120" height="18" fill={CLAY} />
      <circle cx="26" cy="30" r="8" fill={CREAM} /><path d="M12 52 q0 -14 14 -14 q14 0 14 14 Z" fill={TERRA} />
      <circle cx="60" cy="26" r="8" fill={CREAM} /><path d="M46 48 q0 -14 14 -14 q14 0 14 14 Z" fill={DEEP} />
      <circle cx="94" cy="30" r="8" fill={CREAM} /><path d="M80 52 q0 -14 14 -14 q14 0 14 14 Z" fill={TERRA} />
      <rect x="8" y="52" width="104" height="6" rx="3" fill={CREAM} />
      <rect x="14" y="58" width="4" height="12" fill={DEEP} /><rect x="102" y="58" width="4" height="12" fill={DEEP} />
      <path d="M50 52 a10 10 0 0 1 20 0 Z" fill={CLAY} />
      <rect x="57" y="39" width="6" height="3" rx="1.5" fill={CLAY} />
      <path d="M70 46 q8 0 8 6" stroke={CLAY} strokeWidth="2" fill="none" />
      <rect x="28" y="46" width="8" height="6" rx="2" fill={DEEP} /><rect x="84" y="46" width="8" height="6" rx="2" fill={DEEP} />
    </Frame>
  ),
}

export function ScenarioArt({ id }: { id: string }) {
  const draw = art[id]
  return draw ? draw() : null
}
