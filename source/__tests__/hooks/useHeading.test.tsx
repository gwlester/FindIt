import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useHeading } from '../../src/hooks/useHeading';
import { emitHeading } from '../helpers/expoLocationMock';

const flush = () => act(async () => {});

test('uses true heading when available, smoothing successive readings', async () => {
  const { result } = await renderHook(() => useHeading());
  await flush();
  await act(async () => emitHeading({ trueHeading: 10, magHeading: 12, accuracy: 3 }));
  expect(result.current).toEqual({ degrees: 10, isTrue: true, accuracy: 3 });
  await act(async () => emitHeading({ trueHeading: 50, magHeading: 52, accuracy: 3 }));
  expect(result.current!.degrees).toBeCloseTo(20, 9);
});

test('falls back to magnetic heading', async () => {
  const { result } = await renderHook(() => useHeading());
  await flush();
  await act(async () => emitHeading({ trueHeading: -1, magHeading: 90, accuracy: 1 }));
  expect(result.current).toEqual({ degrees: 90, isTrue: false, accuracy: 1 });
});

test('does nothing without permission, clears on error, and cleans up', async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
  const denied = await renderHook(() => useHeading());
  await flush();
  expect(Location.watchHeadingAsync).not.toHaveBeenCalled();
  expect(denied.result.current).toBeNull();

  jest.mocked(Location.watchHeadingAsync).mockRejectedValueOnce(new Error('no sensor'));
  const failing = await renderHook(() => useHeading());
  await flush();
  expect(failing.result.current).toBeNull();

  const ok = await renderHook(() => useHeading());
  await flush();
  await ok.unmount();
  await act(async () => emitHeading({ trueHeading: 1, magHeading: 1, accuracy: 3 }));

  let grant!: () => void;
  jest.mocked(Location.requestForegroundPermissionsAsync).mockImplementationOnce(
    () => new Promise((resolve) => (grant = () => resolve({ granted: true } as never))),
  );
  const early = await renderHook(() => useHeading());
  await early.unmount();
  await act(async () => grant());

  let release!: (sub: { remove: jest.Mock }) => void;
  const lateSub = { remove: jest.fn() };
  jest.mocked(Location.watchHeadingAsync).mockImplementationOnce(() => new Promise((resolve) => (release = resolve)) as never);
  const late = await renderHook(() => useHeading());
  await flush();
  await late.unmount();
  await act(async () => release(lateSub));
  expect(lateSub.remove).toHaveBeenCalled();
});
