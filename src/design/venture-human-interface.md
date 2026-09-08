---
name: Venture Human Interface
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#46464b'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#77777b'
  outline-variant: '#c7c6cb'
  surface-tint: '#5e5e62'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1f'
  on-primary-container: '#848387'
  inverse-primary: '#c7c6ca'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#100069'
  on-tertiary-container: '#7771ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3e2e6'
  primary-fixed-dim: '#c7c6ca'
  on-primary-fixed: '#1b1b1f'
  on-primary-fixed-variant: '#46464a'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#e3dfff'
  tertiary-fixed-dim: '#c3c0ff'
  on-tertiary-fixed: '#100069'
  on-tertiary-fixed-variant: '#372abf'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-pill:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.005em
  caption-micro:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4.5rem
  gutter-desktop: 1.5rem
  gutter-tablet: 1.25rem
  gutter-mobile: 1rem
  container-max: 1200px
---

## Brand & Style

This design system establishes an executive, high-trust advisory environment tailored for early-to-growth stage founders, prominent angel syndicates, and institutional mentors. The aesthetic merges Cupertino-inspired restraint—celebrated for optical balance, precise micro-translucency, and surgical layout discipline—with the gravitas of elite venture capital. 

Rather than leaning into flashy fintech cliches or loud neon metrics, the atmosphere projects enduring calm, institutional security, and intellectual precision. Key brand tenets include:
- **Subtle Authority:** Generous negative space, uncompromising typographic alignment, and structured data hierarchy evoke clarity and high-stakes competence.
- **Physicality & Light:** Controlled glassmorphic overlays, continuous corner radiuses, and wafer-thin crisp perimeter borders mimic machined hardware finishes.
- **Immediate Legibility:** Information density is disciplined; high-contrast type paired with soft neutral canvases ensures advisory calendars, term sheets, and investor dossiers remain effortless to parse under any condition.

## Colors

The color architecture relies on an achromatic core accented by deep obsidian and restrained midnight-indigo tones, allowing pitch summaries and verified advisor credentials to stand out with gravitas.

- **Primary (`#090A0D`):** An obsidian tone utilized for dominant actions, primary text, and definitive UI anchors.
- **Secondary (`#1E293B`):** A deep slate that manages structural frames, muted labels, and secondary interactive states.
- **Tertiary (`#4338CA`):** A tailored, non-distracting deep indigo used sparingly for active reservation slots, vetted syndicate badges, and critical focus states.
- **Neutral Surface Canvas (`#F8FAFC` to `#FFFFFF`):** A soft off-white surface that eliminates eye fatigue while maintaining dynamic range across card elevations.

### Surface & Border Tiers
- **Base Background:** `#F8FAFC`
- **Elevated Canvas / Cards:** `#FFFFFF` (with `backdrop-filter: blur(20px)` and 75–85% alpha when hovering over dynamic feeds).
- **Hairline Dividers:** `rgba(15, 23, 42, 0.06)` for subtle separations.
- **Structural Outlines:** `rgba(15, 23, 42, 0.08)` to `rgba(15, 23, 42, 0.14)` for crisp component contours.
- **Status Accents:** Emerald (`#059669`) strictly for verified investor verification badges and real-time live video advisory states.

## Typography

Typographic choices mimic the rhythm and legibility of Apple's system typography using Plus Jakarta Sans. Its clean geometry, crisp apertures, and balanced x-height ensure legibility across multi-column mentor matrices, deal flow notes, and schedule calendars.

- **Tracking Rules:** Tighter tracking is enforced on larger headlines (`-0.03em` down to `-0.01em`) to replicate executive display precision. Metadata, section tags, and upper-case tracker labels use wide tracking (`+0.06em`).
- **Hierarchy Structure:** Body content never drops below 13px to preserve readability during advisory intake. Numeric metrics (investment tickets, mentor hours, valuation indicators) are set with tabular figures where applicable to align clean financial and session listings.

## Layout & Spacing

The layout model is anchored by an 8-point spatial cadence within a constrained 1200px max-width viewport. This restriction creates a focused reading and review experience, avoiding stretched or disparate dashboard layouts common in corporate portals.

### Breakpoints & Adaptive Model
- **Desktop (1024px+):** 12-column layout with 24px (`space-lg`) gutters. Dedicated 320px column for quick filters, mentor slot bookings, and real-time agenda status.
- **Tablet (768px – 1023px):** 8-column layout with 20px gutters. Dual-pane view reflows into single stacked containers with horizontal tab bar pagination.
- **Mobile (320px – 767px):** 4-column layout with 16px (`space-md`) outer margins. Booking actions dock persistently to the bottom edge with a frosted glass navigation shelf.

### Layout Principles
Vertical rhythm prioritizes breathing room around executive biographies and schedule allocations, maintaining at least 32px (`space-xl`) between distinct contextual modules.

