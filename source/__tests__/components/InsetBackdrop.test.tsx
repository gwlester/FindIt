import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InsetBackdrop, insetPadding, LAST_LINE_MARGIN } from '../../src/components/InsetBackdrop';

const insets = { top: 24, bottom: 48, left: 40, right: 32 };

beforeEach(() => {
  (useSafeAreaInsets as jest.Mock).mockReturnValue(insets);
});

test('insets are added to the backdrop padding, and a specific side wins over uniform padding', () => {
  expect(insetPadding({ padding: 20 }, insets)).toEqual({ paddingTop: 44, paddingBottom: 68, paddingLeft: 60, paddingRight: 52 });
  expect(insetPadding({ padding: 16, paddingTop: 40 }, insets)).toEqual({ paddingTop: 64, paddingBottom: 64, paddingLeft: 56, paddingRight: 48 });
  expect(insetPadding({ flex: 1 }, insets)).toEqual({ paddingTop: 24, paddingBottom: 48, paddingLeft: 40, paddingRight: 32 });
});

test('the card box is one screen tall and keeps clear of the system bars', async () => {
  await render(
    <InsetBackdrop testID="backdrop" style={{ flex: 1, padding: 20, backgroundColor: '#123456' }}>
      <Text>card</Text>
    </InsetBackdrop>,
  );
  const box = StyleSheet.flatten(screen.getByTestId('backdrop').props.style);
  expect(box).toMatchObject({ flex: 0, height: Dimensions.get('window').height, paddingTop: 44, paddingBottom: 68, paddingLeft: 60, paddingRight: 52 });
  expect(box.backgroundColor).toBeUndefined();
});

test('scroll space lets the last line reach just below the top of the screen', async () => {
  await render(
    <InsetBackdrop style={{ flex: 1 }}>
      <Text>card</Text>
    </InsetBackdrop>,
  );
  const space = StyleSheet.flatten(screen.getByTestId('inset-backdrop-scroll-space').props.style);
  expect(space.height).toBe(Dimensions.get('window').height - insets.top - LAST_LINE_MARGIN);
});

test('the box follows the measured height (for example when the keyboard shrinks the window)', async () => {
  await render(
    <InsetBackdrop testID="backdrop" style={{ flex: 1 }}>
      <Text>card</Text>
    </InsetBackdrop>,
  );
  await fireEvent(screen.getByTestId('inset-backdrop'), 'layout', { nativeEvent: { layout: { height: 500 } } });
  expect(StyleSheet.flatten(screen.getByTestId('backdrop').props.style).height).toBe(500);
  expect(StyleSheet.flatten(screen.getByTestId('inset-backdrop-scroll-space').props.style).height).toBe(500 - insets.top - LAST_LINE_MARGIN);
});
