// src/lib/icon-tokens.ts

/**
 * Enterprise Icon Design Tokens
 * Digunakan untuk standarisasi ikon di seluruh aplikasi (Sidebar, Nav, dsb).
 * Mengikuti filosofi desain Linear, Stripe, dan Vercel.
 */
export const IconTokens = {
  size: {
    desktop: 20,
    tablet: 20,
    mobile: 18,
  },

  // Stroke standar untuk kesan premium & clean
  strokeWidth: 1.75,

  color: {
    // Normal / Inactive
    default: "#64748B",
    // Hover state
    hover: "#475569",
    // Active state (Primary Brand Color)
    active: "var(--primary)",
  },

  // Transisi halus namun responsif
  transition: "180ms ease-out",
};
