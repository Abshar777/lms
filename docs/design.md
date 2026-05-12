# LMS Design System — Design Language Guide

## Design Philosophy

**"Soft Productivity"** — Light, airy, and focused. This LMS feels like a well-organized desk: everything is findable, nothing screams for attention, and working inside it is genuinely pleasant. The interface is approachable without being childish, structured without being corporate.

The one thing users will remember: **warmth through precision** — an orange that energizes without overwhelming, generous white space that breathes, and micro-interactions that feel alive.

---

## Color System

### Core Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg-page` | `#F4F5F8` | Page/app background |
| `--color-bg-surface` | `#FFFFFF` | Cards, sidebar, panels |
| `--color-bg-elevated` | `#FFFFFF` | Modals, dropdowns |
| `--color-bg-muted` | `#F0F1F5` | Input backgrounds, disabled states |
| `--color-border` | `#E4E7ED` | Card borders, dividers |
| `--color-border-strong` | `#CDD0DA` | Input borders, emphasized dividers |

### Brand Colors

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#FF6B1A` | Primary CTA, active indicators, data viz hero |
| `--color-primary-light` | `#FFF0E8` | Primary background tints, hover states |
| `--color-primary-dark` | `#E55A0E` | Primary hover/active |
| `--color-secondary` | `#2F6BFF` | Secondary CTA, active nav, links |
| `--color-secondary-light` | `#EEF3FF` | Secondary background tints |
| `--color-secondary-dark` | `#1A53E0` | Secondary hover/active |
| `--color-success` | `#0ECC8E` | Online status, success states |
| `--color-success-light` | `#E6FAF4` | Success backgrounds |
| `--color-warning` | `#F59E0B` | Warnings, due-soon badges |
| `--color-danger` | `#EF4444` | Errors, offline status |

### Text Colors

| Token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#0D0F1A` | Headings, primary content |
| `--color-text-secondary` | `#4B5563` | Body text, descriptions |
| `--color-text-muted` | `#9CA3AF` | Placeholders, captions, metadata |
| `--color-text-inverse` | `#FFFFFF` | Text on dark/colored backgrounds |

### Chart / Data Viz Colors

Used for bar charts, progress rings, activity graphs:

```
Orange   #FF6B1A  — primary metric (current day / hero value)
Blue     #93B4FF  — secondary metric
Green    #0ECC8E  — positive trend
Gray     #E4E7ED  — inactive/empty bars
```

---

## Typography

### Font Families

| Role | Font | Import |
|---|---|---|
| **Display** | `Bricolage Grotesque` | Google Fonts |
| **Body** | `DM Sans` | Google Fonts |
| **Mono** | `JetBrains Mono` | Google Fonts |

**Why these fonts:**
- `Bricolage Grotesque` — expressive variable weight range (200–800), editorial feel, slightly organic curves. Perfect for dashboard headings that need personality.
- `DM Sans` — optically balanced at small sizes, slightly warm letterforms. More character than Inter without being distracting.
- `JetBrains Mono` — for code snippets, IDs, and data values.

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `--text-display-xl` | 48px | 1.1 | 800 | Hero/landing headings |
| `--text-display-lg` | 36px | 1.15 | 700 | Page greetings ("Morning, Name") |
| `--text-display-md` | 28px | 1.2 | 700 | Section headings |
| `--text-heading-lg` | 22px | 1.3 | 600 | Card titles, modal headings |
| `--text-heading-md` | 18px | 1.35 | 600 | Sub-section headings |
| `--text-heading-sm` | 16px | 1.4 | 600 | Labels, nav items |
| `--text-body-lg` | 15px | 1.6 | 400 | Primary body |
| `--text-body-md` | 14px | 1.6 | 400 | Secondary body, descriptions |
| `--text-body-sm` | 13px | 1.5 | 400 | Captions, metadata |
| `--text-label` | 12px | 1.4 | 500 | Tags, badges, table headers |
| `--text-mono` | 13px | 1.5 | 400 | Code, IDs, data values |

### Typography Rules

