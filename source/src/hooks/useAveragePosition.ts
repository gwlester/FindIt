import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { averageFixes, hasMovedAway, type Fix } from '../lib/averaging';
import { ensureLocationPermission } from './usePosition';

/** Stop collecting after this many fixes (~10 minutes at 1 Hz). */
const MAX_FIXES = 600;
/** With stopWhenMoving, movement is only judged once this many fixes have been averaged. */
const MIN_FIXES_TO_JUDGE_MOVEMENT = 3;

/**
 * Collects GPS fixes while `running` so they can be averaged. Has its own location
 * subscription so it is independent of other position hooks on the screen.
 *
 * With `stopWhenMoving`, a fix far from the average so far (see hasMovedAway) means the
 * user has walked off: averaging stops, that fix is left out, and `movedAway` is set.
 */
export function useAveragePosition({ stopWhenMoving = false }: { stopWhenMoving?: boolean } = {}) {
  const [running, setRunning] = useState(false);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [movedAway, setMovedAway] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const collected = useRef<Fix[]>([]);
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
    collected.current = [];
    setFixes([]);
    setError(null);
    setMovedAway(false);
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
          if (stopWhenMoving && collected.current.length >= MIN_FIXES_TO_JUDGE_MOVEMENT) {
            const sofar = averageFixes(collected.current);
            if (sofar && hasMovedAway(sofar, fix)) {
              setMovedAway(true);
              stop();
              return;
            }
          }
          collected.current = [...collected.current, fix];
          setFixes(collected.current);
          if (collected.current.length >= MAX_FIXES) stop();
        },
        (reason) => setError(reason),
      );
      if (session.current !== mySession) sub.remove();
      else subscription.current = sub;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  }, [stop, stopWhenMoving]);

  const reset = useCallback(() => {
    stop();
    collected.current = [];
    setFixes([]);
    setError(null);
    setMovedAway(false);
  }, [stop]);

  useEffect(
    () => () => {
      session.current++;
      subscription.current?.remove();
    },
    [],
  );

  const average = useMemo(() => averageFixes(fixes), [fixes]);

  return { running, fixes: fixes.length, average, error, movedAway, start, stop, reset };
}
