import { useEffect, useState } from 'react';

import FindItNative, { type GnssStatus } from '../../modules/findit-native';
import { debugLogThrottled } from '../lib/debugLog';
import { ensureLocationPermission } from './usePosition';

/**
 * Live satellite counts from the Android GNSS engine. With `fullTracking`, the chipset is
 * also asked to track every satellite continuously (Android 12+), which can keep more of
 * them in the fix.
 */
export function useGnssStatus({ fullTracking }: { fullTracking: boolean }) {
  const [status, setStatus] = useState<GnssStatus | null>(null);
  const [fullTrackingOn, setFullTrackingOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = FindItNative.addListener('onGnssStatus', (s) => {
      const by = Object.entries(s.usedByConstellation)
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => `${name} ${n}`)
        .join(', ');
      debugLogThrottled('gnss', `${s.known} known, ${s.inView} in view, ${s.used} used in fix${by ? ` (${by})` : ''}`, 5000);
      setStatus(s);
    });
    let cancelled = false;

    ensureLocationPermission()
      .then(async (granted) => {
        if (cancelled || !granted) return;
        const on = await FindItNative.startGnssStatus(fullTracking);
        if (!cancelled) setFullTrackingOn(on);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      subscription.remove();
      FindItNative.stopGnssStatus().catch(() => {});
    };
  }, [fullTracking]);

  return { status, fullTrackingOn, error };
}
