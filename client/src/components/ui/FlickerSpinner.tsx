import type { CSSProperties } from 'react'

const KF = `
@keyframes f100110{0%{opacity:1}16.66%{opacity:1}16.67%{opacity:0}49.99%{opacity:0}50%{opacity:1}83.32%{opacity:1}83.33%{opacity:0}100%{opacity:0}}
@keyframes f111110{0%{opacity:1}83.32%{opacity:1}83.33%{opacity:0}100%{opacity:0}}
@keyframes f110110{0%{opacity:1}33.32%{opacity:1}33.33%{opacity:0}49.99%{opacity:0}50%{opacity:1}83.32%{opacity:1}83.33%{opacity:0}100%{opacity:0}}
@keyframes f010110{0%{opacity:0}16.66%{opacity:0}16.67%{opacity:1}33.32%{opacity:1}33.33%{opacity:0}49.99%{opacity:0}50%{opacity:1}83.32%{opacity:1}83.33%{opacity:0}100%{opacity:0}}
@keyframes f000100{0%{opacity:0}49.99%{opacity:0}50%{opacity:1}66.66%{opacity:1}66.67%{opacity:0}100%{opacity:0}}
@keyframes f100010{0%{opacity:1}16.66%{opacity:1}16.67%{opacity:0}66.66%{opacity:0}66.67%{opacity:1}83.32%{opacity:1}83.33%{opacity:0}100%{opacity:0}}
@keyframes f011000{0%{opacity:0}16.66%{opacity:0}16.67%{opacity:1}49.99%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes f011010{0%{opacity:0}16.66%{opacity:0}16.67%{opacity:1}49.99%{opacity:1}50%{opacity:0}66.66%{opacity:0}66.67%{opacity:1}83.32%{opacity:1}83.33%{opacity:0}100%{opacity:0}}
@keyframes f110010{0%{opacity:1}33.32%{opacity:1}33.33%{opacity:0}66.66%{opacity:0}66.67%{opacity:1}83.32%{opacity:1}83.33%{opacity:0}100%{opacity:0}}
@keyframes f111000{0%{opacity:1}49.99%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes f111100{0%{opacity:1}66.66%{opacity:1}66.67%{opacity:0}100%{opacity:0}}
@media(prefers-reduced-motion:reduce){circle{animation:none!important}}`

