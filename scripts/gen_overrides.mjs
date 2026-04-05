/**
 * Generates lib/tajweedOverrides.js from the actual Arabic text in quran.json.
 * Uses exact Unicode codepoint slicing for 100% integrity.
 */
import { writeFileSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const require = createRequire(import.meta.url);
const quran  = require(join(ROOT, 'public/data/quran.json'));

function text(s, a)        { return quran[s-1].verses.find(v => v.id === a).text; }
function sl(s, a, fr, to)  { return [...text(s,a)].slice(fr, to).join(''); }
function sf(s, a, fr)      { return [...text(s,a)].slice(fr).join(''); }
function all(s, a)         { return [{ text: text(s,a), rule: null }]; }
function chars(s, a)       { return [...text(s,a)]; }

// Find first occurrence of codepoint cp after position minI, where next char is cp2
function findCP(s, a, cp, minI = 0, nextCp = null) {
  const arr = chars(s, a);
  for (let i = minI; i < arr.length; i++) {
    if (arr[i].codePointAt(0) === cp) {
      if (nextCp === null || arr[i+1]?.codePointAt(0) === nextCp) return i;
    }
  }
  return -1;
}

const ov = {};

// ── Sourate 108 — Al-Kawthar ──────────────────────────────────────────────────
// إِنَّآ أَعۡطَيۡنَٰكَ ٱلۡكَوۡثَرَ
// نَّآ: idx 2-7 = ghunna+madd merged; نَٰ at 16-19 = madd lazim
ov['108_1'] = [
  { text: sl(108,1,0,2),  rule: null },
  { text: sl(108,1,2,7),  rule: 'ghunna' },  // نَّآ — ghunna (shadda+madd on alef)
  { text: sl(108,1,7,16), rule: null },
  { text: sl(108,1,16,19),rule: 'madd' },    // نَٰ — madd lazim
  { text: sf(108,1,19),   rule: null },
];
ov['108_2'] = all(108, 2);
// إِنَّ شَانِئَكَ هُوَ ٱلۡأَبۡتَرُ — نَّ at idx 2-5
ov['108_3'] = [
  { text: sl(108,3,0,2), rule: null },
  { text: sl(108,3,2,5), rule: 'ghunna' },
  { text: sf(108,3,5),   rule: null },
];

// ── Sourate 109 — Al-Kafiroun ─────────────────────────────────────────────────
// قُلۡ يَـٰٓأَيُّهَا ٱلۡكَٰفِرُونَ — يَـٰٓ madd at idx 5-10
ov['109_1'] = [
  { text: sl(109,1,0,5),  rule: null },
  { text: sl(109,1,5,10), rule: 'madd' },    // يَـٰٓ
  { text: sf(109,1,10),   rule: null },
];
// لَآ أَعۡبُدُ مَا تَعۡبُدُونَ — لَآ madd at 0-4, نَ ghunna at 27-29
ov['109_2'] = [
  { text: sl(109,2,0,4),  rule: 'madd' },    // لَآ
  { text: sl(109,2,4,27), rule: null },
  { text: sf(109,2,27),   rule: 'ghunna' },  // نَ
];
// وَلَآ أَنتُمۡ عَٰبِدُونَ مَآ أَعۡبُدُ — لَآ madd 2-6, عَٰ madd 15-17, مَآ madd 27-30
ov['109_3'] = [
  { text: sl(109,3,0,2),  rule: null },
  { text: sl(109,3,2,6),  rule: 'madd' },    // لَآ
  { text: sl(109,3,6,15), rule: null },
  { text: sl(109,3,15,17),rule: 'madd' },    // عَٰ
  { text: sl(109,3,17,27),rule: null },
  { text: sl(109,3,27,30),rule: 'madd' },    // مَآ
  { text: sf(109,3,30),   rule: null },
];
// وَلَآ أَنَا۠ عَابِدٞ مَّا عَبَدتُّمۡ — لَآ madd 2-6, عَا madd at عَا
const nAa4 = findCP(109,4,0x639,8); // ع after position 8
ov['109_4'] = [
  { text: sl(109,4,0,2),    rule: null },
  { text: sl(109,4,2,6),    rule: 'madd' },  // لَآ
  { text: sl(109,4,6,nAa4), rule: null },
  { text: sl(109,4,nAa4,nAa4+3), rule: 'madd' }, // عَا
  { text: sf(109,4,nAa4+3), rule: null },
];
// 109_5 identical text to 109_3
ov['109_5'] = text(109,5) === text(109,3) ? ov['109_3'] : all(109,5);
ov['109_6'] = all(109, 6);

// ── Sourate 110 — An-Nasr ─────────────────────────────────────────────────────
// إِذَا جَآءَ نَصۡرُ ٱللَّهِ وَٱلۡفَتۡحُ — جَآ madd idx 7-11
ov['110_1'] = [
  { text: sl(110,1,0,7),  rule: null },
  { text: sl(110,1,7,11), rule: 'madd' },    // جَآ before hamza
  { text: sf(110,1,11),   rule: null },
];
// وَرَأَيۡتَ ٱلنَّاسَ يَدۡخُلُونَ فِي دِينِ ٱللَّهِ أَفۡوَاجٗا
// نَّ in النَّاس: find ن + shadda after idx 8
const nNas2a = findCP(110,2,0x646,8,0x651);
// نَ at end of يَدۡخُلُونَ: find ن after idx 20
const nNas2b = findCP(110,2,0x646,20);
ov['110_2'] = [
  { text: sl(110,2,0,nNas2a),      rule: null },
  { text: sl(110,2,nNas2a,nNas2a+3), rule: 'ghunna' },
  { text: sl(110,2,nNas2a+3,nNas2b), rule: null },
  { text: sl(110,2,nNas2b,nNas2b+2),  rule: 'ghunna' }, // نَ
  { text: sf(110,2,nNas2b+2),      rule: null },
];
// فَسَبِّحۡ ... إِنَّهُۥ — find نَّ after idx 30
const nNas3 = findCP(110,3,0x646,30,0x651);
ov['110_3'] = [
  { text: sl(110,3,0,nNas3),       rule: null },
  { text: sl(110,3,nNas3,nNas3+3), rule: 'ghunna' },
  { text: sf(110,3,nNas3+3),       rule: null },
];

// ── Sourate 111 — Al-Masad ────────────────────────────────────────────────────
// تَبَّتۡ يَدَآ — دَآ madd idx 11-14
ov['111_1'] = [
  { text: sl(111,1,0,11), rule: null },
  { text: sl(111,1,11,14),rule: 'madd' },    // دَآ
  { text: sf(111,1,14),   rule: null },
];
// مَآ أَغۡنَىٰ — مَآ madd idx 0-4
ov['111_2'] = [
  { text: sl(111,2,0,4),  rule: 'madd' },    // مَآ
  { text: sf(111,2,4),    rule: null },
];
// سَيَصۡلَىٰ — لَىٰ madd idx 7-10
ov['111_3'] = [
  { text: sl(111,3,0,7),  rule: null },
  { text: sl(111,3,7,10), rule: 'madd' },    // لَىٰ
  { text: sf(111,3,10),   rule: null },
];
// وَٱمۡرَأَتُهُۥ حَمَّالَةَ — find مَّ (م + shadda)
const nHam4 = findCP(111,4,0x645,5,0x651);
ov['111_4'] = [
  { text: sl(111,4,0,nHam4),       rule: null },
  { text: sl(111,4,nHam4,nHam4+3), rule: 'ghunna' }, // مَّ ghunna shafawi
  { text: sf(111,4,nHam4+3),       rule: null },
];
// فِي جِيدِهَا حَبۡلٞ مِّن مَّسَدِۭ — find مِّن starting after حَبۡلٞ (around idx 20)
// م is at the position after the space following لٞ
{
  const arr = chars(111,5);
  // م in مِّن is at idx 20, followed by shadda (U+651) then kasra (U+650)
  let nMim5 = -1;
  for (let i = 18; i < arr.length; i++) {
    if (arr[i].codePointAt(0) === 0x645 && arr[i+1]?.codePointAt(0) === 0x651) {
      nMim5 = i; break;
    }
  }
  ov['111_5'] = [
    { text: sl(111,5,0,nMim5),       rule: null },
    { text: sl(111,5,nMim5,nMim5+4), rule: 'ghunna' }, // مِّن
    { text: sf(111,5,nMim5+4),       rule: null },
  ];
}

// ── Sourate 112 — Al-Ikhlas ───────────────────────────────────────────────────
// قُلۡ هُوَ ٱللَّهُ أَحَدٌ — no dominant rule, keep plain
ov['112_1'] = all(112, 1);
// لَمۡ يَلِدۡ وَلَمۡ يُولَدۡ — يُو madd
const nYu3 = findCP(112,3,0x64A,10,0x64F); // ي + damma
ov['112_3'] = [
  { text: sl(112,3,0,nYu3),       rule: null },
  { text: sl(112,3,nYu3,nYu3+3), rule: 'madd' }, // يُو
  { text: sf(112,3,nYu3+3),       rule: null },
];
ov['112_4'] = all(112, 4);

// ── Sourate 113 — Al-Falaq ────────────────────────────────────────────────────
ov['113_1'] = all(113, 1);
// مِن شَرِّ — ن شَ ikhfa (idx 2-5)
ov['113_2'] = [
  { text: sl(113,2,0,2), rule: null },
  { text: sl(113,2,2,5), rule: 'ikhfa' }, // ن شَ
  { text: sf(113,2,5),   rule: null },
];
// وَمِن شَرِّ — ن شَ ikhfa (idx 4-7)
ov['113_3'] = [
  { text: sl(113,3,0,4), rule: null },
  { text: sl(113,3,4,7), rule: 'ikhfa' },
  { text: sf(113,3,7),   rule: null },
];
// وَمِن شَرِّ ٱلنَّفَّـٰثَٰتِ — ikhfa + ghunna
const nNun4c = findCP(113,4,0x646,8,0x651);
ov['113_4'] = [
  { text: sl(113,4,0,4),          rule: null },
  { text: sl(113,4,4,7),          rule: 'ikhfa' },
  { text: sl(113,4,7,nNun4c),     rule: null },
  { text: sl(113,4,nNun4c,nNun4c+3), rule: 'ghunna' },
  { text: sf(113,4,nNun4c+3),     rule: null },
];
// وَمِن شَرِّ — ikhfa
ov['113_5'] = [
  { text: sl(113,5,0,4), rule: null },
  { text: sl(113,5,4,7), rule: 'ikhfa' },
  { text: sf(113,5,7),   rule: null },
];

// ── Sourate 114 — An-Nas ──────────────────────────────────────────────────────
// قُلۡ أَعُوذُ بِرَبِّ ٱلنَّاسِ — find نَّ after idx 18
const nNun1b = findCP(114,1,0x646,18,0x651);
ov['114_1'] = [
  { text: sl(114,1,0,nNun1b),         rule: null },
  { text: sl(114,1,nNun1b,nNun1b+3),  rule: 'ghunna' },
  { text: sf(114,1,nNun1b+3),         rule: null },
];
// مَلِكِ ٱلنَّاسِ — find نَّ
const nNun2b = findCP(114,2,0x646,0,0x651);
ov['114_2'] = [
  { text: sl(114,2,0,nNun2b),        rule: null },
  { text: sl(114,2,nNun2b,nNun2b+3), rule: 'ghunna' },
  { text: sf(114,2,nNun2b+3),        rule: null },
];
// إِلَٰهِ ٱلنَّاسِ — لَٰ madd, نَّ ghunna
const nSuperAlef3 = findCP(114,3,0x670); // superscript alef U+0670
const nNun3b = findCP(114,3,0x646,5,0x651);
ov['114_3'] = [
  { text: sl(114,3,0,nSuperAlef3-1),               rule: null },
  { text: sl(114,3,nSuperAlef3-1,nSuperAlef3+1),    rule: 'madd' }, // لَٰ
  { text: sl(114,3,nSuperAlef3+1,nNun3b),           rule: null },
  { text: sl(114,3,nNun3b,nNun3b+3),                rule: 'ghunna' },
  { text: sf(114,3,nNun3b+3),                       rule: null },
];
// مِن شَرِّ ٱلۡوَسۡوَاسِ ٱلۡخَنَّاسِ — ikhfa + ghunna
const nNun4d = findCP(114,4,0x646,8,0x651);
ov['114_4'] = [
  { text: sl(114,4,0,2),           rule: null },
  { text: sl(114,4,2,5),           rule: 'ikhfa' },
  { text: sl(114,4,5,nNun4d),      rule: null },
  { text: sl(114,4,nNun4d,nNun4d+3), rule: 'ghunna' },
  { text: sf(114,4,nNun4d+3),      rule: null },
];
// ٱلَّذِي يُوَسۡوِسُ فِي صُدُورِ ٱلنَّاسِ
const nNun5b = findCP(114,5,0x646,20,0x651);
ov['114_5'] = [
  { text: sl(114,5,0,nNun5b),        rule: null },
  { text: sl(114,5,nNun5b,nNun5b+3), rule: 'ghunna' },
  { text: sf(114,5,nNun5b+3),        rule: null },
];
// مِنَ ٱلۡجِنَّةِ وَٱلنَّاسِ — two ghunna
const nN6a = findCP(114,6,0x646,0,0x651);
const nN6b = findCP(114,6,0x646,nN6a+3,0x651);
ov['114_6'] = [
  { text: sl(114,6,0,nN6a),      rule: null },
  { text: sl(114,6,nN6a,nN6a+3), rule: 'ghunna' },
  { text: sl(114,6,nN6a+3,nN6b), rule: null },
  { text: sl(114,6,nN6b,nN6b+3), rule: 'ghunna' },
  { text: sf(114,6,nN6b+3),      rule: null },
];

// ── Integrity check ───────────────────────────────────────────────────────────
let errors = 0;
for (const [key, segs] of Object.entries(ov)) {
  const [s, a] = key.split('_').map(Number);
  const orig  = text(s, a);
  const recon = segs.map(x => x.text).join('');
  if (recon !== orig) {
    errors++;
    console.error(`MISMATCH ${key}`);
    console.error(`  orig : ${JSON.stringify(orig)}`);
    console.error(`  recon: ${JSON.stringify(recon)}`);
  }
}
if (errors > 0) {
  console.error(`${errors} integrity errors — aborting`);
  process.exit(1);
}
console.log(`All ${Object.keys(ov).length} overrides verified OK`);

// ── Write output ──────────────────────────────────────────────────────────────
const entries = Object.entries(ov)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n');

const content = `/**
 * Manual tajweed segment overrides — generated by scripts/gen_overrides.mjs
 * Priority over quran_tajweed.json auto-generated data.
 * Rules: madd | ghunna | ikhfa | idgham | qalqala | null
 * Integrity: each entry's segments must reconstruct the exact original Arabic text.
 */
export const TAJWEED_OVERRIDES = {
${entries}
};
`;

const outPath = join(ROOT, 'lib/tajweedOverrides.js');
writeFileSync(outPath, content, 'utf8');
console.log(`Written to lib/tajweedOverrides.js`);
