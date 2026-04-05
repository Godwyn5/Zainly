'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'zainly_show_tajweed';

/**
 * Persists the tajweed toggle preference in localStorage.
 * Shared between session and revision — changing in one propagates to the other.
 */
export function useTajweed() {
  const [showTajweed, setShowTajweedState] = useState(false);

  // Read from localStorage on mount (client-only)
  useEffect(() => {
    try {
      setShowTajweedState(localStorage.getItem(STORAGE_KEY) === 'true');
    } catch (_) {}
  }, []);

  function setShowTajweed(value) {
    setShowTajweedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (_) {}
  }

  return { showTajweed, setShowTajweed };
}
