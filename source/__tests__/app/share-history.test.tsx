import { screen, userEvent } from '@testing-library/react-native';

import ShareHistoryScreen from '../../src/app/share-history';
import { DEFAULT_SETTINGS } from '../../src/db/settings';
import { addShare, listShareHistory } from '../../src/db/shareHistory';
import { formatDate } from '../../src/lib/format';
import { mockAlert, renderApp } from '../helpers/renderApp';

const DAY = 24 * 60 * 60 * 1000;

test('lists who downloaded my places, newest first, and explains the retention', async () => {
  const now = Date.now();
  const db = await renderApp(<ShareHistoryScreen />, {
    settings: { ...DEFAULT_SETTINGS, shareHistoryDays: 30 },
    seed: async (d) => {
      await addShare(d as never, { at: now - 2 * DAY, name: 'Alex', places: 3 });
      await addShare(d as never, { at: now, name: 'Sam', places: 1 });
      await addShare(d as never, { at: now - 40 * DAY, name: 'Old', places: 1 });
    },
  });

  const names = screen.getAllByTestId('share-record').map((r) => r.props.accessibilityLabel);
  expect(names).toEqual([
    `Sam, 1 place, ${formatDate(now)}`,
    `Alex, 3 places, ${formatDate(now - 2 * DAY)}`,
  ]);
  expect(screen.getByText(/Kept for 30 days/)).toBeOnTheScreen();
  // Opening the screen prunes entries past the retention period.
  expect(await listShareHistory(db as never)).toHaveLength(2);
});

test('says when the history is empty and kept forever', async () => {
  await renderApp(<ShareHistoryScreen />, { settings: { ...DEFAULT_SETTINGS, shareHistoryDays: null } });
  expect(screen.getByText('Nobody has downloaded your places yet.')).toBeOnTheScreen();
  expect(screen.getByText(/Kept forever/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Clear history' })).toBeDisabled();
});

test('clears the history after confirming', async () => {
  const u = userEvent.setup();
  const alert = mockAlert();
  const db = await renderApp(<ShareHistoryScreen />, {
    seed: (d) => addShare(d as never, { at: Date.now(), name: 'Alex', places: 3 }),
  });

  await u.press(screen.getByRole('button', { name: 'Clear history' }));
  await alert.press('Clear sharing history?', 'Cancel');
  expect(await listShareHistory(db as never)).toHaveLength(1);
  await u.press(screen.getByRole('button', { name: 'Clear history' }));
  await alert.press('Clear sharing history?', 'Clear');
  expect(await listShareHistory(db as never)).toEqual([]);
  expect(screen.getByText('Nobody has downloaded your places yet.')).toBeOnTheScreen();
});
