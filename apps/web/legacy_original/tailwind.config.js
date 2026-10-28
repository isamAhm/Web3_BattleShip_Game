/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: '#060a12',
          surface: '#0d1527',
          panel: '#121e36',
          card: '#162442',
          border: '#1e3258',
          borderHover: '#2d4b82',
          cyan: '#06b6d4',
          cyanBright: '#22d3ee',
          violet: '#6366f1',
          violetBright: '#818cf8',
          amber: '#f59e0b',
          amberBright: '#fbbf24',
          red: '#ef4444',
          redBright: '#f87171',
          textMuted: '#94a3b8',
          textSub: '#cbd5e1',
          textMain: '#f8fafc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern':
          'radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.08) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
