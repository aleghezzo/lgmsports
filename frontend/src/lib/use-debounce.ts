import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates `delay`ms after the
 * caller stopped changing the input. Useful for typeahead inputs so we don't
 * fire one HTTP request per keystroke.
 */
export function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