- **Greeting pattern**: Light weight label ("Morning,") + Ultra-bold name on next line — weight contrast creates visual rhythm
- **Section headers**: Never use ALL CAPS. Use weight + size contrast instead.
- **Numbers in stats**: Display-lg, bold, tight letter-spacing (`-0.02em`)
- **Table text**: body-sm, muted for labels, body-md for values

---

## Spacing System

Base unit: `4px`. All spacing is a multiple of this.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Micro gaps (icon + label) |
| `--space-2` | `8px` | Tight internal padding |
| `--space-3` | `12px` | Input padding, compact items |
| `--space-4` | `16px` | Standard card padding |
| `--space-5` | `20px` | Section sub-gap |
| `--space-6` | `24px` | Card inner padding (comfortable) |
| `--space-8` | `32px` | Between major sections |
| `--space-10` | `40px` | Panel top padding |
| `--space-12` | `48px` | Page section gap |
| `--space-16` | `64px` | Hero spacing |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Badges, small chips |
| `--radius-md` | `10px` | Inputs, small buttons |
| `--radius-lg` | `14px` | Cards, panels |
| `--radius-xl` | `20px` | Large cards, modals |
| `--radius-2xl` | `28px` | Feature cards, hero sections |
| `--radius-full` | `9999px` | Pills, avatars, status dots |

**Rule**: Never use `border-radius: 4px` or less on interactive elements — this LMS is warm and friendly, not corporate sharp.

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(13,15,26,0.04)` | Subtle card lift |
| `--shadow-sm` | `0 2px 8px rgba(13,15,26,0.06)` | Default card shadow |
| `--shadow-md` | `0 4px 16px rgba(13,15,26,0.08)` | Elevated cards, dropdowns |
| `--shadow-lg` | `0 8px 32px rgba(13,15,26,0.10)` | Modals, floating panels |
| `--shadow-xl` | `0 16px 48px rgba(13,15,26,0.14)` | Full-screen overlays |
| `--shadow-primary` | `0 4px 20px rgba(255,107,26,0.28)` | Orange CTA buttons |
| `--shadow-secondary` | `0 4px 20px rgba(47,107,255,0.24)` | Blue CTA buttons |

**Rule**: Shadows should always be warm-tinted (using `rgba(13,15,26,...)`) never pure black. Never use `box-shadow: 0 0 10px black`.

---

## Component Patterns

### Cards

```
Background: --color-bg-surface
Border: 1px solid --color-border
Border-radius: --radius-lg (14px)
Shadow: --shadow-sm
Padding: --space-6 (24px)
Hover: shadow escalates to --shadow-md, translateY(-2px)
```

### Sidebar Navigation

```
Width: 240px (collapsed: 72px)
Background: --color-bg-surface
Border-right: 1px solid --color-border
Nav item height: 44px
Active state: background --color-secondary-light, left border 3px --color-secondary
Active text: --color-secondary, weight 600
Icon + label gap: --space-3
```

### Stat Cards

```
Layout: icon (top-left) + large number + label below
Icon wrapper: 36x36, border-radius --radius-md, background tinted (primary-light or secondary-light)
Number: --text-display-md, weight 700
Label: --text-body-sm, --color-text-muted
```

### Buttons

**Primary (Orange)**
```
Background: --color-primary
Text: white, weight 600, 14px
Padding: 10px 20px
Border-radius: --radius-md (10px)
Shadow: --shadow-primary
Hover: --color-primary-dark, shadow stronger
```

**Secondary (Blue)**
```
Background: --color-secondary
Same structure as primary
Shadow: --shadow-secondary
```

**Ghost**
```
Background: transparent
Border: 1px solid --color-border
Text: --color-text-secondary
Hover: background --color-bg-muted
```

### Inputs

```
Background: --color-bg-muted
Border: 1px solid --color-border
Border-radius: --radius-md (10px)
Padding: 10px 14px
Font: --text-body-md
Placeholder: --color-text-muted
Focus: border-color --color-secondary, shadow 0 0 0 3px rgba(47,107,255,0.12)
```

### Badge / Status Pills

```
Padding: 3px 10px
Border-radius: --radius-full
Font: --text-label (12px, 500)
Online: background --color-success-light, text --color-success
Offline: background #FEE2E2, text --color-danger
```

### Data Visualization (Bar Charts)

- Bars: `border-radius: 8px 8px 0 0` (rounded top only)
- Active/current bar: `--color-primary` with drop shadow
- Inactive bars: `--color-border` (#E4E7ED)
- Secondary bars: `--color-secondary` with 60% opacity
- Chart background: transparent
- Grid lines: dashed, `--color-border`

---

## Layout System

### Three-Column Dashboard Layout

```
Left sidebar:    240px  fixed
Main content:    flex-1 (fills remaining)
Right panel:     280px  fixed

