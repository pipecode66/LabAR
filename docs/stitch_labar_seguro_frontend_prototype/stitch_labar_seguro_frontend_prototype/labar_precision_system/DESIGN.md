---
name: LabAR Precision System
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
  on-surface-variant: '#3d4947'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006194'
  on-tertiary: '#ffffff'
  tertiary-container: '#007bb9'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  display-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for applied academic technology, specifically augmented reality laboratory training in technical engineering education. The target audience centers on first- and second-year university students (such as Valentina, 19, taking basic circuits or physics laboratory) who face anxiety around safety hazards, short-circuits, and damaging physical instrumentation.

The design movement combines **Modern High-Clarity Corporate / Academic** with **Technical HUD Instrumentation**. It projects academic rigor, industrial safety, and technical exactitude without intimidation. By synthesizing clean structural framing with didactic feedback loops, the interface delivers confidence, immediate physical grounding, and cognitive safety.

Key visual attributes:
- **Calm Authority**: Scientific grounding via deep structural slates and pristine surfaces.
- **Fail-Safe Clarity**: Safety-critical states (overvoltage, polarity mismatch, short circuit) command visual priority through unambiguous color codings and dual visual redundancy (iconography + text).
- **Physical-Digital Alignment**: AR overlays employ crisp tactical reticles and collimated HUD indicators that mirror real instrument readouts and terminal connections.

## Colors

The palette establishes an ergonomic, fatigue-resistant laboratory canvas suited for indoor lab conditions and glare-prone mobile AR viewports.

- **Primary (`#0D9488` / `#14B8A6`)**: Precision Teal. Serves as the primary interactive and confirmation vector, signifying guided discovery, active selector dials, and normative circuit flow.
- **Secondary (`#0F172A` / `#1E293B`)**: Structural Deep Slate. Grounding chrome, primary headers, terminal leads context, and frame boundaries.
- **Tertiary (`#0284C7` / `#38BDF8`)**: Didactic Cyan/Blue. Highlights instructional cues, AR target alignment indicators, probe placement anchors, and active educational tooltips.
- **Neutral Canvas (`#F8FAFC` & `#F1F5F9`)**: Neutral Lab White and Cool Gray. Form the primary surface containers, ensuring high contrast against dark meter hardware and AR viewport letterboxing.
- **Semantic Safety System**:
  - **Success (`#16A34A`)**: Correct lead placement, stabilized measurement, closed loop confirmation.
  - **Caution / Warning (`#D97706` / `#F59E0B`)**: Range mismatch (e.g., dial set to 200m instead of 20V), floating probe, uncalibrated ground.
  - **Critical Hazard (`#DC2626` / `#EF4444`)**: Reverse polarity, lead inserted into current terminal (10A ADC) during voltage read, battery overload threshold.

Every functional element achieves WCAG 2.1 AA (contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large display elements and safety-critical glyphs).

## Typography

The typographic hierarchy implements **Inter** for all prose, structural headings, instructional modules, and feedback dialogues due to its tall x-height and exceptional legibility across optical scales.

For instrumentation, digital readouts, units (e.g., `V DC`, `COM`, `VΩmA`), tolerance indicators, and AR coordinate markers, the design system utilizes **JetBrains Mono**. This provides tabular spacing and technical precision that matches the DT-830B digital segment display and terminal legends.

Text scale adaptations:
- Display headings contract dynamically on mobile devices to prevent awkward hyphenation of technical terminology (`multímetro`, `calibración`, `cortocircuito`).
- Numerical simulation reads must utilize fixed-width figures (`font-variant-numeric: tabular-nums`) to prevent layout shifts during real-time value changes in the AR loop.

## Layout & Spacing

The layout operates on an 8pt base grid with a 4pt sub-grid for dense instrumentation badges, status ribbons, and toolbars.

Breakpoints:
- **Compact (Mobile: < 640px)**: 4 columns, 16px outer margins, 16px gutters. AR viewfinder occupies full viewport underlay with floating contextual bottom sheets and transparent top telemetry overlays.
- **Medium (Tablet: 640px - 1024px)**: 8 columns, 24px outer margins, 16px gutters. Split-screen orientation supporting real-time 3D meter inspection on the left and interactive task checklists on the right.
- **Expanded (Desktop: > 1024px)**: 12 columns, 40px outer margins, 24px gutters. Fixed 480px didactic step console adjacent to dynamic full-canvas AR simulation engine.

Interactive targets strictly respect a minimum touch area of 44x44px, particularly in AR control overlays where thumbs operate at device edges.

## Elevation & Depth

Visual hierarchy is maintained through subtle tonal layering combined with low-contrast structural borders, reserving active shadows for floating overlays:

