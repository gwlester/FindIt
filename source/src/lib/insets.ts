import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAST_LINE_MARGIN } from '../components/InsetBackdrop';

/** Height of the navigation header above a screen's scrolling content. */
const HEADER_HEIGHT = 56;

/** Bottom padding for scrolling content: `extra` plus the Android navigation bar. */
export function useBottomPadding(extra = 16): number {
  return useSafeAreaInsets().bottom + extra;
}

/**
 * Bottom padding for a scrolling help page: the navigation bar plus enough extra space that the
 * last line can be scrolled up to just below the top of the screen (so small phones can reach it).
 */
export function useScrollPastPadding(): number {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return insets.bottom + Math.max(16, height - insets.top - HEADER_HEIGHT - LAST_LINE_MARGIN);
}
