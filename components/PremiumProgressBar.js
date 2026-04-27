'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * PremiumProgressBar
 *
 * Props:
 *  value        number   — ayats memorized (or any current value)
 *  max          number   — total (default 6236)
 *  percentage   number   — pre-computed 0–100 (takes priority over value/max)
 *  label        string   — optional aria-label
 *  size         'sm'|'md'|'lg'   — track height (default 'md')
 *  showGlow     boolean  — glow shadow on fill (default true)
 *  showMarker   boolean  — orb at fill tip (default true)
 *  showShimmer  boolean  — one-shot shimmer on mount (default true)
 *  motif        string   — optional micro-phrase below bar
 */
export default function PremiumProgressBar({
  value,
  max = 6236,
  percentage,
  label = 'Progression',
  size = 'md',
  showGlow = true,
  showMarker = true,
  showShimmer = true,
  motif,
}) {
  const pct = percentage !== undefined
    ? Math.min(Math.max(percentage, 0), 100)
    : Math.min(Math.max((value / max) * 100, 0), 100);

  const trackHeights = { sm: '6px', md: '10px', lg: '14px' };
  const trackH = trackHeights[size] ?? trackHeights.md;

  // Animated fill: starts at 0, animates to real pct after mount
  const [displayPct, setDisplayPct] = useState(0);
  const [shimmerActive, setShimmerActive] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (reducedMotion.current) {
      setDisplayPct(pct);
      return;
    }
    // Short delay so CSS transition fires after first paint
    const t = setTimeout(() => {
      setDisplayPct(pct);
      if (showShimmer) {
        setShimmerActive(true);
        // Remove shimmer after it has played once (~1.4s)
        const s = setTimeout(() => setShimmerActive(false), 1400);
        return () => clearTimeout(s);
      }
    }, 80);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Minimum visual width so even 0.1% shows a sliver
  const visualPct = displayPct > 0 && displayPct < 1.2 ? 1.2 : displayPct;

  return (
    <div style={{ width: '100%' }}>
      {/* Track */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max ?? 100}
        aria-valuenow={value ?? Math.round((pct / 100) * (max ?? 100))}
        aria-label={label}
        style={{
          position: 'relative',
          height: trackH,
          borderRadius: '999px',
          backgroundColor: '#EDE5D8',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}
      >
        {/* Fill */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${visualPct}%`,
            borderRadius: '999px',
            background: 'linear-gradient(90deg, #0F3D2E 0%, #1A5C3A 55%, #236B45 100%)',
            boxShadow: showGlow && displayPct > 0
              ? '0 0 8px rgba(15,61,46,0.35), 0 0 2px rgba(184,150,46,0.20)'
              : 'none',
            transition: reducedMotion.current
              ? 'none'
              : 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
          }}
        >
          {/* Highlight reflet */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '45%',
            borderRadius: '999px 999px 0 0',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Shimmer one-shot */}
          {shimmerActive && displayPct > 0 && (
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              width: '40%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
              animation: 'ppbShimmer 1.1s ease forwards',
              pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>

      {/* Marker orb at fill tip */}
      {showMarker && displayPct > 0 && (
        <div style={{
          position: 'relative',
          height: 0,
        }}>
          <div style={{
            position: 'absolute',
            top: `-${parseInt(trackH) / 2 + 4}px`,
            left: `calc(${visualPct}% - 6px)`,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#C9A227',
            boxShadow: '0 0 0 2px rgba(201,162,39,0.20)',
            transition: reducedMotion.current
              ? 'none'
              : 'left 900ms cubic-bezier(0.22, 1, 0.36, 1)',
            pointerEvents: 'none',
          }} />
        </div>
      )}

      {/* Optional motif phrase */}
      {motif && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          color: '#9B8F80',
          margin: '10px 0 0 0',
          fontStyle: 'italic',
          letterSpacing: '0.02em',
        }}>
          {motif}
        </p>
      )}

      {/* Keyframe for shimmer — injected once */}
      <style>{`
        @keyframes ppbShimmer {
          from { left: -40%; }
          to   { left: 120%;  }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-ppb-shimmer] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
