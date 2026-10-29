import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../lib/theme';

/** Gear in a screen's header: opens Settings. */
export function SettingsButton() {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={12}>
      <Text style={[styles.icon, { color: theme.accent }]}>⚙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 24, lineHeight: 28 },
});
