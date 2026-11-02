// Admission never queues work; callers retain their own bounded retry policy.
export function createWorkBudget(max: number, perKey = max) {
  let active = 0;
  const keys = new Map<string, number>();
  return {
    acquire(key = "global"): (() => void) | null {
      const used = keys.get(key) ?? 0;
      if (active >= max || used >= perKey) return null;
      active++;
      keys.set(key, used + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        active--;
        const remaining = (keys.get(key) ?? 1) - 1;
        if (remaining === 0) keys.delete(key);
        else keys.set(key, remaining);
      };
    },
  };
}
