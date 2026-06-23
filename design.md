# Delta Institutions Design System

Extracted from `delta-enrolment-form-main` — use this as the reference for all Delta-branded pages in the LMS client.

---

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary blue | `#0057b8` | Buttons, links, accents (HSL 213 100% 36%) |
| Primary dark | `#003d80` | Background gradient end |
| Sky accent | `#7DD3FC` | Headings, stats, highlights on dark bg |
| Primary hover | `#003d80` | Button hover state |

---

## Background — Animated Blue Grid

```css
background: linear-gradient(135deg, #0057b8 0%, #003d80 100%);
```

### Grid overlay (scrolling right at 6 s)
```css
@keyframes deltaGridScroll {
  from { background-position: 0 0; }
  to   { background-position: 40px 0; }
}

.delta-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: deltaGridScroll 6s linear infinite;
}
```

### Decorative glows
- Top-right: `radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)`, 420×420px, offset `top: -100px; right: -100px`
- Bottom-left: `radial-gradient(circle, rgba(0,180,216,0.16) 0%, transparent 70%)`, 320×320px

---

## Typography

| Role | Font | Weight |
|------|------|--------|
| Headings | Plus Jakarta Sans | 800–900 (black) |
| Body / labels | Plus Jakarta Sans | 400–700 |
| Fallback | system-ui |  |

Headings: `text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.05`

---

## Logo

- File: `/logo.webp`
- Size on hero: `height: 80px`
- Animation: float up-down `translateY(0 → -9px → 0)` over 4 s
```css
@keyframes deltaFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-9px); }
}
```

---

## KHDA Badge (on dark background)

```tsx
<div style={{
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.30)',
  borderRadius: 9999,
  padding: '6px 16px',
  color: 'white',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '3px',
  textTransform: 'uppercase',
}}>
  <span style={{ /* sky-300 pulsing dot */ background: '#7DD3FC', animation: 'deltaPulse 1.8s ease-in-out infinite' }} />
  Dubai · UAE · KHDA Approved
</div>
```

---

## Stats Row (on dark background)

Three columns: `7K+ Members`, `8+ Years`, `20+ Trainers`

- Value: `font-size: 30px; font-weight: 900; color: #7DD3FC`
- Label: `font-size: 9px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 2px`

---

## Card (white, on dark bg)

```css
background: rgba(255,255,255,0.98);
border: 1.5px solid rgba(255,255,255,0.7);
border-radius: 20px;
box-shadow: 0 16px 56px rgba(0,45,110,0.22), 0 2px 8px rgba(0,0,0,0.06);
```

---

## Input

```css
height: 48px;
border-radius: 14px;
border: 2px solid hsl(210 32% 88%);
background: #fff;
font-size: 16px;  /* prevents iOS auto-zoom */
font-weight: 500;
transition: border-color 0.2s, box-shadow 0.2s;
```

**Focus:**
```css
border-color: #0057b8;
box-shadow: 0 0 0 3px rgba(0,87,184,0.12);
```

**Error:**
```css
border-color: #f87171;
box-shadow: 0 0 0 3px rgba(248,113,113,0.12);
```

---

## Button — Primary

```css
background: hsl(213 100% 36%); /* #0057b8 */
color: #fff;
border-radius: 50px;
font-weight: 800;
letter-spacing: 0.4px;
transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
```

**Hover:**
```css
background: hsl(213 100% 28%); /* #003d80 */
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(0,87,184,0.35);
```

---

## Auth Page Layout (full-screen split)

| Panel | Width | Content |
|-------|-------|---------|
| Left hero (lg+) | 55% | Blue grid background, Delta logo, KHDA badge, heading, stats |
| Right form | 45% | White card, form fields, mode toggle pill |

---

## Animations Summary

| Name | Duration | Notes |
|------|----------|-------|
| `deltaGridScroll` | 6s linear infinite | Grid slides right by one cell (40px) |
| `deltaFloat` | 4s ease-in-out infinite | Logo floats ±9px vertically |
| `deltaPulse` | 1.8s ease-in-out infinite | Sky-blue dot pulse ring |
| `slideInUp` | 0.65s ease once | Page/card entrance |
| `fadeIn` | 0.9s ease once | Secondary elements |
