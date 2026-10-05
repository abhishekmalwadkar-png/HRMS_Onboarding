# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** MangoHRMS
**Generated:** 2026-10-05 18:46:57
**Category:** SaaS (General)
**Design Dials:** Variance 4/10 (Balanced / Modern) | Motion 5/10 (Standard) | Density 7/10 (Standard)

---

## Project Decisions (override the generated defaults below)

These were decided for MangoHRMS and take precedence over anything generated further down.

1. **Brand palette is AutomationEdge orange**, not the generated trust-blue. Source: automationedge.com (`#f87917`, gradient `#ef5809 → #f87917`).
2. **Contrast-checked roles** (WCAG ratios measured): white text needs a fill of `#c2410c` or darker; orange text on white uses `#c2410c`; bright `#f87917` is for non-text accents only.
3. **Page pattern is an app shell**, not "Hero + Features + CTA" (that is a marketing landing pattern): fixed sidebar → sticky header → page header (title, one-line description, primary action) → content.
4. **Glassmorphism is limited to the sticky header and overlays.** Content cards are solid white for readability of dense HR data.
5. **Icons stay on Font Awesome 6** (already used everywhere, one consistent set). Decorative icons get `aria-hidden`; icon-only buttons get `aria-label`. No emoji as icons in UI chrome.
6. **Motion uses the `motion` library** (`motion/react`), not GSAP: page fade/slide 280ms, card stagger 60ms/400ms, no overshoot easing on data UI, `MotionConfig reducedMotion="user"` app-wide.
7. **Inputs use 15px text** (dense dashboard at 14px base; inputs larger for legibility), visible labels always, errors shown next to the field.

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable (index.css) | Contrast |
|------|-----|--------------------------|----------|
| Brand accent (non-text) | `#F87917` | `--brand-orange` / `--accent-primary` | decorative only (2.71:1 vs white) |
| Brand gradient | `#EF5809 → #F87917` | `--accent-gradient` | decorative only |
| Primary button fill | `#C2410C → #AD3A0B` | `--button-gradient` | white text 5.18:1+ |
| Accent text | `#C2410C` | `--accent-text` | 5.18:1 on white |
| Accent icon | `#EA580C` | `--accent-icon` | 3.56:1 on white (graphics ≥ 3:1) |
| Soft accent surface | `#FFF7ED` / `#FFEDD5` | `--bg-accent-soft` / `--bg-accent-subtle` | |
| Accent border | `#FED7AA` / `#FDBA74` | `--border-orange` / `--border-orange-strong` | |
| Background | `#F8F7F5` | `--bg-primary` | |
| Foreground | `#0F172A` | `--text-main` | |
| Card | `#FFFFFF` | `--bg-card` | |
| Muted foreground | `#64748B` | `--text-muted` | 4.76:1 on white |
| Border | `#E2E8F0` | `--border-color` | |
| Success | `#059669` | `--accent-emerald-dark` | |
| Destructive | `#E11D48` | `--accent-rose` | |
| Dark-mode accent text | `#FDBA74` | `--accent-text` (dark) | 10.59:1 on `#0F172A` |

**Color Notes:** Generated suggestion was trust blue + orange CTA; replaced by the AutomationEdge brand per Project Decision 1.

### Typography

- **Heading Font:** Plus Jakarta Sans
- **Body Font:** Plus Jakarta Sans
- **Mood:** enterprise, saas, b2b, professional, indigo, modern, approachable, legible, ios dynamic type, android scaling
- **Google Fonts:** [Plus Jakarta Sans + Plus Jakarta Sans](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap');
```

### Spacing Variables

*Density: 7/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #EA580C;
  color: #000000;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #2563EB;
  border: 2px solid #2563EB;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #2563EB;
  outline: none;
  box-shadow: 0 0 0 3px #2563EB20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Glassmorphism

**Keywords:** Frosted glass, transparent, blurred background, layered, vibrant background, light source, depth, multi-layer

**Best For:** Modern SaaS, financial dashboards, high-end corporate, lifestyle apps, modal overlays, navigation

**Key Effects:** Backdrop blur (10-20px), subtle border (1px solid rgba white 0.2), light reflection, Z-depth

### Page Pattern

**Pattern Name:** Hero + Features + CTA

- **Conversion Strategy:** Deep CTA placement. For CTA label text, verify at least 4.5:1 against the button fill; use 7:1 only when the product explicitly targets AAA normal-text contrast. Keep focus and component boundaries independently visible. Disable hero parallax under reduced motion and render its static final state.
- **CTA Placement:** Hero (sticky) + Bottom
- **Section Order:** Hero with headline/image > Value prop > Key features (3-5) > CTA section > Footer

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger; Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ Excessive animation
- ❌ Dark mode by default

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
