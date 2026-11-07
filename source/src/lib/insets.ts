import { useEffect, useState } from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAST_LINE_MARGIN } from '../components/InsetBackdrop';

/** Height of the navigation header above a screen's scrolling content. */
const HEADER_HEIGHT = 56;

/**
 * Bottom padding for a scrolling screen (help pages, forms): the navigation bar plus enough extra space that the
 * last line can be scrolled up to just below the top of the screen (so small phones can reach it).
 */
export function useScrollPastPadding(): number {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useKeyboardHeight();
  return Math.max(insets.bottom, keyboard) + Math.max(16, height - insets.top - HEADER_HEIGHT - LAST_LINE_MARGIN);
}

/**
 * Height of the on-screen keyboard (0 when hidden). Edge-to-edge Android does not resize the screen
 * for the keyboard, so a form reserves this much room itself or its last buttons stay hidden.
 */
export function useKeyboardHeight(): number {
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return keyboard;
}
