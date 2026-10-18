"use client";

// Form state with a saved baseline: `dirty` is true while the current
// values differ from the last saved (or initial) ones, `reset()` throws
// edits away, `commit()` makes the current values the new baseline after a
// successful save. Comparison is by JSON, which is exact for the plain
// data these forms hold (strings, numbers, arrays).

import { useCallback, useMemo, useState } from "react";

export function useFormState<T>(initial: T) {
  const [baseline, setBaseline] = useState(initial);
  const [values, setValues] = useState(initial);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(baseline), [values, baseline]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  const reset = useCallback(() => setValues(baseline), [baseline]);
  const commit = useCallback((next?: T) => {
    setBaseline(next ?? values);
    if (next) setValues(next);
  }, [values]);

  return { values, setValues, set, dirty, reset, commit, baseline };
}