export default function FlickerSpinner({
  size = 28,
  on,
  off,
  dur = '0.9s',
}: {
  size?: number
  on: string
  off: string
  dur?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Loading"
      style={{ '--on': on, '--off': off, '--dur': dur } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`circle{fill:var(--off)}circle.on{fill:var(--on)}${KF}`}</style>
      {/* Row 1 */}
      <circle cx={3} cy={3} r={2}/><circle cx={9} cy={3} r={2}/><circle cx={15} cy={3} r={2}/>
      <circle cx={21} cy={3} r={2}/><circle cx={27} cy={3} r={2}/><circle cx={33} cy={3} r={2}/><circle cx={39} cy={3} r={2}/>
      {/* Row 2 */}
      <circle cx={3} cy={9} r={2}/>
      <circle cx={9} cy={9} r={2}/><circle className="on" cx={9} cy={9} r={2} opacity={1} style={{animation:`f100110 ${dur} linear infinite`}}/>
      <circle cx={15} cy={9} r={2}/><circle className="on" cx={15} cy={9} r={2} opacity={1} style={{animation:`f111110 ${dur} linear infinite`}}/>
      <circle cx={21} cy={9} r={2}/><circle className="on" cx={21} cy={9} r={2} opacity={1} style={{animation:`f110110 ${dur} linear infinite`}}/>
      <circle cx={27} cy={9} r={2}/><circle className="on" cx={27} cy={9} r={2} opacity={0} style={{animation:`f010110 ${dur} linear infinite`}}/>
      <circle cx={33} cy={9} r={2}/><circle className="on" cx={33} cy={9} r={2} opacity={0} style={{animation:`f000100 ${dur} linear infinite`}}/>
      <circle cx={39} cy={9} r={2}/>
      {/* Row 3 */}
      <circle cx={3} cy={15} r={2}/>
      <circle cx={9} cy={15} r={2}/><circle className="on" cx={9} cy={15} r={2} opacity={1} style={{animation:`f100010 ${dur} linear infinite`}}/>
      <circle cx={15} cy={15} r={2}/><circle className="on" cx={15} cy={15} r={2} opacity={0} style={{animation:`f011000 ${dur} linear infinite`}}/>
      <circle cx={21} cy={15} r={2}/><circle className="on" cx={21} cy={15} r={2} opacity={0} style={{animation:`f000100 ${dur} linear infinite`}}/>
      <circle cx={27} cy={15} r={2}/><circle className="on" cx={27} cy={15} r={2} opacity={1} style={{animation:`f100010 ${dur} linear infinite`}}/>
      <circle cx={33} cy={15} r={2}/><circle cx={39} cy={15} r={2}/>
      {/* Row 4 */}
      <circle cx={3} cy={21} r={2}/>
      <circle cx={9} cy={21} r={2}/><circle className="on" cx={9} cy={21} r={2} opacity={1} style={{animation:`f100010 ${dur} linear infinite`}}/>
      <circle cx={15} cy={21} r={2}/><circle className="on" cx={15} cy={21} r={2} opacity={0} style={{animation:`f011010 ${dur} linear infinite`}}/>
      <circle cx={21} cy={21} r={2}/><circle className="on" cx={21} cy={21} r={2} opacity={0} style={{animation:`f010110 ${dur} linear infinite`}}/>
      <circle cx={27} cy={21} r={2}/><circle className="on" cx={27} cy={21} r={2} opacity={1} style={{animation:`f110010 ${dur} linear infinite`}}/>
      <circle cx={33} cy={21} r={2}/><circle cx={39} cy={21} r={2}/>
      {/* Row 5 */}
      <circle cx={3} cy={27} r={2}/>
      <circle cx={9} cy={27} r={2}/><circle className="on" cx={9} cy={27} r={2} opacity={1} style={{animation:`f100010 ${dur} linear infinite`}}/>
      <circle cx={15} cy={27} r={2}/><circle className="on" cx={15} cy={27} r={2} opacity={0} style={{animation:`f011000 ${dur} linear infinite`}}/>
      <circle cx={21} cy={27} r={2}/><circle className="on" cx={21} cy={27} r={2} opacity={0} style={{animation:`f000100 ${dur} linear infinite`}}/>
      <circle cx={27} cy={27} r={2}/><circle className="on" cx={27} cy={27} r={2} opacity={1} style={{animation:`f100010 ${dur} linear infinite`}}/>
      <circle cx={33} cy={27} r={2}/><circle cx={39} cy={27} r={2}/>
      {/* Row 6 */}
      <circle cx={3} cy={33} r={2}/>
      <circle cx={9} cy={33} r={2}/><circle className="on" cx={9} cy={33} r={2} opacity={1} style={{animation:`f100010 ${dur} linear infinite`}}/>
      <circle cx={15} cy={33} r={2}/><circle className="on" cx={15} cy={33} r={2} opacity={1} style={{animation:`f111000 ${dur} linear infinite`}}/>
      <circle cx={21} cy={33} r={2}/><circle className="on" cx={21} cy={33} r={2} opacity={1} style={{animation:`f111100 ${dur} linear infinite`}}/>
      <circle cx={27} cy={33} r={2}/><circle className="on" cx={27} cy={33} r={2} opacity={0} style={{animation:`f011010 ${dur} linear infinite`}}/>
      <circle cx={33} cy={33} r={2}/><circle cx={39} cy={33} r={2}/>
      {/* Row 7 */}
      <circle cx={3} cy={39} r={2}/><circle cx={9} cy={39} r={2}/><circle cx={15} cy={39} r={2}/>
      <circle cx={21} cy={39} r={2}/><circle cx={27} cy={39} r={2}/><circle cx={33} cy={39} r={2}/><circle cx={39} cy={39} r={2}/>
    </svg>
  )
}
