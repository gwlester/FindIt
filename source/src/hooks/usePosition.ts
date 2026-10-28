import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type Position = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy radius in metres, if reported. */
  accuracy: number | null;
  timestamp: number;
};

export type PermissionState = 'pending' | 'granted' | 'denied';

/** Requests foreground location permission, sharing one in-flight request between callers. */
let permissionRequest: Promise<boolean> | null = null;
export function ensureLocationPermission(): Promise<boolean> {
  permissionRequest ??= Location.requestForegroundPermissionsAsync()
    .then((r) => r.granted)
    .finally(() => {
      permissionRequest = null;
    });
  return permissionRequest;
}

/** Streams high-accuracy GPS fixes while mounted. */
export function usePosition() {
  const [position, setPosition] = useState<Position | null>(null);
  const [permission, setPermission] = useState<PermissionState>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const granted = await ensureLocationPermission();
      if (cancelled) return;
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) return;
      if (!(await Location.hasServicesEnabledAsync())) {
        setError('Location services are turned off');
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          setError(null);
          setPosition({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            timestamp: loc.timestamp,
          });
        },
        (reason) => setError(reason),
      );
      if (cancelled) sub.remove();
      else subscription = sub;
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { position, permission, error };
}
