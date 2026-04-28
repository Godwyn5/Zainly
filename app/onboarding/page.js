'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ZAINLY_ORDER as ZAINLY_ORDER_DATA } from '@/lib/zainlyOrder';
import { JUZ_SURAHS } from '@/lib/juzData';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut', delay },
});

// ─── Constants ───────────────────────────────────────────────────────────────

// Single source of truth from lib
const ZAINLY_SURAHS = ZAINLY_ORDER_DATA // { name, surah, ayahs }[]

const QURAN_ORDER_NAMES = [
  'Al-Fatiha','Al-Baqara','Al-Imran','An-Nisa','Al-Maida','Al-Anam','Al-Araf',
  'Al-Anfal','At-Tawba','Yunus','Hud','Yusuf','Ar-Rad','Ibrahim','Al-Hijr',
  'An-Nahl','Al-Isra','Al-Kahf','Maryam','Ta-Ha','Al-Anbiya','Al-Hajj',
  'Al-Muminun','An-Nur','Al-Furqan','Ash-Shuara','An-Naml','Al-Qasas',
  'Al-Ankabut','Ar-Rum','Luqman','As-Sajda','Al-Ahzab','Saba','Fatir','Ya-Sin',
  'As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura','Az-Zukhruf',
  'Ad-Dukhan','Al-Jathiya','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf',
  'Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman','Al-Waqia','Al-Hadid',
  'Al-Mujadila','Al-Hashr','Al-Mumtahana','As-Saf','Al-Jumua','Al-Munafiqun',
  'At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk','Al-Qalam','Al-Haqqa',
  'Al-Maarij','Nuh','Al-Jinn','Al-Muzzammil','Al-Muddaththir','Al-Qiyama',
  'Al-Insan','Al-Mursalat','An-Naba','An-Naziat','Abasa','At-Takwir','Al-Infitar',
  'Al-Mutaffifin','Al-Inshiqaq','Al-Buruj','At-Tariq','Al-Ala','Al-Ghashiya',
  'Al-Fajr','Al-Balad','Ash-Shams','Al-Layl','Ad-Duha','Ash-Sharh','At-Tin',
  'Al-Alaq','Al-Qadr','Al-Bayyina','Az-Zalzala','Al-Adiyat','Al-Qaria',
  'At-Takathur','Al-Asr','Al-Humaza','Al-Fil','Quraysh','Al-Maun','Al-Kawthar',
  'Al-Kafirun','An-Nasr','Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas',
];

// surah number → canonical position (1-based) for display
const SURAH_QURAN_POS = Object.fromEntries(
  QURAN_ORDER_NAMES.map((name, i) => [name, i + 1])
);

const AYAH_RHYTHMS = [
  { ayah: 1, label: '1 ayat / jour',  desc: 'Parfait pour commencer en douceur' },
  { ayah: 2, label: '2 ayats / jour', desc: 'Un rythme stable et durable' },
  { ayah: 3, label: '3 ayats / jour', desc: 'Un excellent équilibre' },
  { ayah: 4, label: '4 ayats / jour', desc: 'Tu progresses rapidement' },
  { ayah: 5, label: '5 ayats / jour', desc: 'Très engagé — résultats visibles' },
  { ayah: 6, label: '6 ayats / jour', desc: 'Niveau avancé — forte discipline' },
];

const PAGE_RHYTHMS_UI = [
  { key: 'quarter_page', label: 'Environ 1/4 de page / jour', ayahs: 3,  desc: 'Idéal pour une routine légère' },
  { key: 'half_page',    label: 'Environ 1/2 page / jour',    ayahs: 6,  desc: 'Un bon équilibre vitesse / durée' },
  { key: 'full_page',    label: 'Environ 1 page / jour',      ayahs: 10, desc: 'Exigeant — forte discipline requise' },
];

