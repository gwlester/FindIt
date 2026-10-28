import { useEffect, useState } from 'react';

import FindItNative, { type GnssStatus } from '../../modules/findit-native';
import { ensureLocationPermission } from './usePosition';

/** Live satellite counts from the Android GNSS engine. */
export function useGnssStatus() {
  const [status, setStatus] = useState<GnssStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = FindItNative.addListener('onGnssStatus', setStatus);
    let cancelled = false;

    ensureLocationPermission()
      .then((granted) => {
        if (!cancelled && granted) return FindItNative.startGnssStatus();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      subscription.remove();
      FindItNative.stopGnssStatus().catch(() => {});
    };
  }, []);

  return { status, error };
}
