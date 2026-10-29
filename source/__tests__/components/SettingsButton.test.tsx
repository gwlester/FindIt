import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SettingsButton } from '../../src/components/SettingsButton';

test('opens Settings', async () => {
  const user = userEvent.setup();
  await render(<SettingsButton />);
  await user.press(screen.getByRole('button', { name: 'Settings' }));
  expect(router.push).toHaveBeenCalledWith('/settings');
});
