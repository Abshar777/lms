import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      /* ─── Fonts ─────────────────────────────── */
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        sans:    ['DM Sans', 'sans-serif'],
      },

      /* ─── Colors ─────────────────────────────── */
      colors: {
        bg: {
          page:     'var(--color-bg-page)',
          surface:  'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          muted:    'var(--color-bg-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover:   'var(--color-primary-hover)',
          light:   'var(--color-primary-light)',
          muted:   'var(--color-primary-muted)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover:   'var(--color-secondary-hover)',
          light:   'var(--color-secondary-light)',
          muted:   'var(--color-secondary-muted)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          light:   'var(--color-success-light)',
          muted:   'var(--color-success-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light:   'var(--color-warning-light)',
          muted:   'var(--color-warning-muted)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          light:   'var(--color-danger-light)',
          muted:   'var(--color-danger-muted)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light:   'var(--color-info-light)',
        },
        content: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted:     'var(--color-text-muted)',
          disabled:  'var(--color-text-disabled)',
          inverse:   'var(--color-text-inverse)',
          link:      'var(--color-text-link)',
        },
        chart: {
          primary:   'var(--chart-primary)',
          secondary: 'var(--chart-secondary)',
          success:   'var(--chart-success)',
          neutral:   'var(--chart-neutral)',
          warning:   'var(--chart-warning)',
          purple:    'var(--chart-purple)',
        },
      },

      /* ─── Border Radius ──────────────────────── */
      borderRadius: {
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      /* ─── Box Shadows ───────────────────────── */
      boxShadow: {
        xs:        'var(--shadow-xs)',
        sm:        'var(--shadow-sm)',
        md:        'var(--shadow-md)',
        lg:        'var(--shadow-lg)',
        xl:        'var(--shadow-xl)',
        primary:   'var(--shadow-primary)',
        secondary: 'var(--shadow-secondary)',
        success:   'var(--shadow-success)',
        'focus-primary':   'var(--shadow-focus-primary)',
        'focus-secondary': 'var(--shadow-focus-secondary)',
      },

      /* ─── Spacing ────────────────────────────── */
      spacing: {
        '0.5': '2px',
        '1':   '4px',
        '2':   '8px',
        '3':   '12px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '7':   '28px',
        '8':   '32px',
        '9':   '36px',
        '10':  '40px',
        '12':  '48px',
        '14':  '56px',
        '16':  '64px',
        '20':  '80px',
        '24':  '96px',
        sidebar:       'var(--sidebar-width)',
        'sidebar-sm':  'var(--sidebar-collapsed-width)',
        'right-panel': 'var(--right-panel-width)',
        topbar:        'var(--topbar-height)',
      },

      /* ─── Font Size ──────────────────────────── */
      fontSize: {
        'display-xl': ['clamp(36px, 4vw, 56px)', { lineHeight: '1.1', fontWeight: '800' }],
        'display-lg': ['clamp(28px, 3vw, 40px)', { lineHeight: '1.15', fontWeight: '700' }],
        'display-md': ['clamp(22px, 2.5vw, 30px)', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-lg': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        'heading-sm': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg':    ['15px', { lineHeight: '1.6' }],
        'body-md':    ['14px', { lineHeight: '1.6' }],
        'body-sm':    ['13px', { lineHeight: '1.5' }],
        'label':      ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'mono':       ['13px', { lineHeight: '1.5' }],
      },

      /* ─── Letter Spacing ─────────────────────── */
      letterSpacing: {
        tight:   '-0.03em',
        snug:    '-0.02em',
        normal:  '0',
        wide:    '0.02em',
        wider:   '0.04em',
        widest:  '0.08em',
      },

      /* ─── Transitions ────────────────────────── */
      transitionDuration: {
        micro:  '80ms',
        fast:   '150ms',
        base:   '250ms',
        slow:   '400ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        out:    'cubic-bezier(0, 0, 0.2, 1)',
        in:     'cubic-bezier(0.4, 0, 1, 1)',
      },

      /* ─── Animations ─────────────────────────── */
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in':       'fade-in 200ms ease forwards',
        'fade-up':       'fade-up 300ms ease forwards',
        'scale-in':      'scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-in-left': 'slide-in-left 250ms ease forwards',
        'slide-in-right':'slide-in-right 250ms ease forwards',
        'shimmer':       'shimmer 2s linear infinite',
        'pulse-soft':    'pulse-soft 2s ease-in-out infinite',
        'bounce-soft':   'bounce-soft 2s ease-in-out infinite',
        'spin-slow':     'spin-slow 8s linear infinite',
      },

      /* ─── Background Image ───────────────────── */
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },

      /* ─── Z-Index ─────────────────────────────── */
      zIndex: {
        'base':    '0',
        'raised':  '10',
        'sticky':  '20',
        'overlay': '30',
        'modal':   '40',
        'toast':   '50',
        'tooltip': '60',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
}

export default config
