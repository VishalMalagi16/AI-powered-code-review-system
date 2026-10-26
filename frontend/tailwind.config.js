/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-main)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          hover: 'var(--bg-surface-hover)',
          active: 'var(--bg-surface-active)',
          border: 'var(--border-subtle)',
        },
        card: {
          DEFAULT: 'var(--bg-card)',
          border: 'var(--border-card)',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          accent: '#06b6d4', // cyan accent
        },
        severity: {
          critical: {
            bg: 'rgba(239, 68, 68, 0.12)',
            text: '#f87171',
            border: 'rgba(239, 68, 68, 0.35)',
            dot: '#ef4444',
          },
          high: {
            bg: 'rgba(249, 115, 22, 0.12)',
            text: '#fb923c',
            border: 'rgba(249, 115, 22, 0.35)',
            dot: '#f97316',
          },
          medium: {
            bg: 'rgba(234, 179, 8, 0.12)',
            text: '#facc15',
            border: 'rgba(234, 179, 8, 0.35)',
            dot: '#eab308',
          },
          low: {
            bg: 'rgba(59, 130, 246, 0.12)',
            text: '#60a5fa',
            border: 'rgba(59, 130, 246, 0.35)',
            dot: '#3b82f6',
          },
          informational: {
            bg: 'rgba(148, 163, 184, 0.12)',
            text: '#94a3b8',
            border: 'rgba(148, 163, 184, 0.3)',
            dot: '#64748b',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'glow-cyan': '0 0 15px rgba(6, 182, 212, 0.25)',
      },
    },
  },
  plugins: [],
}
