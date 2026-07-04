
/**
 * @file This file contains the master design system guidelines for the AI assistant.
 * It is a hybrid system combining:
 * 1. Linear App DNA (High-Density, Modern Industrial Utility, Deep Dark Canvas)
 * 2. Taste Skill v2 Principles (Anti-Slop Quality, Zero Em-Dash, Tactile Feedback)
 * 3. Stripe Materiality (Tabular Numerics, Indigo Hierarchy, Blue-Tinted Shadows)
 * 4. Vercel Engineering (Geist Sans, Technical Mono Labels, System States)
 * 
 * The AI MUST refer to this guide for every UI/UX task to ensure "Enterprise Premium" quality.
 */

export const DESIGN_SYSTEM_GUIDE = `
# DESIGN SYSTEM: MODERN INDUSTRIAL UTILITY (Hybrid Linear + Stripe + Vercel + Anti-Slop)

## 1. CORE DIALS (Enterprise Context)
- DESIGN_VARIANCE: 2 (Predictable hierarchy for productivity)
- MOTION_INTENSITY: 3 (Subtle, purposeful transitions. No fluff.)
- VISUAL_DENSITY: 9 (High Information Density. Linear-style: packed but crisp.)

## 2. THE COLOR ORCHESTRA (Linear + Stripe)
- **Canvas (Background):** #010102 (Deepest black with faint blue tint).
- **Surface Ladder (Linear Logic):**
  - Surface-1: #0f1011 (Default card/panel)
  - Surface-2: #141516 (Hovered/Lifted)
  - Surface-3: #18191a (Sub-nav/Menus)
  - Surface-4: #191a1b (Deepest lift)
- **Accent (Stripe Indigo):** #533afd (Electric Indigo). USE SCARCELY. One primary action per area.
- **Text (Ink):** #f7f8f8 (Primary), #8a8f98 (Subtle/Muted), #62666d (Disabled/Footnotes).

## 3. TYPOGRAPHY: CHARACTER & NUMERIC PRECISION (Vercel + Stripe)
- **Font:** 'Geist Sans' (Geometric, sentence-case, period-terminated headlines).
- **[CRITICAL] NUMERIC DATA:** ALWAYS use 'tabular-nums' (tnum) for scores, targets, and currency (Stripe logic).
- **Negative Tracking:** Apply 'tracking-tighter' to display type (Linear logic).
- **Technical Labels:** Use 'Geist Mono' for eyebrows, code, and metadata labels.
- **[CRITICAL] ZERO EM-DASH POLICY:** NEVER use the em-dash (—) or en-dash (–). Use periods, commas, or colons.

## 4. MATERIALITY & DEPTH (Linear Hairlines + Stripe Shadows)
- **Hairlines:** 1px borders using #23252a instead of heavy shadows for default elements.
- **Subtle Depth:** Use Stripe-style tinted shadows ONLY for floating elements: 'shadow-[0_8px_30px_rgb(0,55,112,0.12)]'.
- **Radii Scale:** 
  - Buttons: 8px (md) for utility, 9999px (pill) for marketing CTAs.
  - Cards: 12px (rounded-lg).
  - Modal/Large Panels: 16px (rounded-xl).

## 5. ANTI-SLOP QUALITY (Taste Skill v2)
- **Tactile Feedback:** Every button/card MUST have active state: ':active:scale-[0.98]'.
- **Stateful Components:** ALWAYS implement Loading (Skeletal), Empty (Illustrated), and Error states.
- **Italic Descender Clearance:** Min leading-[1.1] for italic display type.

## 6. LAYOUT DISCIPLINE
- **Information Density:** High. Navigation on single line.
- **Grid over Flex-math:** Use CSS Grid for robust, predictable layouts.
- **Viewport Stability:** Use 'min-h-[100dvh]' instead of 'h-screen'.
`;
