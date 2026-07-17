# Glass Skincare Design System

This document serves as the single source of truth for the application's design system, replacing all previous legacy (dark theme) tokens. All UI elements must strictly adhere to this monochromatic, editorial palette with a single iridescent champagne bronze accent.

## Token Mapping

| Category | HTML CSS Variable | NativeWind / RN Token | Hex / Value | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Surfaces** | `--bg` | `bg-background` | `#F6F2EE` | Primary app background (warm porcelain). |
| | `--bg-2` | `bg-surface` | `#EFE8E1` | Secondary surfaces, cards, interactive backgrounds (soft sand). |
| | `--ink` | `text-ink` | `#0B0B0C` | Primary text, headers (near black). |
| | `--ink-2` | `text-ink-light` | `#1A1A1D` | Secondary text, subtle emphasis. |
| | `--muted` | `text-muted` | `#6B6660` | Muted text, eyebrows, placeholders (warm grey). |
| | `--line` | `border-line` | `rgba(11, 11, 12, 0.08)` | Dividers, subtle borders, hairlines. |
| **Accent** | `--accent` | `text-accent`, `bg-accent` | `#8E5D34` | Primary interactive elements, buttons, active states (champagne bronze). |
| | `--accent-soft` | `text-accent-soft` | `#D9B79A` | Hover states, secondary accents. |
| | `--accent-glow` | `shadow-accent-glow` | `rgba(176, 122, 74, 0.22)` | Focus rings, soft active shadows. |
| **Glass** | `--glass` | `bg-white/42` | `rgba(255, 255, 255, 0.42)` | Glassmorphism base layer (modals, overlays). |
| | `--glass-2` | `bg-white/62` | `rgba(255, 255, 255, 0.62)` | Frosted glass layer (headers, sticky navigation). |
| | `--glass-edge` | `border-white/70` | `rgba(255, 255, 255, 0.70)` | Inner borders and highlights for glass panels. |
| | `--glass-shadow` | `tokens.shadows.glass` | `0 30px 60px -30px rgba(11,11,12,.25), 0 2px 0 rgba(255,255,255,.6) inset` | Depth shadow for glass panels. |
| **Typography** | `--serif` | `font-display` | `Raleway` | Wordmarks, display headings, heavy weight emphasis. |
| | `--sans` | `font-sans` | `Inter` | Body copy, eyebrows, buttons, general UI. |
| | `--italic` | `font-italic` | `Playfair Display` | Editorial accents, subheadings. |
| **Layout** | `--maxw` | `max-w-screen-xl` | `1440px` | Maximum content width constraint on web. |
| | `--pad` | `tokens.spacing.pad` | `24px` (RN scaling) | Outer screen padding. |
| | `--gutter` | `tokens.spacing.gutter` | `16px` (RN scaling) | Inner component gap/gutter. |

## Platform Implementation Notes

### Glassmorphism & Blurs
React Native supports native blur via `expo-blur` (`BlurView`). 
- **iOS & Web**: Supports robust, real-time background blurring (via UIVisualEffectView and CSS `backdrop-filter`).
- **Android**: True blur is supported on Android 12+ via `RenderEffect`. For older Android versions (< 12), `expo-blur` may fall back to a semi-opaque solid tint or standard transparent overlay. 
- **Fallback Rule**: Ensure that content underneath a `BlurView` maintains sufficient contrast, and use the explicit `rgba` opacity values (e.g., `rgba(255, 255, 255, 0.62)`) as the `backgroundColor` on the container so that it remains usable as a semi-transparent layer even if the heavy blur effect gracefully degrades.
