import { act, screen, userEvent } from '@testing-library/react-native';

import OfflineMapsScreen from '../../src/app/offline-maps';
import { formatDate } from '../../src/lib/format';
import { addFakePack, emitPackProgress, OfflineManager, packListenerIds } from '../helpers/maplibreMock';
import { mockAlert, renderApp } from '../helpers/renderApp';

test('explains offline maps when there are none', async () => {
  await renderApp(<OfflineMapsScreen />);
  expect(screen.getByText(/No offline maps yet/)).toBeOnTheScreen();
});

test('lists downloads newest first with layer, size and state, and follows unfinished ones', async () => {
  const done = addFakePack({ name: 'Near Oak', layer: 'streets', createdAt: Date.UTC(2026, 9, 20) }, 100, 5_200_000);
  const busy = addFakePack({ name: 'Near Elm', layer: 'satellite', createdAt: Date.UTC(2026, 9, 28) }, 40, 1_000_000);
  await renderApp(<OfflineMapsScreen />);

  const rows = screen.getAllByTestId('offline-map').map((r) => r.props.accessibilityLabel);
  expect(rows).toEqual([
    `Near Elm, Satellite, 1.0 MB, downloading 40%, ${formatDate(Date.UTC(2026, 9, 28))}`,
    `Near Oak, Map, 5.2 MB, ready, ${formatDate(Date.UTC(2026, 9, 20))}`,
  ]);
  expect(screen.getByText('2 areas · 6.2 MB')).toBeOnTheScreen();
  expect(packListenerIds()).toEqual([busy]);
  expect(packListenerIds()).not.toContain(done);

  await act(async () => emitPackProgress(busy, 100, 3_000_000));
  expect(screen.getAllByTestId('offline-map')[0].props.accessibilityLabel).toMatch(/^Near Elm, Satellite, 3\.0 MB, ready/);
  await screen.unmount();
  expect(packListenerIds()).toEqual([]);
});

test('deletes a download after confirming', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  addFakePack({ name: 'Near Oak', layer: 'streets', createdAt: 1 }, 100, 1_000);
  await renderApp(<OfflineMapsScreen />);
  await user.press(screen.getByRole('button', { name: 'Delete Near Oak' }));
  await alert.press('Delete offline map?', 'Cancel');
  expect(OfflineManager.deletePack).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Delete Near Oak' }));
  await alert.press('Delete offline map?', 'Delete');
  expect(OfflineManager.deletePack).toHaveBeenCalledWith('1');
  expect(screen.getByText(/No offline maps yet/)).toBeOnTheScreen();
});
