// hooks/useDebounce.ts
// Race-safe debounce. Returns the input after `delay` ms of quiet time.
// Caller is responsible for AbortController on the actual request.
"use client";

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
