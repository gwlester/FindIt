// expo-keep-awake mock: useKeepAwake records which tags are active (mounted) right now.
import { useEffect } from 'react';

const active = new Map<string, number>();

export function useKeepAwake(tag = 'default') {
  useEffect(() => {
    active.set(tag, (active.get(tag) ?? 0) + 1);
    return () => {
      const n = (active.get(tag) ?? 1) - 1;
      if (n === 0) active.delete(tag);
      else active.set(tag, n);
    };
  }, [tag]);
}

export function activeKeepAwakeTags(): string[] {
  return [...active.keys()].sort();
}

export function resetKeepAwakeMock() {
  active.clear();
}
