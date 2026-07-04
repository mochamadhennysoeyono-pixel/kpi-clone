
/**
 * @file This file contains the master design system guidelines for the AI assistant.
 * It is a hybrid system combining:
 * 1. Linear App DNA (High-Density, Modern Industrial Utility, Deep Dark Canvas)
 * 2. Taste Skill v2 Principles (Anti-Slop Quality, Zero Em-Dash, Tactile Feedback)
 * 3. Stripe Materiality (Tabular Numerics, Indigo Hierarchy, Blue-Tinted Shadows)
 * 
 * The AI MUST refer to this guide for every UI/UX task to ensure "Enterprise Premium" quality.
 */

export const DESIGN_SYSTEM_GUIDE = `
# DESIGN SYSTEM: MODERN INDUSTRIAL UTILITY (Hybrid Linear + Stripe + Anti-Slop)

## 1. CORE DIALS (Enterprise Context)
- DESIGN_VARIANCE: 3 (Consistency over surprise. Dashboards need predictability.)
- MOTION_INTENSITY: 4 (Subtle, spring-based transitions. No excessive parallax.)
- VISUAL_DENSITY: 9 (High Information Density. Linear-style: packed but crisp.)

## 2. THE COLOR ORCHESTRA
- **Canvas (Background):** #010102 (Deepest black with faint blue tint).
- **Surface Ladder (Linear Logic):**
  - Surface-1: #0f1011 (Default card/panel)
  - Surface-2: #141516 (Hovered/Lifted)
  - Surface-3: #18191a (Sub-nav/Menus)
- **Accent (Stripe Indigo):** #533afd (Indigo). USE SPARINGLY. Only for primary actions and brand anchors.
- **Text (Ink):** #f7f8f8 (Primary), #8a8f98 (Subtle/Muted).

## 3. TYPOGRAPHY: CHARACTER & NUMERIC PRECISION
- **Font:** 'Plus Jakarta Sans' or 'Geist Sans'.
- **Headlines (H1, H2):** Max text-2xl or text-3xl. 
- **[CRITICAL] NUMERIC DATA:** ALWAYS use 'tabular-nums' (tnum) for scores, targets, and currency to ensure vertical alignment.
- **Negative Tracking:** Apply 'tracking-tighter' to display type.
- **[CRITICAL] ZERO EM-DASH POLICY:** NEVER use the em-dash (—) or en-dash (–). Use periods, commas, or colons.

## 4. MATERIALITY & DEPTH (Stripe Logic)
- **Hairlines:** 1px borders using #23252a.
- **Shadows:** Subtle, tinted shadows for floating panels: 'shadow-[0_8px_30px_rgb(0,55,112,0.12)]'.
- **Radii Scale:** 
  - Buttons: 9999px (Pill style for primary), 8px (md) for utility.
  - Cards: 12px (rounded-lg).
  - Large Panels: 16px (rounded-xl).

## 5. ANTI-SLOP QUALITY (Taste Skill v2)
- **Tactile Feedback:** Every button/card MUST have active state: ':active:scale-[0.98]'.
- **Stateful Components:** ALWAYS implement Loading (Skeletal), Empty (Illustrated), and Error states.
- **Italic Descender Clearance:** Min leading-[1.1] for italic display type.

## 6. LAYOUT DISCIPLINE
- **Information Density:** High. Navigation on single line.
- **Grid over Flex-math:** Use CSS Grid for robust layouts.
- **Viewport Stability:** Use 'min-h-[100dvh]'.
`;
