/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Terracotta palette — maps to CSS vars defined in globals.css
        terra: {
          DEFAULT: 'var(--terra)',
          deep:    'var(--terra-deep)',
          soft:    'var(--terra-soft)',
        },
        clay: {
          DEFAULT: 'var(--clay)',
          d:       'var(--clay-d)',
        },
        cream: {
          DEFAULT: 'var(--cream)',
          '2':     'var(--cream-2)',
        },
        card:  'var(--card)',
        ink:   'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line:  'var(--line)',

        // Legacy class names — auto-updated to terracotta palette
        calm: {
          bg:      'var(--cream)',
          surface: 'var(--card)',
          border:  'var(--line)',
          text:    'var(--ink)',
          muted:   'var(--muted)',
        },
        primary: {
          50:  'var(--terra-soft)',
          100: 'var(--terra-soft)',
          400: 'var(--terra)',
          500: 'var(--terra)',
          600: 'var(--terra-deep)',
          700: 'var(--clay)',
          900: 'var(--clay-d)',
        },
      },
      fontFamily: {
        sans:    ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        arabic:  ['"Reem Kufi"', 'Arial', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
