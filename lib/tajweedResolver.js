import { TAJWEED_OVERRIDES } from '@/lib/tajweedOverrides';

/**
 * Tajweed state constants — 3 distinct cases for UI rendering.
 *
 *   'tajweed'     — data available, colored segments to display
 *   'no_rule'     — ayat covered, reads naturally, no rule to highlight
 *   'unavailable' — no data at all for this ayat
 */
export const TAJWEED_STATE = {
  TAJWEED:     'tajweed',
  NO_RULE:     'no_rule',
  UNAVAILABLE: 'unavailable',
};

/**
 * Resolves the tajweed data for a given surah/ayah.
 *
 * Priority: manual override > auto-generated > unavailable
 *
 * @param {string|number} surah
 * @param {string|number} ayah
 * @param {object} generatedTajweed — the parsed quran_tajweed.json object
 * @returns {{ tajweedSegments: Array|null, tajweedState: string }}
 */
export function resolveTajweed(surah, ayah, generatedTajweed) {
  const key = `${surah}_${ayah}`;
  const override = TAJWEED_OVERRIDES[key];

  if (override !== undefined) {
    // Enriched format: { type, segments }
    if (override !== null && typeof override === 'object' && !Array.isArray(override)) {
      const state = override.type === 'no_rule' ? TAJWEED_STATE.NO_RULE : TAJWEED_STATE.TAJWEED;
      return { tajweedSegments: override.segments ?? null, tajweedState: state };
    }
    // Legacy format: raw array (backward-compatible)
    if (Array.isArray(override)) {
      return { tajweedSegments: override, tajweedState: TAJWEED_STATE.TAJWEED };
    }
  }

  // Auto-generated data
  const generated = generatedTajweed?.[key] ?? null;
  if (generated !== null) {
    return { tajweedSegments: generated, tajweedState: TAJWEED_STATE.TAJWEED };
  }

  return { tajweedSegments: null, tajweedState: TAJWEED_STATE.UNAVAILABLE };
}
