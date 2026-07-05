// src/lib/icon-tokens.ts

/**
 * Enterprise Icon Design Tokens
 * Digunakan untuk standarisasi ikon di seluruh aplikasi.
 * Mengikuti filosofi desain Linear dan Stripe.
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
    // Normal / Inactive (#64748B)
    default: "#64748B",
    // Hover state (#475569)
    hover: "#475569",
    // Active state (Primary Brand Blue)
    active: "#2563eb", 
  },

  // Transisi halus namun responsif
  transition: "180ms ease-out",
};
