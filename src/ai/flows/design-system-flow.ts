
/**
 * @file This file contains the master design system guidelines for the AI assistant.
 * It is a hybrid system combining:
 * 1. Linear App DNA (High-Density, Modern Industrial Utility, Deep Dark Canvas)
 * 2. Taste Skill v2 Principles (Anti-Slop Quality, Zero Em-Dash, Tactile Feedback)
 * 
 * The AI MUST refer to this guide for every UI/UX task to ensure "Enterprise Premium" quality.
 */

export const DESIGN_SYSTEM_GUIDE = `
# DESIGN SYSTEM: MODERN INDUSTRIAL UTILITY (Hybrid Linear + Anti-Slop)

## 1. CORE DIALS (Enterprise Context)
- DESIGN_VARIANCE: 3 (Consistency over surprise. Dashboards need predictability.)
- MOTION_INTENSITY: 4 (Subtle, spring-based transitions. No excessive parallax.)
- VISUAL_DENSITY: 9 (High Information Density. Linear-style: packed but crisp.)

## 2. THE LINEAR PALETTE (Deep Dark Canvas)
- **Canvas (Background):** #010102 (Deepest black with faint blue tint).
- **Surface Ladder (Hierarchy without shadow):**
  - Surface-1: #0f1011 (Default card/panel)
  - Surface-2: #141516 (Hovered/Lifted)
  - Surface-3: #18191a (Sub-nav/Menus)
- **Hairlines:** 1px borders using #23252a (Hairline) to #34343a (Strong).
- **Accent:** Lavender-Blue #5e6ad2. USE SPARINGLY. Only for brand, focus, and primary CTAs.
- **Text (Ink):** #f7f8f8 (Primary), #8a8f98 (Subtle/Muted).

## 3. TYPOGRAPHY: CHARACTER & PRECISION
- **Font:** 'Plus Jakarta Sans' or 'Geist Sans'.
- **Headlines (H1, H2):** Scale down for Apps. Max text-2xl or text-3xl for page titles.
- **The Negative Track:** Apply 'tracking-tighter' or 'tracking-[-0.05em]' to display type to mimic Linear's "Software-Craft" look.
- **Eyebrows:** Use positive tracking (+0.1em) and mono font for taxonomy/labels.
- **[CRITICAL] ZERO EM-DASH POLICY:** NEVER use the em-dash (—) or en-dash (–). Use periods, commas, or colons. Rewrite sentences to avoid them.

## 4. MATERIALITY & SHAPES
- **Borders over Shadows:** Depth is carried by the surface ladder + hairline borders. Avoid heavy drop shadows.
- **Radii Scale:** 
  - Buttons/Inputs: 8px (rounded-md)
  - Cards: 12px (rounded-lg)
  - Large Panels: 16px (rounded-xl)
- **Consistency:** Use ONE radius system. No pill buttons in a square layout.

## 5. ANTI-SLOP QUALITY (Taste Skill v2)
- **Tactile Feedback:** Every button/card MUST have active state: ':active:scale-[0.98]'.
- **Stateful Components:** ALWAYS implement:
  - Loading: Skeletal loaders matching layout shape.
  - Empty: Beautifully composed with a clear CTA.
  - Error: Inline and functional.
- **No AI Clichés:** No AI-purple mesh gradients, no centered heroes, no generic "Three-Column-Cards".
- **Italic Descender Clearance:** Ensure leading-[1.1] min for italic display type to prevent clipping 'y, g, j, p, q'.

## 6. LAYOUT DISCIPLINE
- **Information Density:** Prioritize data visibility. Navigation on a single line.
- **Grid over Flex-math:** Use CSS Grid for robust layouts.
- **Viewport Stability:** Use 'min-h-[100dvh]', never 'h-screen'.
`;
