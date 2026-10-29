import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { ensureLocationPermission, usePosition } from '../../src/hooks/usePosition';
import { emitPosition, emitPositionError, positionWatcherCount } from '../helpers/expoLocationMock';

const flush = () => act(async () => {});

describe('usePosition', () => {
  it('streams fixes after permission is granted', async () => {
    const { result } = await renderHook(() => usePosition());
    await flush();
    expect(result.current.permission).toBe('granted');
    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: Location.Accuracy.BestForNavigation }),
      expect.any(Function),
      expect.any(Function),
    );
    await act(async () => emitPosition({ latitude: 1, longitude: 2, accuracy: 5 }, 1000));
    expect(result.current.position).toEqual({ latitude: 1, longitude: 2, accuracy: 5, timestamp: 1000 });
  });

  it('reports denied permission and never subscribes', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const { result } = await renderHook(() => usePosition());
    await flush();
    expect(result.current.permission).toBe('denied');
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  it('reports location services off, stream errors, and thrown errors', async () => {
    jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(false);
    const { result } = await renderHook(() => usePosition());
    await flush();
    expect(result.current.error).toBe('Location services are turned off');
    await act(async () => emitPositionError('GPS lost'));
    expect(result.current.error).toBe('GPS lost');
    await act(async () => emitPosition({ latitude: 1, longitude: 2 }));
    expect(result.current.error).toBeNull();

    jest.mocked(Location.watchPositionAsync).mockRejectedValueOnce(new Error('boom'));
    const second = await renderHook(() => usePosition());
    await flush();
    expect(second.result.current.error).toBe('boom');

    jest.mocked(Location.watchPositionAsync).mockRejectedValueOnce('odd');
    const third = await renderHook(() => usePosition());
    await flush();
    expect(third.result.current.error).toBe('odd');
  });

  it('smooths positions when asked', async () => {
    const { result } = await renderHook(() => usePosition({ smooth: true }));
    await flush();
    await act(async () => emitPosition({ latitude: 30, longitude: -91, accuracy: 5 }, 0));
    await act(async () => emitPosition({ latitude: 30 + 10 / 110574, longitude: -91, accuracy: 5 }, 1000));
    expect(result.current.position!.latitude).toBeCloseTo(30 + 3.5 / 110574, 9);
  });

  it('unsubscribes on unmount, including when unmounted before subscribing', async () => {
    const { unmount } = await renderHook(() => usePosition());
    await flush();
    expect(positionWatcherCount()).toBe(1);
    await unmount();
    expect(positionWatcherCount()).toBe(0);

    let release!: () => void;
    jest.mocked(Location.hasServicesEnabledAsync).mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve(true))),
    );
    const early = await renderHook(() => usePosition());
    await early.unmount();
    await act(async () => release());
    // It still subscribes once the check finishes, then removes the subscription at once.
    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(2);
    expect(positionWatcherCount()).toBe(0);

    let grant!: () => void;
    jest.mocked(Location.requestForegroundPermissionsAsync).mockImplementationOnce(
      () => new Promise((resolve) => (grant = () => resolve({ granted: true } as never))),
    );
    const beforePermission = await renderHook(() => usePosition());
    await beforePermission.unmount();
    await act(async () => grant());
    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(2);
  });
});

test('ensureLocationPermission shares one in-flight request', async () => {
  const [a, b] = await Promise.all([ensureLocationPermission(), ensureLocationPermission()]);
  expect(a && b).toBe(true);
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
});
