/**
 * @file This file contains the master design system guidelines for the AI assistant.
 * It is a hybrid system combining:
 * 1. Linear App DNA (High-Density, Modern Industrial Utility)
 * 2. Taste Skill v2 Principles (Anti-Slop Quality, Zero Em-Dash, Tactile Feedback)
 * 3. Stripe Materiality (Tabular Numerics, Indigo Hierarchy, Soft Shadows)
 * 4. Vercel Engineering (Geist Sans, Technical Mono Labels, Clean Light Canvas)
 * 
 * The AI MUST refer to this guide for every UI/UX task to ensure "Enterprise Premium" quality.
 */

export const DESIGN_SYSTEM_GUIDE = `
# DESIGN SYSTEM: MODERN INDUSTRIAL UTILITY (Clean Light Mode Edition)

## 1. CORE DIALS
- DESIGN_VARIANCE: 2 (Predictable and consistent hierarchy)
- MOTION_INTENSITY: 4 (Smooth, purposeful transitions)
- VISUAL_DENSITY: 9 (High Information Density for maximum productivity)

## 2. THE COLOR ORCHESTRA
- **Canvas (Background):** #ffffff (Pure white).
- **Surface Ladder (Light Edition):**
  - Surface-1: #fafafa (Default subtle backgrounds/panels)
  - Surface-2: #f5f5f5 (Hovered states)
  - Surface-3: #ebebeb (Dividers/Borders)
- **Accent (Stripe Indigo):** #533afd (Electric Indigo). Used for focus and primary actions.
- **Text (Ink):** #171717 (Primary), #666666 (Muted), #a1a1a1 (Disabled).

## 3. TYPOGRAPHY: PRECISION & CLARITY
- **Font:** 'Geist Sans' (Geometric, sentence-case headlines).
- **[CRITICAL] NUMERIC DATA:** ALWAYS use 'tabular-nums' (tnum) for scores, targets, and currency.
- **Technical Labels:** Use 'Geist Mono' for timestamps, IDs, and metadata tags.
- **[CRITICAL] ZERO EM-DASH POLICY:** NEVER use the em-dash (—). Use periods or hyphens.

## 4. MATERIALITY & DEPTH
- **Hairlines:** 1px borders using #ebebeb for clean separation.
- **Subtle Depth:** Use Stripe-style tinted shadows for elevated elements: 'shadow-[0_8px_30px_rgb(0,55,112,0.08)]'.
- **Radii Scale:** 
  - Interactive: 8px (md) for buttons and inputs.
  - Containers: 12px (lg) for cards and sections.

## 5. ANTI-SLOP QUALITY
- **Tactile Feedback:** Every button MUST have active state: ':active:scale-[0.98]'.
- **Stateful Components:** ALWAYS implement Loading (Skeletal) and Empty (Illustrated) states.
- **Contrast Check:** Ensure dark ink text is clearly readable on light surfaces (Min 4.5:1).
`;