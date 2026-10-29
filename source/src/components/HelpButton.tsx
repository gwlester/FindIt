import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../lib/theme';

type MenuItem = { label: string; go: () => void };

/** "?" in a screen's header: help for that screen, the full guide, or About. */
export function HelpButton({ topic }: { topic: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const items: MenuItem[] = [
    { label: 'Help for this screen', go: () => router.push({ pathname: '/help', params: { topic } }) },
    { label: 'How to use FindIt', go: () => router.push('/help') },
    { label: 'About FindIt', go: () => router.push('/about') },
  ];

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Help" onPress={() => setOpen(true)} hitSlop={12}>
        <Text style={[styles.icon, { color: theme.accent, borderColor: theme.accent }]}>?</Text>
      </Pressable>
      <Modal testID="help-menu" visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {items.map(({ label, go }) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => {
                  setOpen(false);
                  go();
                }}
                style={[styles.item, { borderColor: theme.border }]}
              >
                <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.item}>
              <Text style={[styles.label, { color: theme.muted }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 16, paddingTop: 64 },
  menu: { borderWidth: 1, borderRadius: 12, minWidth: 220, overflow: 'hidden' },
  item: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 16 },
});
