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

// Unicode categories: diacritics and combining marks that should stay with their base letter
// Arabic diacritics range: U+0610–U+061A, U+064B–U+065F, U+0670, U+06D6–U+06DC, U+06DF–U+06E4, U+06E7–U+06E8, U+06EA–U+06ED
// Also includes tatweel U+0640, sukun, shadda, etc.
function isArabicDiacritic(cp) {
  return (cp >= 0x0610 && cp <= 0x061A) ||
         (cp >= 0x064B && cp <= 0x065F) ||
         cp === 0x0670 ||
         (cp >= 0x06D6 && cp <= 0x06DC) ||
         (cp >= 0x06DF && cp <= 0x06E4) ||
         (cp >= 0x06E7 && cp <= 0x06E8) ||
         (cp >= 0x06EA && cp <= 0x06ED) ||
         cp === 0x06E1; // small high sign
}

/**
 * Convert index-based annotations into text segments.
 * Annotations are non-overlapping and sorted by start.
 * Gaps between annotations become {text, rule: null} segments.
 *
 * After building raw segments, colored spans of 1-2 chars are expanded
 * leftward to absorb the preceding base letter + its diacritics from the
 * preceding null segment. This ensures colored spans cover a readable
 * portion of the word rather than an isolated diacritic mark.
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

  // ── Expand short colored segments ──────────────────────────────────────────
  // Target: colored segments of ≤ 2 Unicode chars absorb chars from the
  // preceding null segment until the colored span reaches ≥ 4 chars or
  // we've consumed the base letter + all its leading diacritics.
  const MIN_COLORED_LEN = 4;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.rule === null) continue;

    const segChars = [...seg.text];
    if (segChars.length >= MIN_COLORED_LEN) continue; // already long enough

    // Only expand if there is a preceding null segment to borrow from
    if (i === 0 || segments[i - 1].rule !== null) continue;

    const prev      = segments[i - 1];
    const prevChars = [...prev.text];

    // How many chars to steal from the end of the previous null segment:
    // grab back through diacritics + the first non-diacritic (base letter) we find,
    // stopping when the colored segment reaches MIN_COLORED_LEN.
    let steal = 0;
    for (let j = prevChars.length - 1; j >= 0; j--) {
      const cp = prevChars[j].codePointAt(0);
      steal++;
      if (!isArabicDiacritic(cp)) break; // consumed the base letter, stop
      if ([...seg.text].length + steal >= MIN_COLORED_LEN) break;
    }

    if (steal > 0 && steal < prevChars.length) {
      const borrowed = prevChars.splice(prevChars.length - steal).join('');
      segments[i - 1] = { ...prev, text: prevChars.join('') };
      segments[i]     = { ...seg,  text: borrowed + seg.text };
    }
  }

  // Remove any null segments that became empty after borrowing
  const nonEmpty = segments.filter(s => s.text.length > 0);

  // ── Merge adjacent same-rule segments ──────────────────────────────────────
  const merged = [];
  for (const seg of nonEmpty) {
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
