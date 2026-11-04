import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import * as debugLogModule from '../../src/lib/debugLog';
import { NO_COMPASS_AFTER_MS, useHeading, useNoCompass } from '../../src/hooks/useHeading';
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

describe('useNoCompass', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }));
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const heading = { degrees: 10, isTrue: true, accuracy: 3 };

  it('turns on, and says so in the debug log, when no heading has come after the wait', async () => {
    const log = jest.spyOn(debugLogModule, 'debugLog').mockImplementation(() => {});
    const { result } = await renderHook(() => useNoCompass(null));
    expect(result.current).toBe(false);
    await act(async () => jest.advanceTimersByTime(NO_COMPASS_AFTER_MS - 1));
    expect(result.current).toBe(false);
    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    expect(log).toHaveBeenCalledWith('compass', expect.stringMatching(/No compass reading after 8 s.*no compass sensor/));
  });

  it('stays off when a heading arrives in time, and turns off if one arrives later', async () => {
    const early = await renderHook(({ h }: { h: typeof heading | null }) => useNoCompass(h), { initialProps: { h: heading } });
    await act(async () => jest.advanceTimersByTime(NO_COMPASS_AFTER_MS * 2));
    expect(early.result.current).toBe(false);

    const late = await renderHook(({ h }: { h: typeof heading | null }) => useNoCompass(h), { initialProps: { h: null as typeof heading | null } });
    await act(async () => jest.advanceTimersByTime(NO_COMPASS_AFTER_MS));
    expect(late.result.current).toBe(true);
    await late.rerender({ h: heading });
    expect(late.result.current).toBe(false);
  });
});

test('writes the heading, with its calibration level, to the debug log', async () => {
  const throttled = jest.spyOn(debugLogModule, 'debugLogThrottled').mockImplementation(() => {});
  await renderHook(() => useHeading());
  await flush();
  await act(async () => emitHeading({ trueHeading: 10, magHeading: 12, accuracy: 2 }));
  expect(throttled).toHaveBeenCalledWith('compass', 'Heading 10° true, calibration 2 of 3', 5000);
  await act(async () => emitHeading({ trueHeading: -1, magHeading: 90, accuracy: 1 }));
  expect(throttled).toHaveBeenLastCalledWith('compass', expect.stringMatching(/° magnetic, calibration 1 of 3$/), 5000);
  throttled.mockRestore();
});
