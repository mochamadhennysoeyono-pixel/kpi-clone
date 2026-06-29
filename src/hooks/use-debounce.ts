// src/hooks/use-debounce.ts
import { useCallback } from 'react';

export function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const cb = useCallback(callback, [callback]);

  return useCallback(
    (...args: A) => {
      const timer = setTimeout(() => {
        cb(...args);
      }, delay);

      return () => {
        clearTimeout(timer);
      };
    },
    [cb, delay]
  );
}
