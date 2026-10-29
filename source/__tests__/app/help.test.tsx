import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import HelpScreen from '../../src/app/help';
import { GUIDE_INTRO, HELP_TOPICS } from '../../src/help/content';
import { useLocalSearchParams } from '../helpers/expoRouterMock';
import { renderApp } from '../helpers/renderApp';

test('the full guide: getting started, then every screen', async () => {
  await renderApp(<HelpScreen />);
  expect(screen.getByRole('header', { name: 'How to use FindCache' })).toBeOnTheScreen();
  expect(screen.getByText(GUIDE_INTRO[0])).toBeOnTheScreen();
  for (const topic of HELP_TOPICS) expect(screen.getByRole('header', { name: topic.title })).toBeOnTheScreen();
});

test('help for one screen, with a way to the full guide', async () => {
  const user = userEvent.setup();
  useLocalSearchParams.mockReturnValue({ topic: 'compass' });
  await renderApp(<HelpScreen />);
  const compass = HELP_TOPICS.find((t) => t.id === 'compass')!;
  expect(screen.getByRole('header', { name: compass.title })).toBeOnTheScreen();
  expect(screen.getByText(compass.paragraphs[0])).toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'How to use FindCache' })).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'How to use FindCache (all topics)' }));
  expect(router.push).toHaveBeenLastCalledWith('/help');
});

test('an unknown topic shows the full guide', async () => {
  useLocalSearchParams.mockReturnValue({ topic: 'nope' });
  await renderApp(<HelpScreen />);
  expect(screen.getByRole('header', { name: 'How to use FindCache' })).toBeOnTheScreen();
});
