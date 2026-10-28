import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { ensureLocationPermission } from './usePosition';

export type Heading = {
  /** Degrees clockwise from north that the top of the phone points to. */
  degrees: number;
  /** True if `degrees` is relative to true north (otherwise magnetic north). */
  isTrue: boolean;
  /** Android sensor calibration level: 0 (unreliable) – 3 (high). */
  accuracy: number;
};

export function useHeading() {
  const [heading, setHeading] = useState<Heading | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      if (!(await ensureLocationPermission()) || cancelled) return;
      const sub = await Location.watchHeadingAsync((h) => {
        const isTrue = h.trueHeading >= 0;
        setHeading({ degrees: isTrue ? h.trueHeading : h.magHeading, isTrue, accuracy: h.accuracy });
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
