import { act, screen, userEvent } from '@testing-library/react-native';

import { AveragingPanel } from '../../src/components/AveragingPanel';
import { emitNative, nativeMock } from '../helpers/nativeModuleMock';
import { activeKeepAwakeTags } from '../helpers/keepAwakeMock';
import { renderApp } from '../helpers/renderApp';

const AVERAGE = { latitude: 1, longitude: 2, count: 84, durationSec: 84, spread: 3.4, accuracy: 2.1 };

test('shows progress, satellites and uses the average', async () => {
  const user = userEvent.setup();
  const onUse = jest.fn();
  const onCancel = jest.fn();
  await renderApp(
    <AveragingPanel running fixes={86} average={AVERAGE} error={null} onUse={onUse} onCancel={onCancel} />,
  );
  expect(screen.getByText('Averaging — keep the phone still')).toBeOnTheScreen();
  expect(screen.getByText(/84 fixes · 1:24 \(2 poor fixes ignored\)/)).toBeOnTheScreen();
  expect(screen.getByText('± 2 m')).toBeOnTheScreen();
  expect(nativeMock.startGnssStatus).toHaveBeenCalledWith(true);
  await act(async () => emitNative('onGnssStatus', { known: 31, inView: 27, used: 18, usedByConstellation: {} }));
  expect(screen.getByText(/Satellites: 18 used · 27 in view · full tracking/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Use average' }));
  expect(onUse).toHaveBeenCalledWith(AVERAGE);
  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalled();
});

test('before any fix, when stopped, with one ignored fix and an error', async () => {
  const onUse = jest.fn();
  await renderApp(
    <AveragingPanel running={false} fixes={1} average={null} error="GPS lost" onUse={onUse} onCancel={jest.fn()} />,
    { settings: { displayName: 'x', units: 'imperial', highAccuracyGps: false, searchAreaDistanceM: 50, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90, mapLayer: 'streets' as const, compassBackground: 'plain' as const } },
  );
  expect(screen.getByText('Averaging stopped')).toBeOnTheScreen();
  expect(screen.getByText(/Waiting for GPS fixes… \(1 poor fix ignored\)/)).toBeOnTheScreen();
  expect(screen.getByText('GPS lost')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Use average' })).toBeDisabled();
  await act(async () => emitNative('onGnssStatus', { known: 1, inView: 1, used: 0, usedByConstellation: {} }));
  expect(screen.getByText('Satellites: 0 used · 1 in view')).toBeOnTheScreen();
});

test('keeps the screen awake while averaging', async () => {
  await renderApp(
    <AveragingPanel running fixes={0} average={null} error={null} onUse={jest.fn()} onCancel={jest.fn()} />,
  );
  expect(activeKeepAwakeTags()).toEqual(['averaging']);
});

test('no ignored fixes', async () => {
  await renderApp(
    <AveragingPanel running fixes={84} average={AVERAGE} error={null} onUse={jest.fn()} onCancel={jest.fn()} />,
  );
  expect(screen.getByText('84 fixes · 1:24')).toBeOnTheScreen();
});