- **Level 0 (Base Canvas)**: `#F8FAFC`. Zero elevation, matte background for didactic documentation.
- **Level 1 (Structural Cards & Modules)**: `#FFFFFF` surface framed by a solid `1px` border in `#E2E8F0`. No shadow is applied; structure is expressed strictly via tonal separation.
- **Level 2 (Active Dropdowns & Interactive Cards)**: `#FFFFFF` surface, border `1px` in `#CBD5E1`, with ambient shadow `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (AR HUD & Floating Panels)**: Glassmorphic translucent slate or white (`rgba(255, 255, 255, 0.88)` in light mode, `rgba(15, 23, 42, 0.82)` in camera-overlay mode) backed by `backdrop-filter: blur(12px)`, bordered by `1px` high-contrast stroke (`#94A3B8` or `#38BDF8`), accompanied by deep ambient shadow `0 12px 28px -4px rgba(15, 23, 42, 0.16)`.
- **Level 4 (Safety Modal Alerts)**: High-contrast modal container bordered by a `2px` stroke in semantic hazard red (`#DC2626`) or amber (`#D97706`), shadowed with tinted containment glow `0 20px 32px -8px rgba(220, 38, 38, 0.25)`.

## Shapes

The shape rhythm balances approachable modern product design with technical equipment geometry:

- **Standard Elements (Buttons, Inputs, Badges)**: Base radius of `8px` (`0.5rem`).
- **Cards & Didactic Containers**: `rounded-xl` (`16px` / `1rem`) and `rounded-2xl` (`24px` / `1.5rem`) for high-level step modules, ensuring a soft, non-intimidating posture for novice learners.
- **Instrument Display Elements (DT-830B LCD Bezel)**: `rounded-sm` (`4px` / `0.25rem`) to faithfully evoke technical equipment enclosures.
- **AR Calibration Markers & Floating Reticles**: Fully circular (`rounded-full`) outer rings framing inner orthogonal geometric targeting points.

## Components

### Buttons & Interactive Controls
- **Primary CTA**: Background `#0D9488`, text `#FFFFFF`, font-weight 600. Minimum height 48px (touch target ≥ 44x44px). Focus ring: `3px solid #14B8A6` with 2px offset.
- **Secondary CTA**: Structural border `1.5px solid #0F172A`, text `#0F172A`, background transparent.
- **Safety Critical Action**: Background `#DC2626`, text `#FFFFFF`. Used strictly for "Abort Simulation", "Cut Power", or "Reset High Voltage".
- **Tactile Dial Controls**: Rotary selectors provide audible/haptic feedback on mobile, displaying radial snap targets corresponding to standard DT-830B DCV ranges (`200m`, `2000m`, `20`, `200`, `1000`).

### Badges & Semantic Status Tags
- Badges must include both a contextual icon and explicit uppercase text (e.g., checkmark + `CORRECTO`, exclamation triangle + `PRECAUCIÓN`, shield alert + `PELIGRO: ALTA TENSIÓN`).
- **Structure**: Height 28px, border-radius 6px, font JetBrains Mono 12px weight 500.
- Color combinations strictly adhere to semantic intent:
  - Error/Hazard: `#FEF2F2` background, `#B91C1C` border, `#991B1B` text.
  - Caution: `#FFFBEB` background, `#D97706` border, `#B45309` text.
  - Normal/Success: `#F0FDF4` background, `#16A34A` border, `#15803D` text.
  - Informational: `#F0F9FF` background, `#0284C7` border, `#0369A1` text.

### Cards & Didactic Modules
- White backgrounds (`#FFFFFF`) with `rounded-xl` (16px) or `rounded-2xl` (24px) corners, framed by `1px solid #E2E8F0`.
- Top edge incorporates an optional 4px semantic status line (e.g., Teal for active phase, Amber for safety check required).
- Content layout enforces clear separation between didactic narrative (Inter Body-md) and instrument parameter readouts (JetBrains Mono tabular).

### Input Fields & Toggle Selectors
- Height 48px, rounded 8px, background `#F8FAFC`, border `1px solid #CBD5E1`.
- Active focus state triggers border color `#0D9488` with a 3px outer halo in `rgba(13, 148, 136, 0.20)`. Error state transitions border directly to `#DC2626`.

### AR Viewport HUD & Calibration Overlays
- **Reticle HUD**: Collimated cyan lines (`#0284C7`, opacity 85%) identifying target measurement points (battery cathode/anode).
- **Virtual Lead Anchors**: Distinct red (`#DC2626`) and black (`#0F172A`) cable trajectory guidelines with glowing snap targets to ensure unambiguous terminal matching (`VΩmA` vs `COM`).
- **LCD Mirror Display**: Digital overlay duplicating the virtual DT-830B segment screen in high-contrast monospaced font, guaranteeing legibility even when the 3D model is rotated or occluded.