const LOADING_PHRASES = [
  'Analyse de tes réponses...',
  'Personnalisation de ton rythme...',
  'Sélection des sourates...',
  'Ton plan est prêt',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcEstimatedYearsFromSurahs(ayahPerDay, knownSurahNums) {
  const knownSet = new Set(knownSurahNums);
  const knownAyats = ZAINLY_SURAHS
    .filter(s => knownSet.has(s.surah))
    .reduce((sum, s) => sum + s.ayahs, 0);
  const remaining = Math.max(0, 6236 - knownAyats);
  const weeks = Math.ceil(remaining / (ayahPerDay * 6));
  return Math.max(1, Math.round(weeks / 52.18));
}

function calcEstimatedYearsCustom(ayahPerDay, customSurahNums) {
  const totalAyahs = ZAINLY_SURAHS
    .filter(s => customSurahNums.includes(s.surah))
    .reduce((sum, s) => sum + s.ayahs, 0);
  const weeks = Math.ceil(totalAyahs / (ayahPerDay * 6));
  return Math.max(1, Math.round(weeks / 52.18));
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes fadeIn {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes slideUp {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

const calligStyle = {
  position: 'fixed',
  top: '50%', left: '50%',
  transform: 'translate(-50%,-50%)',
  fontSize: 'min(40vw,300px)',
  color: '#163026',
  opacity: 0.04,
  pointerEvents: 'none',
  userSelect: 'none',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  zIndex: 0,
};

// ─── SVG progress circle ──────────────────────────────────────────────────────

function ProgressCircle({ percent }) {
  const r = 90, circ = 2 * Math.PI * r;
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r={r} fill="none" stroke="#E2D9CC" strokeWidth="2" />
      <circle cx="110" cy="110" r={r} fill="none" stroke="#163026" strokeWidth="2"
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ - (percent / 100) * circ}
        transform="rotate(-90 110 110)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function ModeExplainer({ title, items, onClose }) {
  return (
    <div style={{ marginTop: '12px', backgroundColor: 'rgba(22,48,38,0.05)', border: '1px solid rgba(22,48,38,0.12)', borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: '#163026' }}>{title}</span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', padding: '0 4px' }}>✕</button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: i < items.length - 1 ? '6px' : 0 }}>
          <span style={{ color: '#B8962E', fontSize: '13px', marginTop: '1px', flexShrink: 0 }}>✓</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Module-level JuzPillsComponent ──────────────────────────────────────────

function JuzPillsComponent({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      {[0, ...Array.from({ length: 30 }, (_, i) => 30 - i)].map(j => (
        <button key={j} type="button" onClick={() => onChange(j)} style={{
          flexShrink: 0, padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          border: `1px solid ${value === j ? '#163026' : '#E2D9CC'}`,
          backgroundColor: value === j ? '#163026' : '#FFFFFF',
          color: value === j ? '#FFFFFF' : '#6B6357',
          borderRadius: '20px', transition: 'all 0.18s', whiteSpace: 'nowrap',
        }}>
          {j === 0 ? 'Tout' : `Juz ${j}`}
        </button>
      ))}
    </div>
  );
}

// ─── PartialSurahSection ──────────────────────────────────────────────────────
// "Tu connais seulement le début d'une sourate ?" — optional mini-section in step 2

function PartialSurahSection({ knownSet, partialKnownSurahs, setPartialKnownSurahs }) {
  const [open, setOpen]           = useState(false);
  const [pickingSurah, setPickingSurah] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState(null); // int
  const [inputVal, setInputVal]   = useState('');
  const [localError, setLocalError] = useState('');

  const entries = Object.entries(partialKnownSurahs); // [[surahNum, {to}], ...]

  function openPicker() { setPickingSurah(true); setSelectedSurah(null); setInputVal(''); setLocalError(''); }
  function cancelPicker() { setPickingSurah(false); setSelectedSurah(null); setInputVal(''); setLocalError(''); }

  function addPartial() {
    setLocalError('');
    const surahEntry = ZAINLY_SURAHS.find(s => s.surah === selectedSurah);
    if (!surahEntry) { setLocalError('Choisis une sourate.'); return; }
    const to = parseInt(inputVal);
    if (isNaN(to) || to < 1) { setLocalError('Entre un numéro d\'ayat valide (≥ 1).'); return; }
    if (to >= surahEntry.ayahs) {
      setLocalError(`Cette sourate n'a que ${surahEntry.ayahs} ayats. Si tu la connais entièrement, coche-la dans la liste du dessus.`);
      return;
    }
    setPartialKnownSurahs(prev => ({ ...prev, [selectedSurah]: { to } }));
    setPickingSurah(false);
    setSelectedSurah(null);
    setInputVal('');
  }

  function removePartial(surahNum) {
    setPartialKnownSurahs(prev => {
      const next = { ...prev };
      delete next[surahNum];
      return next;
    });
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', fontWeight: 600 }}>
        <span style={{ fontSize: '16px' }}>{open ? '▲' : '▼'}</span>
        Tu connais seulement le début d&apos;une sourate ?
      </button>

      {open && (
        <div style={{ backgroundColor: 'rgba(184,150,46,0.06)', border: '1.5px solid rgba(184,150,46,0.25)', borderRadius: '14px', padding: '16px', marginTop: '4px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#7a5c00', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Ajoute ici les sourates que tu as commencées mais pas terminées. Zainly reprendra exactement là où tu t&apos;es arrêté.
          </p>

          {/* Existing partials list */}
          {entries.length > 0 && (
            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {entries.map(([num, { to }]) => {
                const n = parseInt(num);
                const s = ZAINLY_SURAHS.find(x => x.surah === n);
                if (!s) return null;
                return (
                  <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC', borderRadius: '10px', padding: '8px 14px' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#163026', flex: 1 }}>
                      <strong>{s.name}</strong>
                      <span style={{ color: '#B8962E', marginLeft: '6px' }}>— je connais jusqu&apos;à l&apos;ayat {to}</span>
                      <span style={{ color: '#9B8F80', fontSize: '11px', marginLeft: '4px' }}>(Zainly commencera à l&apos;ayat {to + 1})</span>
                    </span>
                    <button type="button" onClick={() => removePartial(n)}
                      style={{ background: 'none', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '6px', cursor: 'pointer', padding: '3px 8px', fontSize: '12px', color: '#c0392b' }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Picker */}
          {!pickingSurah ? (
            <button type="button" onClick={openPicker}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid #B8962E', borderRadius: '10px', backgroundColor: '#FFFFFF', color: '#B8962E', fontFamily: 'DM Sans, sans-serif' }}>
              + Ajouter une sourate commencée
            </button>
          ) : (
            <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2D9CC', borderRadius: '12px', padding: '14px' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: '#163026', margin: '0 0 8px 0' }}>1. Quelle sourate ?</p>
              <select
                value={selectedSurah ?? ''}
                onChange={e => { setSelectedSurah(e.target.value ? parseInt(e.target.value) : null); setLocalError(''); }}
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1.5px solid #E2D9CC', backgroundColor: '#F5F0E6', color: '#163026', marginBottom: '12px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}>
                <option value="">— Choisir une sourate —</option>
                {[...ZAINLY_SURAHS]
                  .filter(s => !knownSet.has(s.surah) && !partialKnownSurahs[s.surah])
                  .sort((a, b) => (SURAH_QURAN_POS[a.name] ?? 999) - (SURAH_QURAN_POS[b.name] ?? 999))
                  .map(s => {
                    const qNum = SURAH_QURAN_POS[s.name] ?? s.surah;
                    return <option key={s.surah} value={s.surah}>{qNum}. {s.name} ({s.ayahs} ayats)</option>;
                  })}
              </select>

              {selectedSurah && (() => {
                const s = ZAINLY_SURAHS.find(x => x.surah === selectedSurah);
                if (!s) return null;
                return (
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: '#163026', margin: '0 0 6px 0' }}>
                      2. Jusqu&apos;à quel ayat tu la connais ?
                    </p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9B8F80', margin: '0 0 8px 0' }}>
                      {s.name} contient {s.ayahs} ayats. Entre un nombre entre 1 et {s.ayahs - 1}.
                    </p>
                    <input
                      type="number" min="1" max={s.ayahs - 1} value={inputVal}
                      onChange={e => { setInputVal(e.target.value); setLocalError(''); }}
                      placeholder={`Ex : 10`}
                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: `1.5px solid ${localError ? '#c0392b' : '#E2D9CC'}`, backgroundColor: '#F5F0E6', color: '#163026', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                );
              })()}

              {localError && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#c0392b', margin: '8px 0 0 0' }}>{localError}</p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={addPartial}
                  style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: '#163026', color: '#FFFFFF', fontFamily: 'DM Sans, sans-serif' }}>
                  Confirmer
                </button>
                <button type="button" onClick={cancelPicker}
                  style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', border: '1px solid #E2D9CC', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#6B6357', fontFamily: 'DM Sans, sans-serif' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CustomOrderStep: single-screen selection with inline order numbers ───────

function CustomOrderStep({
  totalSteps, knownSet, customOrder, setCustomOrder, customJuzFilter, setCustomJuzFilter,
  toggleCustom, goStep, partialKnownSurahs,
}) {
  const partialMap = partialKnownSurahs || {};
  const [showConfirm, setShowConfirm] = useState(false);

  // Available = all surahs not fully known
  const availableSurahs = ZAINLY_SURAHS.filter(s => !knownSet.has(s.surah));
  const availableCount  = availableSurahs.length;
  const allSelected     = customOrder.length >= availableCount;

  // Append all available unselected surahs in ZAINLY_ORDER after current priorities
  function addAllRemaining() {
    setCustomOrder(prev => {
      const prevSet = new Set(prev);
      const toAdd = ZAINLY_SURAHS
        .filter(s => !knownSet.has(s.surah) && !prevSet.has(s.surah))
        .map(s => s.surah);
      return [...prev, ...toAdd];
    });
    setShowConfirm(false);
  }

  // Append Juz Amma surahs (juz 30) not already selected and not fully known
  function addJuzAmma() {
    const juz30Names = new Set(JUZ_SURAHS[30] ?? []);
    setCustomOrder(prev => {
      const prevSet = new Set(prev);
      const toAdd = ZAINLY_SURAHS
        .filter(s => juz30Names.has(s.name) && !knownSet.has(s.surah) && !prevSet.has(s.surah))
        .map(s => s.surah);
      return [...prev, ...toAdd];
    });
  }

  // Reset selection only
  function resetSelection() {
    setCustomOrder([]);
    setShowConfirm(false);
  }

  function handleContinue() {
    if (customOrder.length === 0) return;
    if (allSelected) { goStep(4); return; }
    setShowConfirm(true);
  }

  // ── Inline confirmation panel ──
  if (showConfirm) {
    return (
      <div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 20px 0' }}>ÉTAPE 3 / {totalSteps}</p>
        <div style={{ backgroundColor: '#FFFDF7', border: '1.5px solid #E2D9CC', borderRadius: '16px', padding: '24px 20px', marginBottom: '16px' }}>
          <h2 className="font-playfair" style={{ fontSize: '22px', fontWeight: 600, color: '#163026', margin: '0 0 12px 0', lineHeight: 1.3 }}>
            Programme personnalisé incomplet
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: '0 0 8px 0', lineHeight: 1.6 }}>
            Tu as sélectionné <strong>{customOrder.length} sourate{customOrder.length > 1 ? 's' : ''}</strong> sur {availableCount}.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: '0 0 8px 0', lineHeight: 1.6 }}>
            Pour créer ton programme complet, ajoute les sourates restantes après tes priorités.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: '0 0 20px 0', lineHeight: 1.6 }}>
            Zainly suivra d&apos;abord les sourates que tu as choisies, puis continuera avec les autres sourates non maîtrisées.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="button" onClick={addAllRemaining} className="font-playfair"
              style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,48,38,0.15)' }}>
              Ajouter toutes les sourates restantes
            </button>
            <button type="button" onClick={() => setShowConfirm(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', padding: '8px 0' }}>
              ← Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main selection screen ──
  return (
    <div>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ÉTAPE 3 / {totalSteps}</p>
      <h1 className="font-playfair" style={{ fontSize: '28px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
        Construis ton parcours complet
      </h1>
      <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 8px 0', lineHeight: 1.6 }}>
        Coche les sourates dans l&apos;ordre où tu veux les mémoriser.
      </p>
      <div style={{ backgroundColor: 'rgba(184,150,46,0.10)', border: '1.5px solid rgba(184,150,46,0.35)', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7a5c00', margin: '0 0 4px 0', lineHeight: 1.5 }}>
          Ton programme suivra exactement l&apos;ordre que tu choisis.
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9a7300', margin: 0, lineHeight: 1.5 }}>
          La première sourate cochée sera la première travaillée.
        </p>
      </div>

      {/* Counter */}
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#163026', textAlign: 'center', margin: '0 0 10px 0', fontWeight: 600 }}>
        {customOrder.length} / {availableCount} sourate{availableCount > 1 ? 's' : ''} dans ton programme
      </p>

      {/* Quick action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <button type="button" onClick={addAllRemaining} disabled={allSelected}
          style={{ width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', backgroundColor: allSelected ? '#F0EBE1' : '#F5F0E6', color: allSelected ? '#C8C0B4' : '#163026', border: '1.5px solid ' + (allSelected ? '#E2D9CC' : '#B8962E'), borderRadius: '10px', cursor: allSelected ? 'default' : 'pointer', textAlign: 'left' }}>
          + Ajouter toutes les sourates restantes
        </button>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9B8F80', margin: '-4px 0 0 2px' }}>
          Les sourates restantes seront ajoutées après tes priorités.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={addJuzAmma}
            style={{ flex: 1, padding: '9px 12px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', backgroundColor: '#F5F0E6', color: '#163026', border: '1.5px solid #E2D9CC', borderRadius: '10px', cursor: 'pointer' }}>
            + Ajouter Juz Amma
          </button>
          <button type="button" onClick={resetSelection} disabled={customOrder.length === 0}
            style={{ flex: 1, padding: '9px 12px', fontSize: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', backgroundColor: '#F5F0E6', color: customOrder.length === 0 ? '#C8C0B4' : '#c0392b', border: '1.5px solid ' + (customOrder.length === 0 ? '#E2D9CC' : 'rgba(192,57,43,0.3)'), borderRadius: '10px', cursor: customOrder.length === 0 ? 'default' : 'pointer' }}>
            Réinitialiser ma sélection
          </button>
        </div>
      </div>

      <JuzPillsComponent value={customJuzFilter} onChange={setCustomJuzFilter} />

      <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2D9CC', borderRadius: '16px', maxHeight: '380px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 0', marginBottom: '16px' }}>
        {(() => {
          const filtered = ZAINLY_SURAHS.filter(s => {
            if (customJuzFilter === 0) return true;
            return (new Set(JUZ_SURAHS[customJuzFilter] ?? [])).has(s.name);
          });
          if (filtered.length === 0) {
            return <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#A09890', padding: '24px' }}>Aucune sourate disponible dans ce Juz.</p>;
          }
          return filtered.map(s => {
            const isKnown  = knownSet.has(s.surah);
            const checked  = customOrder.includes(s.surah);
            const orderIdx = customOrder.indexOf(s.surah);
            const qNum     = SURAH_QURAN_POS[s.name] ?? s.surah;
            const partial  = partialMap[s.surah] || partialMap[String(s.surah)];
            return (
              <label key={s.surah} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px 20px',
                cursor: isKnown ? 'default' : 'pointer',
                backgroundColor: checked ? 'rgba(22,48,38,0.04)' : 'transparent',
                opacity: isKnown ? 0.38 : 1,
                transition: 'background-color 0.15s',
              }}>
                <input type="checkbox" checked={checked} disabled={isKnown} onChange={() => { if (!isKnown) toggleCustom(s.surah); }}
                  style={{ accentColor: '#163026', width: '16px', height: '16px', cursor: isKnown ? 'default' : 'pointer', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: '15px', color: '#163026' }}>
                    <span style={{ color: '#6B6357', marginRight: '6px', fontSize: '12px' }}>{qNum}.</span>
                    {s.name}
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9B8F80' }}>({s.ayahs} ayats)</span>
                  </span>
                  {isKnown && (
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9B8F80', marginTop: '2px' }}>
                      Déjà maîtrisée
                    </span>
                  )}
                  {partial && checked && !isKnown && (
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#B8962E', marginTop: '2px' }}>
                      commencera à l&apos;ayat {partial.to + 1}
                    </span>
                  )}
                </span>
                {checked && (
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: '#B8962E', flexShrink: 0, minWidth: '20px', textAlign: 'right' }}>
                    {orderIdx + 1}
                  </span>
                )}
              </label>
            );
          });
        })()}
      </div>

      {customOrder.length === 0 && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#c0392b', textAlign: 'center', margin: '0 0 12px 0' }}>
          Choisis au moins une sourate pour créer ton programme.
        </p>
      )}

      <button type="button" onClick={handleContinue} disabled={customOrder.length === 0} className="font-playfair"
        style={{
          width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
          backgroundColor: customOrder.length > 0 ? '#163026' : '#E2D9CC',
          color: customOrder.length > 0 ? '#FFFFFF' : '#A09890',
          border: 'none', borderRadius: '12px',
          cursor: customOrder.length > 0 ? 'pointer' : 'default',
          boxShadow: customOrder.length > 0 ? '0 8px 32px rgba(22,48,38,0.2)' : 'none',
          transition: 'all 0.2s ease',
        }}>
        Continuer →
      </button>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function OnboardingInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isReset      = searchParams.get('reset') === 'true';

  // Steps: 1=mode, 2=known surahs, 3=mode-specific, 4=rhythm, 5=summary
  const [step, setStep]               = useState(1);
  const [visible, setVisible]         = useState(true);
  const [pageVisible, setPageVisible] = useState(false);

  // Step 1 — mode
  const [planMode, setPlanMode]         = useState(null); // 'recommended'|'start_surah'|'custom_order'
  const [openExplainer, setOpenExplainer] = useState(null); // which mode's explainer is open

  // Step 2 — known surahs (by surah number)
  const [knownSurahs, setKnownSurahs] = useState([]); // int[]
  const [juzFilter, setJuzFilter]     = useState(0);
  // Partially mastered surahs: { [surahNum]: { to: N } }
  const [partialKnownSurahs, setPartialKnownSurahs] = useState({});

  // Step 3a — Mode 2: starting surah
  const [startingSurah, setStartingSurah]   = useState(null); // int
  const [startJuzFilter, setStartJuzFilter] = useState(0);

  // Step 3b — Mode 3: custom order
  const [customOrder, setCustomOrder]           = useState([]); // int[] — ordered
  const [customJuzFilter, setCustomJuzFilter]   = useState(0);

  // Step 4 — rhythm
  const [paceTab, setPaceTab]       = useState('ayahs'); // 'ayahs'|'pages'
  const [ayahPerDay, setAyahPerDay] = useState(null);    // int — real engine value
  const [pagePaceKey, setPagePaceKey] = useState(null);  // 'quarter_page'|'half_page'|'full_page'
  const [paceLabel, setPaceLabel]     = useState(null);  // display label

  // Loading & result
  const [loading, setLoading]               = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingPhrase, setLoadingPhrase]   = useState(LOADING_PHRASES[0]);
  const [error, setError]                   = useState('');
  const [coranComplete, setCoranComplete]   = useState(false);
  const [plan, setPlan]                     = useState(null);
  const [prenom, setPrenom]                 = useState('');

  // Check existing plan on mount
  useEffect(() => {
    async function check() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { router.push('/login'); return; }
      setPrenom(user.user_metadata?.prenom || '');
      if (!isReset) {
        const { data: existing } = await supabase.from('plans').select('id').eq('user_id', user.id).limit(1);
        if (existing && existing.length > 0) { router.push('/dashboard'); return; }
      }
      setTimeout(() => setPageVisible(true), 80);
    }
    check();
  }, [router, isReset]);

  function goStep(n) {
    setVisible(false);
    setError('');
    setTimeout(() => { setStep(n); setVisible(true); }, 280);
  }

  // ── Known surahs toggle ──
  function toggleKnown(surahNum) {
    setKnownSurahs(prev =>
      prev.includes(surahNum) ? prev.filter(x => x !== surahNum) : [...prev, surahNum]
    );
    // Fully known wins over partial — remove partial entry if now fully known
    setPartialKnownSurahs(prev => {
      if (!prev[surahNum]) return prev;
      const next = { ...prev };
      delete next[surahNum];
      return next;
    });
  }

  // ── Mode 3: custom order management ──
  function toggleCustom(surahNum) {
    setCustomOrder(prev =>
      prev.includes(surahNum) ? prev.filter(x => x !== surahNum) : [...prev, surahNum]
    );
  }
  function moveUp(idx) {
    if (idx === 0) return;
    setCustomOrder(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }
  function moveDown(idx) {
    setCustomOrder(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }
  function removeFromCustom(surahNum) {
    setCustomOrder(prev => prev.filter(x => x !== surahNum));
  }

  // ── Step 3 navigation ──
  function goToStep3() {
    if (planMode === 'recommended') {
      goStep(4); // skip step 3
    } else {
      goStep(3);
    }
  }

  // ── Rhythm selection ──
  function selectAyahRhythm(ayah) {
    setAyahPerDay(ayah);
    setPagePaceKey(null);
    setPaceTab('ayahs');
    setPaceLabel(`${ayah} ayat${ayah > 1 ? 's' : ''} / jour`);
  }
  function selectPageRhythm(key) {
    const pr = PAGE_RHYTHMS_UI.find(p => p.key === key);
    if (!pr) return;
    setPagePaceKey(key);
    setAyahPerDay(pr.ayahs);
    setPaceTab('pages');
    setPaceLabel(pr.label);
  }

  // ── Generate plan ──
  async function generate() {
    setError('');
    setLoading(true);
    setLoadingPercent(0);
    setLoadingPhrase(LOADING_PHRASES[0]);

    const phraseTimers = LOADING_PHRASES.map((ph, i) => setTimeout(() => setLoadingPhrase(ph), i * 1500));
    const pctTimers = [
      setTimeout(() => setLoadingPercent(20), 300),
      setTimeout(() => setLoadingPercent(45), 1200),
      setTimeout(() => setLoadingPercent(70), 2400),
      setTimeout(() => setLoadingPercent(88), 3600),
    ];
    const allTimers = [...phraseTimers, ...pctTimers];

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error('Utilisateur non connecté.');
      setPrenom(user.user_metadata?.prenom || '');

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) throw new Error('Session expirée. Reconnecte-toi.');

      const body = {
        planMode,
        knownSurahs,
        partialKnownSurahs,
        ayahPerDay,
        paceType:    paceTab,
        pagePaceKey: paceTab === 'pages' ? pagePaceKey : null,
        paceLabel,
        pedagogicalOrderVersion: 'v1',
        ...(planMode === 'start_surah'  && { startingSurah }),
        ...(planMode === 'custom_order' && { customSurahOrder: customOrder }),
      };

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      const planData = await res.json();
      if (!res.ok) throw new Error(planData.error || 'Erreur lors de la génération du plan.');
      if (planData.message === 'coran_complete') {
        allTimers.forEach(clearTimeout);
        setLoading(false);
        setCoranComplete(true);
        return;
      }

      allTimers.forEach(clearTimeout);
      setLoadingPercent(100);
      setLoadingPhrase(LOADING_PHRASES[3]);
      setTimeout(() => { setPlan(planData); setLoading(false); }, 800);
    } catch (err) {
      allTimers.forEach(clearTimeout);
      setError(err.message);
      setLoadingPercent(0);
      setLoading(false);
    }
  }

  // ── Computed display values ──
  const knownSet = new Set(knownSurahs);
  const allKnown = ZAINLY_SURAHS.every(s => knownSet.has(s.surah));

  const estYears = ayahPerDay
    ? planMode === 'custom_order'
      ? calcEstimatedYearsCustom(ayahPerDay, customOrder)
      : calcEstimatedYearsFromSurahs(ayahPerDay, knownSurahs)
    : null;

  // ── Juz filter helpers ──
  function getVisibleForJuz(filter, excludeSet) {
    const juzSurateSet = filter === 0 ? null : new Set(JUZ_SURAHS[filter] ?? []);
    return ZAINLY_SURAHS.filter(s => {
      if (excludeSet && excludeSet.has(s.surah)) return false;
      if (juzSurateSet) return juzSurateSet.has(s.name);
      return true;
    });
  }

  // ── Coran complet screen ──
  if (coranComplete) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '32px', textAlign: 'center', position: 'relative' }}>
        <style>{CSS}</style>
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="font-amiri" style={{ fontSize: '72px', color: '#B8962E', display: 'block', marginBottom: '8px' }}>الله</span>
          <h1 className="font-playfair" style={{ fontSize: '30px', fontWeight: 600, color: '#163026', margin: '0 0 16px 0', lineHeight: 1.3 }}>
            MashaAllah !
          </h1>
          <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357', margin: '0 0 8px 0', lineHeight: 1.6, maxWidth: '480px' }}>
            Tu sembles déjà avoir complété tout le parcours Zainly.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', margin: '0 0 36px 0', lineHeight: 1.6 }}>
            Si ce n&apos;est pas le cas, désélectionne les sourates que tu n&apos;as pas encore mémorisées.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button type="button" onClick={() => router.push('/dashboard')} className="font-playfair"
              style={{ padding: '14px 40px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(22,48,38,0.2)' }}>
              Retour au dashboard
            </button>
            <button type="button" onClick={() => setCoranComplete(false)}
              style={{ background: 'none', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', cursor: 'pointer', padding: '8px' }}>
              ← Modifier mes sourates
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Plan screen ──
  if (plan) {
    const modeLabel = plan.planMode === 'start_surah' ? 'Choisir ma sourate de départ'
      : plan.planMode === 'custom_order' ? 'Liberté totale'
      : 'Recommandé par Zainly';
    const summaryTitle = plan.planMode === 'start_surah' ? 'Ton plan va commencer ici'
      : plan.planMode === 'custom_order' ? 'Ton programme personnalisé'
      : 'Ton plan recommandé';
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', position: 'relative' }}
      >
        <style>{CSS}</style>
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '60px 24px 48px', position: 'relative', zIndex: 1 }}>
          <p className="font-amiri" style={{ fontSize: '28px', fontWeight: 700, color: '#163026', textAlign: 'center', margin: '0 0 32px 0' }}>Zainly</p>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#B8962E', border: '1px solid #B8962E', borderRadius: '20px', padding: '5px 14px' }}>
              {plan.planMode === 'custom_order' ? 'PROGRAMME PERSONNALISÉ' : plan.planMode === 'start_surah' ? 'POINT DE DÉPART CHOISI' : 'PLAN RECOMMANDÉ'}
            </span>
          </div>

          <motion.h1 {...fadeUp(0)} className="font-playfair"
            style={{ fontSize: '36px', fontWeight: 600, color: '#163026', textAlign: 'center', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Deviens Hafiz{prenom ? `, ${prenom}.` : '.'}
          </motion.h1>
          <motion.p {...fadeUp(0.2)} className="font-playfair"
            style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 32px 0', lineHeight: 1.6 }}>
            Ton plan est prêt. Il ne reste qu&apos;à commencer.
          </motion.p>

          <motion.div {...fadeUp(0.4)} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC', borderRadius: '16px', padding: '24px 28px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Mode</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>
                  {plan.planMode === 'start_surah' ? 'Choisir ma sourate de départ' : plan.planMode === 'custom_order' ? 'Liberté totale' : 'Recommandé par Zainly'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Rythme</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>{plan.paceLabel ?? `${plan.ayahPerDay} ayats / jour`}</span>
              </div>
              {(plan.planMode === 'recommended' || plan.planMode === 'start_surah') && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Départ</span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>{plan.firstSurahName}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Sourates maîtrisées</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>{knownSurahs.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Révisions</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>Automatiques</span>
              </div>
            </div>
          </motion.div>

          <motion.button {...fadeUp(0.6)} type="button" onClick={() => router.push('/dashboard')} className="font-playfair"
            style={{ marginTop: '8px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 8px 32px rgba(22,48,38,0.25)' }}>
            Commencer aujourd&apos;hui
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '24px' }}>
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', width: 220, height: 220 }}>
            <ProgressCircle percent={loadingPercent} />
            <span className="font-playfair" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '52px', fontWeight: 600, color: '#163026' }}>
              {loadingPercent}%
            </span>
          </div>
          <p className="font-playfair" style={{ marginTop: '36px', fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>{loadingPhrase}</p>
          {error && <p style={{ marginTop: '16px', fontSize: '14px', color: '#c0392b' }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Shared step label ──
  const totalSteps = planMode === 'recommended' ? 4 : 5;
  // For progress bar: map internal step number to display step index (1-based)
  const displayStep = planMode === 'recommended'
    ? (step === 4 ? 3 : step === 5 ? 4 : step) // skip step 3 in recommended
    : step;
  const backStep = step === 2 ? 1 : step === 3 ? 2 : step === 4 ? (planMode === 'recommended' ? 2 : 3) : step === 5 ? 4 : null;

  // ── Main questions flow ──
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', position: 'relative', opacity: pageVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <style>{CSS}</style>
      <span className="font-amiri" style={calligStyle}>الله</span>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', backgroundColor: '#E2D9CC', zIndex: 100 }}>
        <div style={{ height: '100%', backgroundColor: '#B8962E', width: `${(displayStep / totalSteps) * 100}%`, transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '72px 24px 80px', position: 'relative', zIndex: 1 }}>

        {backStep !== null && (
          <button type="button" onClick={() => goStep(backStep)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', padding: '0 0 24px 0', display: 'block' }}>
            ← Retour
          </button>
        )}

        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.28s ease, transform 0.28s ease' }}>

          {/* ════════════════ STEP 1 — TYPE DE PLAN ════════════════ */}
          {step === 1 && (
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ÉTAPE 1{planMode ? ` / ${totalSteps}` : ''}</p>
              <h1 className="font-playfair" style={{ fontSize: '30px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
                Comment veux-tu commencer ton Hifz ?
              </h1>
              <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 28px 0', lineHeight: 1.6 }}>
                Choisis la façon dont tu veux construire ton programme. Zainly organisera ensuite tes sessions jour après jour.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    key: 'recommended',
                    title: 'Recommandé par Zainly',
                    text: 'Le parcours le plus simple. Zainly commence par des sourates accessibles, puis augmente progressivement la difficulté.',
                    sub: 'Idéal si tu veux être guidé sans tout organiser toi-même.',
                    explainerTitle: 'Pourquoi ce mode ?',
                    explainerItems: [
                      'Tu commences par des victoires rapides.',
                      'Tes acquis sont pris en compte.',
                      'Tu avances progressivement.',
                      'Zainly ajoute des révisions pour t\'aider à ne pas oublier.',
                    ],
                  },
                  {
                    key: 'start_surah',
                    title: 'Choisir ma sourate de départ',
                    text: 'Commence par une sourate précise, puis laisse Zainly organiser la suite.',
                    sub: 'Idéal si tu sais déjà par où tu veux commencer.',
                    explainerTitle: 'Comment ça marche ?',
                    explainerItems: [
                      'Tu choisis ta première sourate.',
                      'Zainly commence par celle-ci.',
                      'Ensuite, Zainly continue avec un parcours progressif.',
                      'Les sourates déjà maîtrisées ne te sont pas redemandées.',
                    ],
                  },
                  {
                    key: 'custom_order',
                    title: 'Liberté totale',
                    text: 'Choisis les sourates que tu veux mémoriser et l\'ordre exact dans lequel tu veux les travailler.',
                    sub: 'Zainly suivra ton programme personnalisé, puis ajoutera les révisions nécessaires.',
                    explainerTitle: 'Comment ça marche ?',
                    explainerItems: [
                      'Tu choisis les sourates.',
                      'Tu choisis l\'ordre en les cochant.',
                      'La première sourate cochée sera la première travaillée.',
                      'Zainly suivra uniquement ce programme.',
                      'Si tu veux viser tout le Coran, ajoute toutes les sourates restantes.',
                    ],
                  },
                ].map(m => {
                  const sel = planMode === m.key;
                  const explainerOpen = openExplainer === m.key;
                  return (
                    <div key={m.key}>
                      <button type="button" onClick={() => { setPlanMode(m.key); setOpenExplainer(null); }}
                        style={{
                          width: '100%', padding: '18px 22px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                          border: `1.5px solid ${sel ? '#163026' : '#E2D9CC'}`,
                          backgroundColor: sel ? '#F5F0E6' : '#FFFFFF',
                          transition: 'all 0.2s ease',
                          boxShadow: sel ? '0 4px 16px rgba(22,48,38,0.10)' : 'none',
                        }}>
                        <p className="font-playfair" style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 600, color: '#163026' }}>{m.title}</p>
                        <p style={{ margin: '0 0 4px 0', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', lineHeight: 1.5 }}>{m.text}</p>
                        <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9B8F80', lineHeight: 1.4 }}>{m.sub}</p>
                      </button>
                      <button type="button"
                        onClick={() => setOpenExplainer(explainerOpen ? null : m.key)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#B8962E', padding: '6px 4px', display: 'block' }}>
                        {explainerOpen ? '▲ Fermer' : `▼ ${m.explainerTitle}`}
                      </button>
                      {explainerOpen && (
                        <ModeExplainer title={m.explainerTitle} items={m.explainerItems} onClose={() => setOpenExplainer(null)} />
                      )}
                    </div>
                  );
                })}
              </div>

              <button type="button" onClick={() => goStep(2)} disabled={!planMode} className="font-playfair"
                style={{
                  marginTop: '28px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
                  backgroundColor: planMode ? '#163026' : '#E2D9CC',
                  color: planMode ? '#FFFFFF' : '#A09890',
                  border: 'none', borderRadius: '12px',
                  cursor: planMode ? 'pointer' : 'default',
                  boxShadow: planMode ? '0 8px 32px rgba(22,48,38,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                Continuer →
              </button>
            </div>
          )}

          {/* ════════════════ STEP 2 — SOURATES MAÎTRISÉES ════════════════ */}
          {step === 2 && (() => {
            const visible2 = getVisibleForJuz(juzFilter, null);
            const allJuz30Nums = (JUZ_SURAHS[30] ?? []).map(name => ZAINLY_SURAHS.find(s => s.name === name)?.surah).filter(Boolean);
            const allJuz30Known = allJuz30Nums.every(n => knownSet.has(n));

            return (
              <div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ÉTAPE 2 / {totalSteps}</p>
                <h1 className="font-playfair" style={{ fontSize: '30px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
                  Quelles sourates maîtrises-tu déjà ?
                </h1>
                <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                  Coche uniquement les sourates que tu sais déjà réciter correctement.
                </p>
                <div style={{ backgroundColor: 'rgba(184,150,46,0.10)', border: '1.5px solid rgba(184,150,46,0.35)', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7a5c00', margin: '0 0 4px 0', fontWeight: 700 }}>Important :</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7a5c00', margin: 0, lineHeight: 1.5 }}>Ne coche pas les sourates que tu veux apprendre. Coche seulement celles que tu connais déjà.</p>
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9B8F80', margin: '0 0 12px 0', lineHeight: 1.5, textAlign: 'center' }}>
                  Cela permet à Zainly de ne pas te faire recommencer ce que tu maîtrises déjà.
                </p>

                {knownSurahs.length === 0 && (
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9B8F80', textAlign: 'center', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    Aucune sourate maîtrisée pour l&apos;instant ? Aucun problème. Zainly te guidera pas à pas.
                  </p>
                )}

                {allKnown && (
                  <div style={{ backgroundColor: 'rgba(192,57,43,0.08)', border: '1.5px solid rgba(192,57,43,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#c0392b', margin: 0, lineHeight: 1.5 }}>
                      Tu as indiqué maîtriser toutes les sourates. Pour l&apos;instant, choisis au moins une sourate à travailler ou décoche celles que tu veux revoir.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <button type="button" onClick={() => setKnownSurahs([])}
                    style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s',
                      border: `1.5px solid ${knownSurahs.length === 0 ? '#163026' : '#E2D9CC'}`,
                      backgroundColor: knownSurahs.length === 0 ? '#163026' : '#FFFFFF',
                      color: knownSurahs.length === 0 ? '#FFFFFF' : '#6B6357',
                    }}>Aucune</button>
                  <button type="button" disabled={allJuz30Known}
                    onClick={() => {
                      setKnownSurahs(prev => {
                        const next = [...prev];
                        allJuz30Nums.forEach(n => { if (!next.includes(n)) next.push(n); });
                        return next;
                      });
                    }}
                    style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, borderRadius: '10px', transition: 'all 0.2s',
                      cursor: allJuz30Known ? 'default' : 'pointer',
                      border: `1.5px solid ${allJuz30Known ? '#E2D9CC' : '#B8962E'}`,
                      backgroundColor: allJuz30Known ? '#F5F0E6' : '#FFFFFF',
                      color: allJuz30Known ? '#A09890' : '#B8962E',
                    }}>Je connais Juz Amma</button>
                </div>

                <JuzPillsComponent value={juzFilter} onChange={setJuzFilter} />

                <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2D9CC', borderRadius: '16px', maxHeight: '340px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 0' }}>
                  {visible2.length === 0 && (
                    <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#A09890', padding: '24px' }}>Aucune sourate dans ce Juz.</p>
                  )}
                  {visible2.map(s => {
                    const checked = knownSet.has(s.surah);
                    const qNum = SURAH_QURAN_POS[s.name] ?? s.surah;
                    return (
                      <label key={s.surah} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', cursor: 'pointer', backgroundColor: checked ? 'rgba(22,48,38,0.04)' : 'transparent', transition: 'background-color 0.15s' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleKnown(s.surah)}
                          style={{ accentColor: '#163026', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }} />
                        <span style={{ fontSize: '15px', color: '#163026', flex: 1 }}>
                          <span style={{ color: '#6B6357', marginRight: '6px', fontSize: '12px' }}>{qNum}.</span>
                          {s.name}
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9B8F80' }}>({s.ayahs} ayats)</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <PartialSurahSection
                  knownSet={knownSet}
                  partialKnownSurahs={partialKnownSurahs}
                  setPartialKnownSurahs={setPartialKnownSurahs}
                />

                <button type="button" onClick={goToStep3} disabled={allKnown} className="font-playfair"
                  style={{
                    marginTop: '24px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
                    backgroundColor: allKnown ? '#E2D9CC' : '#163026',
                    color: allKnown ? '#A09890' : '#FFFFFF',
                    border: 'none', borderRadius: '12px',
                    cursor: allKnown ? 'default' : 'pointer',
                    boxShadow: allKnown ? 'none' : '0 8px 32px rgba(22,48,38,0.2)',
                    transition: 'all 0.2s ease',
                  }}>
                  Continuer →
                </button>
              </div>
            );
          })()}

          {/* ════════════════ STEP 3 — MODE-SPECIFIC ════════════════ */}
          {step === 3 && planMode === 'start_surah' && (() => {
            const visible3 = getVisibleForJuz(startJuzFilter, knownSet);
            return (
              <div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ÉTAPE 3 / {totalSteps}</p>
                <h1 className="font-playfair" style={{ fontSize: '30px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
                  Par quelle sourate veux-tu commencer ?
                </h1>
                <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 8px 0', lineHeight: 1.6 }}>
                  Choisis la première sourate que tu veux mémoriser avec Zainly.
                </p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#9B8F80', textAlign: 'center', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  Zainly commencera par cette sourate, puis organisera la suite automatiquement.
                </p>

                <JuzPillsComponent value={startJuzFilter} onChange={setStartJuzFilter} />

                <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2D9CC', borderRadius: '16px', maxHeight: '380px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 0' }}>
                  {visible3.length === 0 && (
                    <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#A09890', padding: '24px' }}>Toutes les sourates de ce Juz sont déjà maîtrisées.</p>
                  )}
                  {visible3.map(s => {
                    const sel = startingSurah === s.surah;
                    const qNum = SURAH_QURAN_POS[s.name] ?? s.surah;
                    return (
                      <button key={s.surah} type="button" onClick={() => setStartingSurah(s.surah)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', cursor: 'pointer', textAlign: 'left', border: 'none', borderBottom: '1px solid #F0EBE1',
                          backgroundColor: sel ? 'rgba(22,48,38,0.06)' : 'transparent', transition: 'background-color 0.15s' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${sel ? '#163026' : '#E2D9CC'}`, backgroundColor: sel ? '#163026' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sel && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                        </span>
                        <span style={{ fontSize: '15px', color: '#163026', flex: 1 }}>
                          <span style={{ color: '#6B6357', marginRight: '6px', fontSize: '12px' }}>{qNum}.</span>
                          {s.name}
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9B8F80' }}>({s.ayahs} ayats)</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button type="button" onClick={() => goStep(4)} disabled={!startingSurah} className="font-playfair"
                  style={{
                    marginTop: '24px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
                    backgroundColor: startingSurah ? '#163026' : '#E2D9CC',
                    color: startingSurah ? '#FFFFFF' : '#A09890',
                    border: 'none', borderRadius: '12px',
                    cursor: startingSurah ? 'pointer' : 'default',
                    boxShadow: startingSurah ? '0 8px 32px rgba(22,48,38,0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                  Continuer →
                </button>
              </div>
            );
          })()}

          {step === 3 && planMode === 'custom_order' && (
            <CustomOrderStep
              totalSteps={totalSteps}
              knownSet={knownSet}
              customOrder={customOrder}
              setCustomOrder={setCustomOrder}
              customJuzFilter={customJuzFilter}
              setCustomJuzFilter={setCustomJuzFilter}
              toggleCustom={toggleCustom}
              goStep={goStep}
              partialKnownSurahs={partialKnownSurahs}
            />
          )}

          {/* ════════════════ STEP 4 — RYTHME ════════════════ */}
          {step === 4 && (
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ÉTAPE {planMode === 'recommended' ? '3' : '4'} / {totalSteps}</p>
              <h1 className="font-playfair" style={{ fontSize: '30px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
                Quel rythme veux-tu suivre ?
              </h1>
              <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.6 }}>
                Choisis une quantité que tu peux tenir régulièrement. La régularité est plus importante que la vitesse.
              </p>

              {/* Tabs ayats / pages */}
              <div style={{ display: 'flex', backgroundColor: '#E2D9CC', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
                {['ayahs', 'pages'].map(tab => (
                  <button key={tab} type="button" onClick={() => { setPaceTab(tab); setAyahPerDay(null); setPagePaceKey(null); setPaceLabel(null); }}
                    style={{
                      flex: 1, padding: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                      border: 'none', borderRadius: '8px', transition: 'all 0.2s',
                      backgroundColor: paceTab === tab ? '#FFFFFF' : 'transparent',
                      color: paceTab === tab ? '#163026' : '#6B6357',
                      boxShadow: paceTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      fontFamily: 'DM Sans, sans-serif',
                    }}>
                    {tab === 'ayahs' ? 'Par ayats' : 'Par pages'}
                  </button>
                ))}
              </div>

              {paceTab === 'ayahs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {AYAH_RHYTHMS.map(r => {
                    const sel = paceTab === 'ayahs' && ayahPerDay === r.ayah;
                    return (
                      <button key={r.ayah} type="button" onClick={() => selectAyahRhythm(r.ayah)}
                        style={{
                          width: '100%', padding: '16px 20px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                          border: `1.5px solid ${sel ? '#163026' : '#E2D9CC'}`,
                          backgroundColor: sel ? '#F5F0E6' : '#FFFFFF',
                          transition: 'all 0.2s ease',
                          boxShadow: sel ? '0 4px 16px rgba(22,48,38,0.10)' : 'none',
                        }}>
                        <p className="font-playfair" style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 600, color: '#163026' }}>{r.label}</p>
                        <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: sel ? '#163026' : '#6B6357' }}>{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {paceTab === 'pages' && (
                <div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9B8F80', textAlign: 'center', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    Le rythme par page est approximatif. Zainly l&apos;adapte selon la longueur des versets.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {PAGE_RHYTHMS_UI.map(r => {
                      const sel = paceTab === 'pages' && pagePaceKey === r.key;
                      return (
                        <div key={r.key}>
                          <button type="button" onClick={() => selectPageRhythm(r.key)}
                            style={{
                              width: '100%', padding: '16px 20px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                              border: `1.5px solid ${sel ? '#163026' : '#E2D9CC'}`,
                              backgroundColor: sel ? '#F5F0E6' : '#FFFFFF',
                              transition: 'all 0.2s ease',
                              boxShadow: sel ? '0 4px 16px rgba(22,48,38,0.10)' : 'none',
                            }}>
                            <p className="font-playfair" style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 600, color: '#163026' }}>{r.label}</p>
                            <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: sel ? '#163026' : '#6B6357' }}>{r.desc}</p>
                          </button>
                          {sel && r.key === 'full_page' && (
                            <div style={{ marginTop: '6px', backgroundColor: 'rgba(184,150,46,0.10)', border: '1px solid rgba(184,150,46,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#7a5c00', margin: 0, lineHeight: 1.5 }}>
                                Ce rythme est exigeant. Choisis-le seulement si tu as déjà une bonne habitude de mémorisation.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {ayahPerDay && (
                <div style={{ textAlign: 'center', marginTop: '16px', padding: '12px 20px', backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC', borderRadius: '12px' }}>
                  <p className="font-playfair" style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: '#163026' }}>
                    En 30 jours, tu mémoriseras ~{Math.round(ayahPerDay * 6 * 4.33)} ayats.
                  </p>
                  {estYears && (
                    <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E' }}>
                      ~{estYears} an{estYears > 1 ? 's' : ''} pour {planMode === 'custom_order' ? 'ton programme' : 'le Coran complet'}
                    </p>
                  )}
                </div>
              )}

              <button type="button" onClick={() => goStep(5)} disabled={!ayahPerDay} className="font-playfair"
                style={{
                  marginTop: '24px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
                  backgroundColor: ayahPerDay ? '#163026' : '#E2D9CC',
                  color: ayahPerDay ? '#FFFFFF' : '#A09890',
                  border: 'none', borderRadius: '12px',
                  cursor: ayahPerDay ? 'pointer' : 'default',
                  boxShadow: ayahPerDay ? '0 8px 32px rgba(22,48,38,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                Continuer →
              </button>
            </div>
          )}

          {/* ════════════════ STEP 5 — RÉSUMÉ ════════════════ */}
          {step === 5 && (
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ÉTAPE {totalSteps} / {totalSteps}</p>
              <h1 className="font-playfair" style={{ fontSize: '30px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
                {planMode === 'start_surah' ? 'Ton plan va commencer ici' : planMode === 'custom_order' ? 'Ton programme personnalisé' : 'Ton plan recommandé'}
              </h1>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC', borderRadius: '16px', padding: '24px', marginBottom: '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Mode</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026', textAlign: 'right', maxWidth: '180px' }}>
                      {planMode === 'start_surah' ? 'Choisir ma sourate de départ' : planMode === 'custom_order' ? 'Liberté totale' : 'Recommandé par Zainly'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Rythme</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>{paceLabel}</span>
                  </div>
                  {planMode === 'recommended' && (() => {
                    const firstUnknown = ZAINLY_SURAHS.find(s => !knownSet.has(s.surah));
                    const partial = firstUnknown && partialKnownSurahs[firstUnknown.surah];
                    if (!firstUnknown) return null;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Point de départ prévu</span>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>
                          {firstUnknown.name}{partial ? ` — ayat ${partial.to + 1}` : ''}
                        </span>
                      </div>
                    );
                  })()}
                  {planMode === 'start_surah' && startingSurah && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Départ</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>
                        {ZAINLY_SURAHS.find(s => s.surah === startingSurah)?.name ?? ''}{partialKnownSurahs[startingSurah] ? ` — ayat ${partialKnownSurahs[startingSurah].to + 1}` : ''}
                      </span>
                    </div>
                  )}
                  {planMode === 'custom_order' && customOrder.length > 0 && (() => {
                    const availCount = ZAINLY_SURAHS.filter(s => !knownSet.has(s.surah)).length;
                    const isComplete = customOrder.length >= availCount;
                    const label = isComplete ? 'Ordre personnalisé' : 'Priorités choisies';
                    const partial0 = partialKnownSurahs[customOrder[0]] || partialKnownSurahs[String(customOrder[0])];
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>{label}</span>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026', textAlign: 'right', maxWidth: '200px' }}>
                            {customOrder.slice(0, 3).map(n => ZAINLY_SURAHS.find(s => s.surah === n)?.name ?? '').join(', ')}{customOrder.length > 3 ? ` +${customOrder.length - 3} autres` : ''}
                          </span>
                        </div>
                        {partial0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Premier passage</span>
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>
                              {ZAINLY_SURAHS.find(s => s.surah === customOrder[0])?.name ?? ''} — ayat {partial0.to + 1}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Portée du programme</span>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026', textAlign: 'right', maxWidth: '200px' }}>
                            Ce programme couvre toutes les sourates non maîtrisées.
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Sourates maîtrisées</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>{knownSurahs.length}</span>
                  </div>
                  {Object.keys(partialKnownSurahs).length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Sourates commencées</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#B8962E' }}>
                        {Object.entries(partialKnownSurahs).map(([num, { to }]) => {
                          const s = ZAINLY_SURAHS.find(x => x.surah === parseInt(num));
                          return s ? `${s.name} (jusqu'à ${to})` : null;
                        }).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Révisions</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#163026' }}>Automatiques</span>
                  </div>
                  {estYears && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>Estimation</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#B8962E' }}>
                        ~{estYears} an{estYears > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#c0392b', textAlign: 'center', margin: '0 0 16px 0' }}>{error}</p>
              )}

              <button type="button" onClick={generate} disabled={loading} className="font-playfair"
                style={{
                  width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
                  backgroundColor: '#163026', color: '#FFFFFF', border: 'none', borderRadius: '12px',
                  cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
                  boxShadow: '0 8px 32px rgba(22,48,38,0.2)', transition: 'all 0.2s ease',
                }}>
                Créer mon plan
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
