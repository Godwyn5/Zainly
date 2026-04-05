// Tajweed rule → color mapping — premium, muted palette (not "children's mushaf")
export const TAJWEED_COLORS = {
  madd:    '#2E7D9A', // elongation — calm blue
  ghunna:  '#6B8E5A', // nasalization — muted green
  ikhfa:   '#9B6B3A', // concealment — warm amber-brown
  idgham:  '#7B5EA7', // assimilation — soft purple
  qalqala: '#B8962E', // echoing — gold (matches app accent)
  default: '#163026', // normal text — app primary
};

/**
 * Returns the color for a given tajweed rule.
 * Falls back to TAJWEED_COLORS.default for null or unknown rules.
 */
export function tajweedColor(rule) {
  if (!rule) return TAJWEED_COLORS.default;
  return TAJWEED_COLORS[rule] ?? TAJWEED_COLORS.default;
}
