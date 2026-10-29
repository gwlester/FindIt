import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useAveragePosition } from '../../src/hooks/useAveragePosition';
import { emitPosition, emitPositionError, positionWatcherCount } from '../helpers/expoLocationMock';

const flush = () => act(async () => {});

test('collects fixes while running and averages them', async () => {
  const { result } = await renderHook(() => useAveragePosition());
  expect(result.current.average).toBeNull();
  await act(() => result.current.start());
  expect(result.current.running).toBe(true);
  await act(async () => {
    emitPosition({ latitude: 1, longitude: 2, accuracy: 4 }, 0);
    emitPosition({ latitude: 1.00001, longitude: 2, accuracy: 4 }, 1000);
  });
  expect(result.current.fixes).toBe(2);
  expect(result.current.average!.latitude).toBeCloseTo(1.000005, 9);

  await act(async () => result.current.stop());
  expect(result.current.running).toBe(false);
  expect(positionWatcherCount()).toBe(0);
  expect(result.current.fixes).toBe(2);

  await act(async () => result.current.reset());
  expect(result.current.fixes).toBe(0);
});

test('stops by itself after 600 fixes', async () => {
  const { result } = await renderHook(() => useAveragePosition());
  await act(() => result.current.start());
  await act(async () => {
    for (let t = 0; t < 605; t++) emitPosition({ latitude: 1, longitude: 2, accuracy: 4 }, t * 1000);
  });
  expect(result.current.running).toBe(false);
  expect(result.current.fixes).toBe(600);
});

test('reports permission denial and errors', async () => {
  const { result } = await renderHook(() => useAveragePosition());
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
  await act(() => result.current.start());
  expect(result.current.error).toBe('Location permission denied');
  expect(result.current.running).toBe(false);

  await act(() => result.current.start());
  await act(async () => emitPositionError('GPS lost'));
  expect(result.current.error).toBe('GPS lost');

  jest.mocked(Location.watchPositionAsync).mockRejectedValueOnce(new Error('boom'));
  await act(() => result.current.start());
  expect(result.current.error).toBe('boom');
  expect(result.current.running).toBe(false);

  jest.mocked(Location.watchPositionAsync).mockRejectedValueOnce('odd');
  await act(() => result.current.start());
  expect(result.current.error).toBe('odd');
});

test('drops a subscription that arrives after stop, and fixes from an old session', async () => {
  const { result, unmount } = await renderHook(() => useAveragePosition());

  // Stopped while the permission request is pending: never subscribes.
  let grant!: () => void;
  jest.mocked(Location.requestForegroundPermissionsAsync).mockImplementationOnce(
    () => new Promise((resolve) => (grant = () => resolve({ granted: true } as never))),
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.start();
  });
  await act(async () => result.current.stop());
  await act(async () => {
    grant();
    await pending;
  });
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();

  // Stopped while subscribing: the late subscription is removed.
  const lateSub = { remove: jest.fn() };
  let resolveSub!: (s: typeof lateSub) => void;
  let capturedCb!: (loc: unknown) => void;
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(((_o: unknown, cb: (loc: unknown) => void) => {
    capturedCb = cb;
    return new Promise((r) => (resolveSub = r));
  }) as never);
  await act(async () => {
    pending = result.current.start();
  });
  await flush();
  await act(async () => result.current.stop());
  await act(async () => {
    resolveSub(lateSub);
    await pending;
  });
  expect(lateSub.remove).toHaveBeenCalled();
  await act(async () => capturedCb({ coords: { latitude: 1, longitude: 1, accuracy: 1 }, timestamp: 0 }));
  expect(result.current.fixes).toBe(0);

  await act(() => result.current.start());
  await unmount();
  expect(positionWatcherCount()).toBe(0);
});
