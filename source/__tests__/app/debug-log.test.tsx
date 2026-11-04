import { act, screen, userEvent } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';

import DebugLogScreen from '../../src/app/debug-log';
import { DEFAULT_SETTINGS } from '../../src/db/settings';
import { debugLog, flushDebugLog, setDebugLogging } from '../../src/lib/debugLog';
import { files } from '../helpers/fileSystemMock';
import { mockAlert, renderApp } from '../helpers/renderApp';

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));

afterEach(() => setDebugLogging(null, false));

const seed = async (db: unknown) => {
  setDebugLogging(db as never, true);
  debugLog('ble', 'Scan started', new Date(2026, 10, 2, 9, 0, 0).getTime());
  debugLog('ble', 'Found "Alex" (d1), RSSI -50', new Date(2026, 10, 2, 9, 0, 1).getTime());
  await flushDebugLog();
};

test('says how to turn logging on when it is off and empty', async () => {
  await renderApp(<DebugLogScreen />);
  expect(screen.getByText(/Debug logging is off/)).toBeOnTheScreen();
  expect(screen.getByText('The log is empty.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Share log' })).toBeDisabled();
});

test('shows the log newest first and refreshes', async () => {
  const user = userEvent.setup();
  const db = await renderApp(<DebugLogScreen />, { settings: { ...DEFAULT_SETTINGS, debugLogging: true }, seed });
  expect(screen.getByText(/Debug logging is on/)).toBeOnTheScreen();
  expect(screen.getAllByTestId('debug-entry').map((e) => e.props.children.join(''))).toEqual([
    '09:00:01 [ble] Found "Alex" (d1), RSSI -50',
    '09:00:00 [ble] Scan started',
  ]);
  setDebugLogging(db as never, true);
  debugLog('share', 'Sharing started', new Date(2026, 10, 2, 9, 0, 2).getTime());
  await act(async () => flushDebugLog());
  await user.press(screen.getByRole('button', { name: 'Refresh' }));
  expect(screen.getAllByTestId('debug-entry')).toHaveLength(3);
});

test('shares the log as a text file', async () => {
  const user = userEvent.setup();
  await renderApp(<DebugLogScreen />, { seed });
  await user.press(screen.getByRole('button', { name: 'Share log' }));
  const [uri, options] = jest.mocked(Sharing.shareAsync).mock.calls[0];
  expect(uri).toMatch(/^file:\/\/\/cache\/findcache-debug-log-\d{8}-\d{6}\.txt$/);
  expect(options).toMatchObject({ mimeType: 'text/plain' });
  expect(files[uri]).toBe('2026-11-02 09:00:00.000 [ble] Scan started\n2026-11-02 09:00:01.000 [ble] Found "Alex" (d1), RSSI -50\n');
});

test('reports when sharing fails', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<DebugLogScreen />, { seed });
  jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('No app to share with'));
  await user.press(screen.getByRole('button', { name: 'Share log' }));
  expect(alert.message('Could not share the log')).toBe('No app to share with');
});

test('clears the log after confirming', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<DebugLogScreen />, { seed });
  await user.press(screen.getByRole('button', { name: 'Clear log' }));
  await alert.press('Clear the debug log?', 'Cancel');
  expect(screen.getAllByTestId('debug-entry')).toHaveLength(2);
  await user.press(screen.getByRole('button', { name: 'Clear log' }));
  await alert.press('Clear the debug log?', 'Clear');
  expect(screen.getByText('The log is empty.')).toBeOnTheScreen();
});

test('counts a single entry and reports odd share failures', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<DebugLogScreen />, {
    settings: { ...DEFAULT_SETTINGS, debugLogging: true },
    seed: async (db) => {
      setDebugLogging(db as never, true);
      debugLog('app', 'only one');
      await flushDebugLog();
    },
  });
  expect(screen.getByText(/1 entry, newest first/)).toBeOnTheScreen();
  jest.mocked(Sharing.shareAsync).mockRejectedValueOnce('odd');
  await user.press(screen.getByRole('button', { name: 'Share log' }));
  expect(alert.message('Could not share the log')).toBe('odd');
});
