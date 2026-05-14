# Client Frontend — Design System & Visual Language

---

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#FF6B1A` | CTAs, active states, accent |
| Primary hover | `#E55A0E` | Hover on primary buttons |
| Primary light | `#FFF0E8` | Backgrounds, hover on nav items |
| Secondary | `#2F6BFF` | Badges, info states |
| Success | `#0ECC8E` | Progress bars, completion |
| Warning | `#F59E0B` | Star ratings |
| Danger | `#EF4444` | Errors, destructive actions |
| Content primary | `#0D0F1A` | Body text, headings |
| Content secondary | `#4B5563` | Secondary text |
| Content muted | `#9CA3AF` | Placeholders, timestamps |
| Page bg | `#F4F5F8` | App background |
| Surface | `#FFFFFF` | Cards, sidebars |
| Border | `#E4E7ED` | Dividers, card borders |

---

## Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Display / headings | Bricolage Grotesque | 16–32px | 700 |
| Body | DM Sans | 13–15px | 400–600 |
| Code | JetBrains Mono | 12–13px | 400 |

---

## Spacing & Layout

- **Page padding**: `px-4 py-5` on mobile → `px-6 py-7` on sm+
- **Card padding**: `p-4` → `p-6`
- **Topbar height**: `60px` (row 1) + `40px` (nav tabs) = `100px` total
- **Sidebar widths**: `68px` collapsed, `240px` expanded
- **Main content top offset**: `pt-[100px]`

---

## Component Patterns

### Buttons
```tsx
// Primary CTA
<button style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 4px 16px rgba(255,107,26,0.30)' }}>

// Ghost / secondary
<button className="rounded-xl px-4 py-2 hover:bg-orange-50" style={{ color: '#FF6B1A' }}>
```

### Cards
```tsx
<div className="rounded-2xl bg-white" style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
```

### Input fields
```tsx
<input className="rounded-xl py-2 pl-9 pr-4 text-sm outline-none"
  style={{ background: '#F3F4F6', border: '1.5px solid transparent', color: '#111827' }}
  onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; ... }}
/>
```

### Active nav item
```tsx
// Framer Motion layoutId for shared underline animation
<motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
  style={{ background: '#FF6B1A' }} />
```

### Progress bars
```tsx
<div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
  <motion.div className="h-full rounded-full" style={{ background: '#22C55E' }}
    initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
</div>
```

---

## Animations (Framer Motion)

| Pattern | Variant | Transition |
|---------|---------|-----------|
| Page sections | `fadeUp = { hidden: { opacity:0, y:16 }, show: { opacity:1, y:0 } }` | spring stiffness:280 damping:26 |
| Stagger grid | `stagger = { show: { staggerChildren: 0.05 } }` | — |
| Sidebar width | `animate={{ width: w }}` | spring stiffness:300 damping:30 |
| Mobile drawer | `initial={{ x:-280 }} animate={{ x:0 }}` | spring stiffness:300 damping:30 |
| Active pill | `layoutId="..."` | spring stiffness:500 damping:35 |
| Mount/unmount | `AnimatePresence` wrapper | initial/animate/exit props |

---

## Responsive Breakpoints

| Breakpoint | Width | Layout change |
|-----------|-------|--------------|
| `sm` | 640px | Inline layouts replace stacked (cards, inputs) |
| `lg` | 1024px | Desktop sidebar appears; hamburger disappears |
| `xl` | 1280px | Grid goes from 2 → 4 columns |

---

## Icons

All icons are from `lucide-react`. Common ones:
- Navigation: `GraduationCap`, `BookOpen`, `Map`, `Trophy`, `Flame`, `Heart`, `Settings`
- Actions: `Search`, `Bell`, `Menu`, `X`, `ChevronLeft`, `LogOut`
- Status: `Play`, `CheckCircle2`, `Loader2`, `Star`

---

## Status Badges

```tsx
// Enrollment status
{ not_started: { bg: '#F3F4F6', color: '#6B7280' } }
{ in_progress:  { bg: '#EFF6FF', color: '#2563EB' } }
{ completed:    { bg: '#F0FDF4', color: '#166534' } }

// Course level
{ beginner:     { bg: '#F0FDF4', color: '#166534' } }
{ intermediate: { bg: '#FFFBEB', color: '#92400E' } }
{ advanced:     { bg: '#FEF2F2', color: '#991B1B' } }
```

---

## Form Patterns

- Library: `react-hook-form` + `@hookform/resolvers/zod`
- All form schemas defined with `zod` in the same file as the form component
- Error messages show below the field in `text-xs text-red-500`
- Submitting state: `isSubmitting` from `formState` drives spinner + disabled state
