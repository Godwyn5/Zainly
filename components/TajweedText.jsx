'use client';

import { tajweedColor } from '@/lib/tajweedColors';

/**
 * Renders Arabic text with optional tajweed coloring.
 *
 * Props:
 *   plainText        {string}   — plain Arabic text (always required, used as fallback)
 *   tajweedSegments  {Array}    — [{ text, rule }] (optional)
 *   enabled          {boolean}  — if false, renders plainText with no coloring
 *   style            {object}   — additional styles applied to the wrapper element
 *   className        {string}   — optional className
 */
export default function TajweedText({ plainText, tajweedSegments, enabled = false, style = {}, className = '' }) {
  const hasSegments = enabled && Array.isArray(tajweedSegments) && tajweedSegments.length > 0;

  if (!hasSegments) {
    return (
      <span className={className} style={style}>
        {plainText}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {tajweedSegments.map((seg, i) => (
        <span
          key={i}
          style={{
            color: tajweedColor(seg.rule),
            transition: 'color 0.3s ease',
          }}
        >
          {seg.text}
        </span>
      ))}
    </span>
  );
}
