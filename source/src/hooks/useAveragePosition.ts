import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { averageFixes, type Fix } from '../lib/averaging';
import { ensureLocationPermission } from './usePosition';

/** Stop collecting after this many fixes (~10 minutes at 1 Hz). */
const MAX_FIXES = 600;

/**
 * Collects GPS fixes while `running` so they can be averaged. Has its own location
 * subscription so it is independent of other position hooks on the screen.
 */
export function useAveragePosition() {
  const [running, setRunning] = useState(false);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [error, setError] = useState<string | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const count = useRef(0);
  // Incremented on every start/stop so a subscription that resolves late is dropped.
  const session = useRef(0);

  const stop = useCallback(() => {
    session.current++;
    subscription.current?.remove();
    subscription.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    const mySession = session.current;
    count.current = 0;
    setFixes([]);
    setError(null);
    if (!(await ensureLocationPermission())) {
      setError('Location permission denied');
      return;
    }
    if (session.current !== mySession) return;
    setRunning(true);
    try {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          if (session.current !== mySession) return;
          const fix: Fix = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            timestamp: loc.timestamp,
          };
          setFixes((current) => [...current, fix]);
          if (++count.current >= MAX_FIXES) stop();
        },
        (reason) => setError(reason),
      );
      if (session.current !== mySession) sub.remove();
      else subscription.current = sub;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setFixes([]);
    setError(null);
  }, [stop]);

  useEffect(
    () => () => {
      session.current++;
      subscription.current?.remove();
    },
    [],
  );

  const average = useMemo(() => averageFixes(fixes), [fixes]);

  return { running, fixes: fixes.length, average, error, start, stop, reset };
}
