import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** How much of the last line stays visible below the top of the screen when scrolled all the way up. */
export const LAST_LINE_MARGIN = 56;

type Insets = { top: number; bottom: number; left: number; right: number };

/** The backdrop's own padding with the device insets added to it. */
export function insetPadding(style: StyleProp<ViewStyle>, insets: Insets): ViewStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const base = (value: unknown): number => (typeof value === 'number' ? value : 0);
  const vertical = flat.paddingVertical ?? flat.padding;
  const horizontal = flat.paddingHorizontal ?? flat.padding;
  return {
    paddingTop: base(flat.paddingTop ?? vertical) + insets.top,
    paddingBottom: base(flat.paddingBottom ?? vertical) + insets.bottom,
    paddingLeft: base(flat.paddingLeft ?? horizontal) + insets.left,
    paddingRight: base(flat.paddingRight ?? horizontal) + insets.right,
  };
}

type Props = { style?: StyleProp<ViewStyle>; testID?: string; children?: ReactNode };

/**
 * A dialog backdrop that keeps its card clear of the navigation bar and camera cutout and scrolls,
 * so on a small phone (or with the keyboard open) the card's last line, buttons included, can be
 * brought up to just below the top of the screen. The card's layout is unchanged: it sits in a box
 * exactly one screen tall, laid out as `style` says, with scrollable space added below it.
 */
export function InsetBackdrop({ style, testID, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const screenHeight = measured ?? windowHeight;
  const { backgroundColor, ...layout } = StyleSheet.flatten(style) ?? {};
  const scrollPast = Math.max(0, screenHeight - insets.top - LAST_LINE_MARGIN);
  return (
    <ScrollView
      testID="inset-backdrop"
      style={{ flex: 1, backgroundColor }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onLayout={(event: LayoutChangeEvent) => setMeasured(event.nativeEvent.layout.height)}
    >
      <View testID={testID} style={[layout, { flex: 0, height: screenHeight }, insetPadding(style, insets)]}>
        {children}
      </View>
      <View testID="inset-backdrop-scroll-space" style={{ height: scrollPast }} />
    </ScrollView>
  );
}
