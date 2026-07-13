/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bbdffa',
          300: '#7cc2f7',
          400: '#36a2f1',
          500: '#0c85e4',
          600: '#0267c1',
          700: '#03529d',
          800: '#074681',
          900: '#0c3b6c',
          950: '#082548',
        },
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Violet
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        risk: {
          excellent: '#10b981', // emerald-500 (Green)
          good: '#eab308',      // yellow-500 (Yellow)
          'needs-improvement': '#f97316', // orange-500 (Orange)
          critical: '#ef4444',  // red-500 (Red)
        }
      },
      fontSize: {
        'heading-xs': ['0.75rem', { lineHeight: '1rem', fontWeight: '700' }],
        'heading-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '700' }],
        'heading-md': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '700' }],
        'heading-lg': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'heading-xl': ['2rem', { lineHeight: '2.5rem', fontWeight: '800' }],
        'body-xs': ['0.75rem', { lineHeight: '1rem' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'body-md': ['1rem', { lineHeight: '1.5rem' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
      }
    },
  },
  plugins: [],
}
