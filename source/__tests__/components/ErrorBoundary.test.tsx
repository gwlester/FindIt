import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import * as debugLogModule from '../../src/lib/debugLog';

let explode = true;
function Bomb() {
  if (explode) throw new Error('render failed');
  return <Text>all good</Text>;
}

beforeEach(() => {
  explode = true;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('renders its children normally', async () => {
  explode = false;
  await render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  );
  expect(screen.getByText('all good')).toBeOnTheScreen();
});

test('shows a plain message instead of crashing, and logs the error', async () => {
  const log = jest.spyOn(debugLogModule, 'debugLog').mockImplementation(() => {});
  await render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  );
  expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
  expect(screen.getByText(/render failed/)).toBeOnTheScreen();
  expect(log).toHaveBeenCalledWith('crash', expect.stringMatching(/^Screen error: render failed\n/));
});

test('Try again renders the children once more', async () => {
  const user = userEvent.setup();
  await render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  );
  explode = false;
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByText('all good')).toBeOnTheScreen();
});

test('logs an error that has no stack or component stack', () => {
  const log = jest.spyOn(debugLogModule, 'debugLog').mockImplementation(() => {});
  const boundary = new ErrorBoundary({ children: null });
  const error = new Error('bare');
  error.stack = undefined;
  boundary.componentDidCatch(error, { componentStack: undefined } as never);
  expect(log).toHaveBeenCalledWith('crash', 'Screen error: bare\n\n');
});
