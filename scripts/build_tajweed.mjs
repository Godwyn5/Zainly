/**
 * build_tajweed.mjs
 * Fetches tajweed annotation JSON from semarketir/quranjson for:
 *   - Surah 1 (Al-Fatiha)
 *   - Surahs 78–114 (Juz 30)
 * Converts {start, end, rule} index-based annotations into {text, rule} segments
 * using the Arabic text from quran.json (which uses the same Tanzil Uthmani encoding).
 *
 * Output: public/data/quran_tajweed.json
 *   {
 *     "<surah>_<ayah>": [{ text, rule }, ...]
 *   }
 *
 * Rule mapping: raw source rules → Zainly canonical rules (or null to hide color)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const require = createRequire(import.meta.url);

// ── Load quran.json ──────────────────────────────────────────────────────────
const quran = require(join(ROOT, 'public/data/quran.json'));

// ── Rule mapping: source → Zainly TAJWEED_COLORS keys ───────────────────────
// Unmapped rules get null (renders in default color, not highlighted)
const RULE_MAP = {
  madd_2:              'madd',
  madd_246:            'madd',
  madd_6:              'madd',
  madd_muttasil:       'madd',
  madd_munfasil:       'madd',
  madd_lazim:          'madd',
  ghunnah:             'ghunna',
  ikhfa:               'ikhfa',
  ikhfa_shafawi:       'ikhfa',
  idghaam_ghunnah:     'idgham',
  idghaam_no_ghunnah:  'idgham',
  idghaam_mutaqaribain:'idgham',
  idghaam_shafawi:     'idgham',
  qalqalah:            'qalqala',
  // Purely recitation marks — not colored (null = default color)
  hamzat_wasl:         null,
  lam_shamsiyyah:      null,
  silent:              null,
  ghayb:               null,
};

function mapRule(raw) {
  if (raw in RULE_MAP) return RULE_MAP[raw];
  return null;
}

/**
 * Convert index-based annotations into text segments.
 * Annotations are non-overlapping and sorted by start.
 * Gaps between annotations become {text, rule: null} segments.
 */
function buildSegments(text, annotations) {
  const chars = [...text]; // Unicode-safe split
  const total = chars.length;
  const sorted = [...annotations].sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;

  for (const ann of sorted) {
    const s = ann.start;
    const e = ann.end; // exclusive in source
    if (s > cursor) {
      // Gap before this annotation
      segments.push({ text: chars.slice(cursor, s).join(''), rule: null });
    }
    if (s < e && e <= total) {
      segments.push({ text: chars.slice(s, e).join(''), rule: mapRule(ann.rule) });
    }
    cursor = e;
  }

  if (cursor < total) {
    segments.push({ text: chars.slice(cursor).join(''), rule: null });
  }

  // Merge adjacent segments with the same rule to avoid micro-fragments
  const merged = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.rule === seg.rule) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

// ── Fetch helper ─────────────────────────────────────────────────────────────
async function fetchTajweed(surahNum) {
  const idx = String(surahNum).padStart(3, '0');
  const url = `https://raw.githubusercontent.com/semarketir/quranjson/master/source/tajweed/surah_${surahNum}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for surah ${surahNum}`);
  return res.json();
}

// ── Build output ─────────────────────────────────────────────────────────────
const output = {};

const SURAHS_TO_PROCESS = [
  1,                                              // Al-Fatiha
  ...Array.from({ length: 37 }, (_, i) => 78 + i) // 78–114 (Juz 30)
];

console.log(`Processing ${SURAHS_TO_PROCESS.length} surahs...`);

for (const surahNum of SURAHS_TO_PROCESS) {
  process.stdout.write(`  Surah ${surahNum}... `);

  let tajData;
  try {
    tajData = await fetchTajweed(surahNum);
  } catch (e) {
    console.log(`SKIP (fetch error: ${e.message})`);
    continue;
  }

  const surahVerses = quran[surahNum - 1]?.verses ?? [];
  const verseData   = tajData.verse ?? {};

  // Determine verse key offset:
  // Surah 1: keys are verse_1..verse_7  → ayah id = key number
  // Surah 78+: keys are verse_0..verse_N where verse_0 = bismillah (skip), verse_1 = ayah 1
  // Safe approach: try key "verse_{ayah.id}" first, then "verse_{ayah.id - 1}"
  for (const verse of surahVerses) {
    const ayahId = verse.id;
    const text   = verse.text;
    if (!text) continue;

    // Surah 1: verse keys are 1-indexed (verse_1..verse_7) → matches ayah id directly
    // Surah 78+: verse_0 = bismillah (not in quran.json), verse_1 = ayah 1, etc. → also matches ayah id
    let rawAnnotations = verseData[`verse_${ayahId}`] ?? null;
    if (rawAnnotations == null) continue;

    const textLen = [...text].length;

    // Filter annotations to only those fully within the text bounds.
    // The semarketir source sometimes indexes relative to a bismillah-prepended string,
    // causing out-of-range indices for short ayahs. We skip those.
    const annotations = rawAnnotations.filter(a => a.start >= 0 && a.end <= textLen && a.start < a.end);

    if (annotations.length === 0) continue;

    const segs = buildSegments(text, annotations);

    // Only store if there's at least one colored segment (otherwise fallback is identical)
    const hasColor = segs.some(s => s.rule !== null);
    if (hasColor) {
      output[`${surahNum}_${ayahId}`] = segs;
    }
  }

  const stored = Object.keys(output).filter(k => k.startsWith(`${surahNum}_`)).length;
  console.log(`${stored}/${surahVerses.length} ayats colored`);
}

// ── Write output ─────────────────────────────────────────────────────────────
const outPath = join(ROOT, 'public/data/quran_tajweed.json');
writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
const keys = Object.keys(output).length;
console.log(`\nDone! ${keys} ayats written to public/data/quran_tajweed.json`);