## Elevation & Depth

Visual depth follows an Apple-inspired glass-and-layer doctrine: structure is communicated via surface lightness and perimeter definition rather than heavy, muddy drop shadows.

### Layer Hierarchy
1. **Base Layer (`Level 0`):** `#F8FAFC` raw background canvas.
2. **Elevated Surface (`Level 1`):** `#FFFFFF` with an ultra-thin 1px border rendered in `rgba(15, 23, 42, 0.06)`. Subtle ambient grounding: `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.015)`.
3. **Floating Overlays & Menus (`Level 2`):** `rgba(255, 255, 255, 0.82)` with `backdrop-filter: blur(24px) saturate(180%)`, framed by a 1px border `rgba(15, 23, 42, 0.08)` and shadow `0 12px 32px rgba(15, 23, 42, 0.06)`.
4. **Modal Panels & Booking Sheets (`Level 3`):** `#FFFFFF` framed by `rgba(15, 23, 42, 0.12)`, supported by `0 24px 48px -12px rgba(15, 23, 42, 0.12)`.

### Border Discipline
Borders are never thicker than 1 physical pixel. They provide optical structure between stacked cards without adding visual weight.

## Shapes

The interface adopts soft, continuous squircle geometry aligned with standard Cupertino corner radii. 

- **Containers & Mentor Cards:** 1rem (16px) radius for outer module shells, establishing a tactile, approachable container.
- **Interactive Elements & Input Fields:** 0.625rem (10px) to 0.75rem (12px) for structured fields, buttons, and calendar day selectors.
- **Badges & Meta Pills:** Full pill format (`border-radius: 9999px`) to separate categorical tags (e.g., "Series A", "DeepTech", "Ex-Founder") from interactive rectangular triggers.
- **Inner Nesting Rule:** Inner items (such as avatar frames or nested metric chips) maintain a concentric relationship: `Inner Radius = Outer Radius - Padding`.

## Components

### Buttons
- **Primary Action (Book Advisory / Confirm Investment):** Solid `#090A0D` background, `#FFFFFF` text, 0.625rem (10px) border-radius, micro-stroke `1px solid rgba(255, 255, 255, 0.12)` inset. Hover subtly decreases opacity to 90% with a slight `-1px` vertical lift; active press scales gently to `0.985`.
- **Secondary Action (View Bio / Download Pitch):** Translucent background `rgba(15, 23, 42, 0.03)`, hairline border `1px solid rgba(15, 23, 42, 0.08)`, `#090A0D` text. Hover shifts background to `rgba(15, 23, 42, 0.06)`.
- **Ghost/Tertiary:** No background, zero border, indigo `#4338CA` or slate `#475569` text with an underline animation on hover.

### Delicate Pill Badges
- **Investor & Mentor Track Chips:** Full pill radius, 4px vertical padding, 10px horizontal padding. Subtle neutral background `rgba(15, 23, 42, 0.04)`, `1px solid rgba(15, 23, 42, 0.07)` border, 12px Plus Jakarta Sans label.
- **Active / Verified Variant:** Background `rgba(67, 56, 202, 0.05)`, border `1px solid rgba(67, 56, 202, 0.18)`, text `#4338CA`.

### Mentor & Advisory Cards
- Composed of a solid `#FFFFFF` surface with an outer 1px hairline border in `rgba(15, 23, 42, 0.07)`.
- Features an integrated 48px rounded squircle advisor headshot, verified credential badge, quick bio, and horizontal pill carousel of expertise areas.
- Hover states introduce an ultra-subtle diffuse elevation (`0 8px 24px rgba(15, 23, 42, 0.04)`) and transitions the border tint to `rgba(15, 23, 42, 0.14)`.

### Input Fields & Selectors
- Height fixed at 44px for optimal touch and cursor ergonomics.
- Surface fill is `rgba(248, 250, 252, 0.7)` on rest, moving to `#FFFFFF` on focus.
- Resting border is `1px solid rgba(15, 23, 42, 0.1)`. Focus state drops a concentric 3px outer ring: `0 0 0 3px rgba(67, 56, 202, 0.1)` with a border tint of `#4338CA`.
- Placeholder text is set at `#94A3B8`.

### Checkboxes & Radio Controls
- Radio elements use a concentric dual-ring circle (18px) with an indigo dot on active state.
- Checkbox fields use a 4px rounded squircle, filling with `#090A0D` when checked and displaying a crisp white 1.5px checkmark vector.

### Advisory Slot Matrix (Calendar Module)
- Grid-based calendar pills displaying available 1-on-1 windows.
- Inactive/Available: White surface, `1px solid rgba(15, 23, 42, 0.08)` border, dark slate text.
- Selected: Deep obsidian `#090A0D` background with crisp white typography and immediate sub-label displaying duration and format (e.g., "30m Video").