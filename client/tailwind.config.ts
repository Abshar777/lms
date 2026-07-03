import type { Config } from 'tailwindcss'
import forms          from '@tailwindcss/forms'
import tailwindAnimate from 'tailwindcss-animate'
import plugin from 'tailwindcss/plugin'

const scrollbarHide = plugin(({ addUtilities }) => {
  addUtilities({
    '.scrollbar-none': {
      'scrollbar-width': 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    },
  })
})

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
        primary:   { DEFAULT: '#0057b8', hover: '#003d80', light: '#EEF5FF' },
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
        lg: '14px', xl: '14px', '2xl': '14px', full: '14px',
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
  plugins: [forms, tailwindAnimate, scrollbarHide],
}

export default config
