import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Bottom padding for scrolling content: `extra` plus the Android navigation bar. */
export function useBottomPadding(extra = 16): number {
  return useSafeAreaInsets().bottom + extra;
}
