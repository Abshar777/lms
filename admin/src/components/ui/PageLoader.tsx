import FlickerSpinner from './FlickerSpinner'

export default function PageLoader({ text = 'Loading…' }: { text?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3"
      style={{ background: '#0D0F1A' }}
    >
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#60a5fa]">
        Delta Admin
      </p>
      <FlickerSpinner size={36} on="#60a5fa" off="#1e2d5e" />
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{text}</p>
    </div>
  )
}
