import FlickerSpinner from './FlickerSpinner'

const VARIANTS = {
  blue:  { on: '#60a5fa', off: '#1e2d5e' },
  white: { on: '#ffffff', off: 'rgba(255,255,255,0.2)' },
  muted: { on: 'rgba(255,255,255,0.45)', off: 'rgba(255,255,255,0.08)' },
  gray:  { on: '#9ca3af', off: '#374151' },
} as const

export default function Spinner({
  size = 14,
  variant = 'blue',
  className,
}: {
  size?: number
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  const { on, off } = VARIANTS[variant]
  const spinner = <FlickerSpinner size={size} on={on} off={off} />
  if (!className) return spinner
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {spinner}
    </span>
  )
}
