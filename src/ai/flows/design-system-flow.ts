
// src/ai/flows/design-system-flow.ts

/**
 * @file This file contains the master design system guidelines for the AI assistant.
 * It is based on the "High-Agency Frontend Skill" (Taste Skill v1) to ensure
 * all generated UI is premium, consistent, and "anti-slop".
 * The AI MUST refer to this guide for every UI/UX task.
 */

export const TASTE_SKILL_DESIGN_GUIDE = `
# DESIGN SYSTEM & UI/UX COOKBOOK (Based on Taste Skill v1)

## 1. CORE PHILOSOPHY
- **Goal:** To create UIs that are high-end, clean, functional, and visually striking. Avoid "AI Slop" (generic, boring, predictable designs).
- **Primary Directives:**
  - DESIGN_VARIANCE: 8 (Default to asymmetric and interesting layouts)
  - MOTION_INTENSITY: 6 (Default to fluid, physics-based animations)
  - VISUAL_DENSITY: 4 (Default to airy, "art gallery" spacing)

## 2. LAYOUT & SPACING: THE "ANTI-SLOP" FOUNDATION
- **[CRITICAL] ANTI-CENTER BIAS:** Centered layouts for main sections (like Heroes) are BANNED.
  - **ALWAYS USE:** "Split Screen" (50/50), "Left-aligned content / Right-aligned asset", or other asymmetric structures.
- **[CRITICAL] VIEWPORT STABILITY:** NEVER use \`h-screen\`. ALWAYS use \`min-h-[100dvh]\` for full-height sections to prevent layout jumps on mobile.
- **GRID OVER FLEX-MATH:** NEVER use complex flex calculations like \`w-[calc(...)]\`. ALWAYS use CSS Grid (`grid grid-cols-3`) for robust, predictable layouts.
- **CONTAINMENT:** Main page layouts MUST be contained with \`max-w-7xl mx-auto\` (or similar) to ensure consistency on large screens.
- **SPACING:** Default to generous spacing. Let elements breathe. Use padding of \`p-8\` or \`p-10\` inside containers and large gaps (`gap-6`, `gap-8`) between elements.

## 3. TYPOGRAPHY: HIERARCHY & CHARACTER
- **[BANNED FONT] NO \`Inter\`:** Do not use the Inter font. This project uses 'Plus Jakarta Sans'.
- **HEADLINES (h1, h2):** MUST be large and impactful.
  - **Default Style:** \`text-4xl md:text-5xl font-bold tracking-tighter leading-none\`
- **BODY (p):** MUST be clean and highly readable.
  - **Default Style:** \`text-base text-slate-600 leading-relaxed max-w-[65ch]\`
- **SERIF FONTS:** Strictly BANNED for Dashboard or any software UI context.

## 4. COLOR: NEUTRAL BASE + SINGLE BOLD ACCENT
- **[CRITICAL] THE LILA BAN:** The generic "AI Purple/Blue" aesthetic is STRICTLY BANNED. No purple/blue button glows, no neon gradients.
- **PALETTE:**
  - **Base:** Use a neutral palette (e.g., \`slate\`, \`zinc\`). Backgrounds are typically white or very light gray (`#f9fafb`).
  - **Accent:** Use a SINGLE, high-contrast accent color for primary actions (buttons, links). Example: a strong black, emerald, or deep rose.
- **CONSISTENCY:** Stick to ONE palette. Do not mix warm and cool grays.
- **NO PURE BLACK:** Never use \`#000000\`. Use an off-black like \`slate-900\` or \`zinc-950\`.

## 5. INTERACTIVITY & MOTION
- **TACTILE FEEDBACK:** All interactive elements (buttons, cards) MUST have a physical-feeling active state.
  - **Implementation:** Use \`:active:scale-[0.98]\` or \`:active:-translate-y-px\`.
- **STATEFUL COMPONENTS:** You MUST implement all states for interactive components:
  - **Loading:** Use skeletal loaders that match the final layout shape. NO generic spinners.
  - **Empty:** Design a beautiful empty state with a call to action.
  - **Error:** Provide clear, inline error messages.
- **ANIMATION:** Use physics-based springs (`type: "spring"`), not linear easing. Animate \`transform\` and \`opacity\`, never \`width\`, \`height\`, \`top\`, or \`left\`.

## 6. COMPONENTS & SHADCN/UI
- **NO GENERIC CARDS:** Avoid wrapping everything in a card. Use whitespace, \`border-t\`, or \`divide-y\` to group elements. Cards are ONLY for communicating hierarchy (elevation).
- **SHADCN/UI CUSTOMIZATION:** You may use \`shadcn/ui\` components, but NEVER in their default state. You MUST customize them (colors, radii, shadows) to match this high-end design system. For example, change the default blue primary button to our specified accent color (e.g., black).

## 7. FORBIDDEN PATTERNS ("AI TELLS")
- **NO EMOJIS:** Emojis are BANNED from all UI text and content. Use high-quality icons (\`@phosphor-icons/react\`).
- **NO GENERIC 3-COLUMN LAYOUTS:** The "3 equal cards" row is BANNED. Use a 2-column zig-zag or asymmetric grid.
- **NO GENERIC CONTENT:** No "John Doe", "Acme Corp", "99.99%". Use creative, realistic-sounding data.

This guide is the single source of truth for all frontend development.
`;
