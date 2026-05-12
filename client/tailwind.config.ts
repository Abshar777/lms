import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        sans:    ['DM Sans', 'sans-serif'],
      },
      colors: {
        primary:   { DEFAULT: '#FF6B1A', hover: '#E55A0E', light: '#FFF0E8' },
        secondary: { DEFAULT: '#2F6BFF', hover: '#1A53E0', light: '#EEF3FF' },
        success:   { DEFAULT: '#0ECC8E', light: '#E6FAF4' },
        warning:   { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        danger:    { DEFAULT: '#EF4444', light: '#FEE2E2' },
        content: {
          primary:   '#0D0F1A',
          secondary: '#4B5563',
          muted:     '#9CA3AF',
        },
      },
      borderRadius: {
        xs: '4px', sm: '6px', md: '10px',
        lg: '14px', xl: '20px', '2xl': '28px',
      },
      animation: {
        'fade-up':    'fade-up 0.3s ease forwards',
        'scale-in':   'scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        'fade-up':  { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' },      to: { opacity: '1', transform: 'scale(1)' } },
        'shimmer':  { from: { backgroundPosition: '-200% 0' },                to:  { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
}

export default config
