'use client';

import { useEffect, useState } from 'react';

const KEY = 'world-cup-ai-access-code';

export function useAIAccessCode() {
  const [accessCode, setAccessCodeState] = useState('');
  useEffect(() => {
    const initialize = window.setTimeout(() => {
      setAccessCodeState(window.sessionStorage.getItem(KEY) ?? '');
    }, 0);
    return () => window.clearTimeout(initialize);
  }, []);
  function setAccessCode(value: string) {
    setAccessCodeState(value);
    if (value) window.sessionStorage.setItem(KEY, value);
    else window.sessionStorage.removeItem(KEY);
  }
  return { accessCode, setAccessCode };
}
