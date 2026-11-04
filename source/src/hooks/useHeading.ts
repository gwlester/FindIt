import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { debugLog, debugLogThrottled } from '../lib/debugLog';
import { smoothAngle } from '../lib/smoothing';
import { ensureLocationPermission } from './usePosition';

export type Heading = {
  /** Degrees clockwise from north that the top of the phone points to. */
  degrees: number;
  /** True if `degrees` is relative to true north (otherwise magnetic north). */
  isTrue: boolean;
  /** Android sensor calibration level: 0 (unreliable) – 3 (high). */
  accuracy: number;
};

/** Streams the compass heading, smoothed to stop the rose jittering. */
export function useHeading() {
  const [heading, setHeading] = useState<Heading | null>(null);
  const smoothed = useRef<number | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      if (!(await ensureLocationPermission()) || cancelled) return;
      const sub = await Location.watchHeadingAsync((h) => {
        const isTrue = h.trueHeading >= 0;
        smoothed.current = smoothAngle(smoothed.current, isTrue ? h.trueHeading : h.magHeading);
        debugLogThrottled(
          'compass',
          `Heading ${Math.round(smoothed.current)}° ${isTrue ? 'true' : 'magnetic'}, calibration ${h.accuracy} of 3`,
          5000,
        );
        setHeading({ degrees: smoothed.current, isTrue, accuracy: h.accuracy });
      });
      if (cancelled) sub.remove();
      else subscription = sub;
    })().catch(() => setHeading(null));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return heading;
}

/** How long to wait for a first heading before deciding the phone has no compass sensor. */
export const NO_COMPASS_AFTER_MS = 8000;

/**
 * True when no heading has arrived after NO_COMPASS_AFTER_MS, i.e. the phone probably has no
 * magnetometer (common on small budget phones). The compass screen then draws its arrow from
 * north instead of leaving it out.
 */
export function useNoCompass(heading: Heading | null): boolean {
  const [timedOut, setTimedOut] = useState(false);
  const haveHeading = heading != null;

  useEffect(() => {
    if (haveHeading) return undefined;
    const timer = setTimeout(() => {
      debugLog('compass', `No compass reading after ${NO_COMPASS_AFTER_MS / 1000} s; this phone may have no compass sensor`);
      setTimedOut(true);
    }, NO_COMPASS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [haveHeading]);

  return timedOut && !haveHeading;
}
