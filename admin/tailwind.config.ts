import type { Config } from 'tailwindcss'
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
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body:    ['Plus Jakarta Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        sans:    ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        sidebar: '#0D0F1A',
        'sidebar-hover': '#151826',
        'sidebar-active': '#1E2235',
        primary:   { DEFAULT: '#0057b8', hover: '#003d80', light: '#EEF5FF', muted: 'rgba(0,87,184,0.12)' },
        secondary: { DEFAULT: '#2F6BFF', hover: '#1A53E0', light: '#EEF3FF', muted: 'rgba(47,107,255,0.12)' },
        success:   { DEFAULT: '#0ECC8E', light: '#E6FAF4' },
        warning:   { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        danger:    { DEFAULT: '#EF4444', light: '#FEE2E2' },
        surface:   '#FFFFFF',
        page:      '#F4F5F8',
        border:    '#E4E7ED',
        'border-strong': '#CDD0DA',
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
      boxShadow: {
        card:      '0 2px 8px rgba(13,15,26,0.06)',
        'card-hover': '0 4px 20px rgba(13,15,26,0.10)',
        primary:   '0 4px 20px rgba(0,87,184,0.30)',
        secondary: '0 4px 20px rgba(47,107,255,0.24)',
        modal:     '0 20px 60px rgba(13,15,26,0.18)',
      },
      keyframes: {
        'fade-up':  { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'shimmer':  { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-up':  'fade-up 0.3s ease forwards',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'shimmer':  'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [tailwindAnimate, scrollbarHide],
}
export default config
