import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import * as debugLogModule from '../../src/lib/debugLog';
import { useGnssStatus } from '../../src/hooks/useGnssStatus';
import { emitNative, nativeMock } from '../helpers/nativeModuleMock';

const flush = () => act(async () => {});
const STATUS = { known: 30, inView: 20, used: 12, usedByConstellation: { GPS: 8, Galileo: 4 } };

test('starts GNSS status with full tracking and reports updates', async () => {
  const { result, unmount } = await renderHook(() => useGnssStatus({ fullTracking: true }));
  await flush();
  expect(nativeMock.startGnssStatus).toHaveBeenCalledWith(true);
  expect(result.current.fullTrackingOn).toBe(true);
  await act(async () => emitNative('onGnssStatus', STATUS));
  expect(result.current.status).toEqual(STATUS);
  await unmount();
  expect(nativeMock.stopGnssStatus).toHaveBeenCalled();
});

test('writes the satellite counts to the debug log', async () => {
  const throttled = jest.spyOn(debugLogModule, 'debugLogThrottled').mockImplementation(() => {});
  await renderHook(() => useGnssStatus({ fullTracking: false }));
  await flush();
  await act(async () => emitNative('onGnssStatus', STATUS));
  expect(throttled).toHaveBeenCalledWith('gnss', '30 known, 20 in view, 12 used in fix (GPS 8, Galileo 4)', 5000);
  await act(async () => emitNative('onGnssStatus', { known: 13, inView: 4, used: 0, usedByConstellation: {} }));
  expect(throttled).toHaveBeenLastCalledWith('gnss', '13 known, 4 in view, 0 used in fix', 5000);
  throttled.mockRestore();
});

test('restarts when the full-tracking setting changes', async () => {
  const { result, rerender } = await renderHook(({ ft }: { ft: boolean }) => useGnssStatus({ fullTracking: ft }), {
    initialProps: { ft: true },
  });
  await flush();
  await rerender({ ft: false });
  await flush();
  expect(nativeMock.startGnssStatus).toHaveBeenLastCalledWith(false);
  expect(result.current.fullTrackingOn).toBe(false);
});

test('does not start without permission; reports errors; ignores late results', async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
  await renderHook(() => useGnssStatus({ fullTracking: true }));
  await flush();
  expect(nativeMock.startGnssStatus).not.toHaveBeenCalled();

  nativeMock.startGnssStatus.mockRejectedValueOnce(new Error('Permission missing'));
  const failing = await renderHook(() => useGnssStatus({ fullTracking: false }));
  await flush();
  expect(failing.result.current.error).toBe('Permission missing');

  nativeMock.startGnssStatus.mockRejectedValueOnce('odd');
  const odd = await renderHook(() => useGnssStatus({ fullTracking: false }));
  await flush();
  expect(odd.result.current.error).toBe('odd');

  nativeMock.stopGnssStatus.mockRejectedValueOnce(new Error('ignored'));
  let finish!: (v: boolean) => void;
  nativeMock.startGnssStatus.mockImplementationOnce(() => new Promise((r) => (finish = r)));
  const late = await renderHook(() => useGnssStatus({ fullTracking: true }));
  await flush();
  await late.unmount();
  await act(async () => finish(true));
  expect(late.result.current.fullTrackingOn).toBe(false);
});
