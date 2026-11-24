/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens that reference CSS variables
        'background': 'var(--bg-primary)',
        'surface': 'var(--bg-secondary)',
        'elevated': 'var(--bg-elevated)',
        'hover': 'var(--bg-hover)',
        'border': {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          active: 'var(--border-active)',
        },
        'foreground': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'muted': 'var(--text-muted)',
        'accent': {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
        },
        'amber': 'var(--amber)',
        'terracotta': 'var(--terracotta)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'error': 'var(--error)',
        'info': 'var(--info)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'sm': '0.375rem',
        DEFAULT: '0.5rem',
        'md': '0.625rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(36, 41, 35, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(36, 41, 35, 0.1), 0 1px 2px -1px rgba(36, 41, 35, 0.1)',
        'md': '0 4px 6px -1px rgba(36, 41, 35, 0.1), 0 2px 4px -2px rgba(36, 41, 35, 0.1)',
        'lg': '0 10px 15px -3px rgba(36, 41, 35, 0.1), 0 4px 6px -4px rgba(36, 41, 35, 0.1)',
        'xl': '0 20px 25px -5px rgba(36, 41, 35, 0.1), 0 8px 10px -6px rgba(36, 41, 35, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}