Total max-width: 1280px
Gap between columns: 0 (columns are visually separated by background difference)
```

### Grid for Content Area

```
Stats row: 3 equal columns (or 2+1)
Course cards: 3 columns, 1fr each, gap 16px
Assignment table: full width
```

### Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| `xs` | 480px | Mobile, single column |
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet, sidebar collapses to icons |
| `lg` | 1024px | Sidebar visible, no right panel |
| `xl` | 1280px | Full three-column layout |
| `2xl` | 1536px | Max-width capped, centered |

---

## Motion & Animation

### Philosophy

- **Purposeful** — animate to communicate state change, not to decorate
- **Spring-based** — `spring` physics feel more alive than `ease-in-out`
- **Staggered reveals** — page load sequences items 0.05s apart (never 0.2s+, too slow)
- **Instant feedback** — hover states respond in ≤100ms

### Framer Motion Presets

See `design-system/animations.ts` for all presets.

| Preset | Usage |
|---|---|
| `fadeUp` | Page sections, card reveals |
| `fadeIn` | Overlays, tooltips |
| `scaleIn` | Modals, dropdowns |
| `staggerContainer` | Lists, grids |
| `staggerItem` | Individual items in staggered lists |
| `slideInLeft` | Sidebar, drawers |
| `slideInRight` | Right panel, notifications |
| `countUp` | Stat numbers |

### Timing Reference

| Category | Duration |
|---|---|
| Micro (hover, focus) | 80–120ms |
| Transitions (page elements) | 200–350ms |
| Layout changes | 300–450ms |
| Page transitions | 400–600ms |

---

## Icon System

- **Library**: Lucide React (consistent with Shadcn UI)
- **Size standards**: 16px (inline), 18px (nav), 20px (card), 24px (feature)
- **Stroke width**: `1.5` (default Lucide — do not change to 2, too heavy)
- **Color**: Inherits from parent text color unless explicitly colored

---

## Do / Don't

### Do
- Use orange as a single hero accent — don't spread it everywhere
- Add `transition` to all interactive elements (`150ms ease`)
- Use weight contrast for hierarchy instead of size alone
- Keep sidebar icons monochrome, activate with color only on selection
- Round ALL corners generously (minimum 6px on anything visible)
- Show status with color + icon (never color alone — accessibility)

### Don't
- Never use `Arial`, `Roboto`, `Inter`, or `system-ui` — always load the specified fonts
- Never use hard black (`#000000`) — use `--color-text-primary` (`#0D0F1A`)
- Never use pure gray backgrounds — always warm-tinted
- Never stack two blue CTAs — primary = orange, secondary = blue, never two oranges or two blues side-by-side
- Never use `font-weight: 400` for headings
- Never use box-shadow with opacity > 0.20 on cards (too heavy)
- Never animate opacity alone — pair with translateY or scale

---

## Accessibility

- Color contrast: All text on backgrounds meets WCAG AA (4.5:1 minimum)
- Focus rings: `outline: 2px solid var(--color-secondary); outline-offset: 2px`
- Interactive targets: Minimum 44x44px touch target
- Status indicators: Always color + text/icon (never color alone)
- Reduced motion: Wrap all Framer Motion animations in `useReducedMotion()` check

---

## File Structure

```
design-system/
├── tokens.css          # CSS custom properties (single source of truth)
├── tailwind.config.ts  # Extended Tailwind config consuming tokens
├── animations.ts       # Framer Motion variant presets
└── fonts.ts            # Font loading config (next/font)

docs/
└── design.md           # This file
```
