/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1e1e2e',
          50: '#f5f5f7',
          100: '#e4e4e9',
          200: '#c8c8d3',
          300: '#a3a3b5',
          400: '#7e7e96',
          500: '#63637a',
          600: '#4e4e62',
          700: '#3b3b50',
          800: '#2a2a3c',
          900: '#1e1e2e',
          950: '#141420'
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#5b21b6'
        },
        status: {
          idle: '#6b7280',
          starting: '#f59e0b',
          running: '#10b981',
          stopping: '#f59e0b',
          stopped: '#6b7280',
          error: '#ef4444',
          crashed: '#dc2626'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace']
      }
    }
  },
  plugins: []
}
