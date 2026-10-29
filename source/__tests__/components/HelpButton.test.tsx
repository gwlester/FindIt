import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { HelpButton } from '../../src/components/HelpButton';

test('opens a help menu: this screen, the guide, or About', async () => {
  const user = userEvent.setup();
  await render(<HelpButton topic="map" />);
  expect(screen.queryByText('Help for this screen')).not.toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Help' }));
  await user.press(screen.getByRole('button', { name: 'Help for this screen' }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/help', params: { topic: 'map' } });
  expect(screen.queryByText('Help for this screen')).not.toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Help' }));
  await user.press(screen.getByRole('button', { name: 'How to use FindIt' }));
  expect(router.push).toHaveBeenLastCalledWith('/help');

  await user.press(screen.getByRole('button', { name: 'Help' }));
  await user.press(screen.getByRole('button', { name: 'About FindIt' }));
  expect(router.push).toHaveBeenLastCalledWith('/about');

  await user.press(screen.getByRole('button', { name: 'Help' }));
  await user.press(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByText('Help for this screen')).not.toBeOnTheScreen();
  expect(router.push).toHaveBeenCalledTimes(3);
});

test('the menu can be closed with the back button', async () => {
  const user = userEvent.setup();
  await render(<HelpButton topic="map" />);
  await user.press(screen.getByRole('button', { name: 'Help' }));
  await act(async () => screen.getByTestId('help-menu').props.onRequestClose());
  expect(screen.queryByText('Help for this screen')).not.toBeOnTheScreen();
});
