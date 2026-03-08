// utils/useDebouncedGoBack.ts
import { useRef, useCallback } from 'react';

export function useDebouncedGoBack(goBackFn: () => void, delay = 500) {
  const lastTapRef = useRef(0);

  const handleGoBack = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < delay) return; // Prevent rapid taps
    lastTapRef.current = now;
    goBackFn();
  }, [goBackFn, delay]);

  return handleGoBack;
}
