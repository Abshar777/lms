import FlickerSpinner from './FlickerSpinner'

export default function PageLoader({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white">
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#0057b8]">
        Delta LMS
      </p>
      <FlickerSpinner size={36} on="#0057b8" off="#bcd3f2" />
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  )
}
