import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/ui';
import { GUIDE_INTRO, HELP_TOPICS, helpTopic, type HelpTopic } from '../help/content';
import { useBottomPadding } from '../lib/insets';
import { useTheme } from '../lib/theme';

/** Help for one screen (`topic`), or the full "How to use FindCache" guide. */
export default function HelpScreen() {
  const theme = useTheme();
  const bottom = useBottomPadding();
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const one = helpTopic(topic);

  const section = (t: HelpTopic) => (
    <View key={t.id} style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
        {t.title}
      </Text>
      {t.paragraphs.map((p) => (
        <Text key={p} style={[styles.paragraph, { color: theme.text }]}>
          {p}
        </Text>
      ))}
    </View>
  );

  return (
    <ScrollView testID="scroll" contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Stack.Screen options={{ title: one ? `Help: ${one.title}` : 'Help' }} />
      {one ? (
        <>
          {section(one)}
          <Button title="How to use FindCache (all topics)" variant="secondary" onPress={() => router.push('/help')} />
        </>
      ) : (
        <>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            How to use FindCache
          </Text>
          {GUIDE_INTRO.map((p) => (
            <Text key={p} style={[styles.paragraph, { color: theme.text }]}>
              {p}
            </Text>
          ))}
          {HELP_TOPICS.map(section)}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  section: { marginTop: 12, gap: 8 },
  heading: { fontSize: 18, fontWeight: '700' },
  paragraph: { fontSize: 15, lineHeight: 22 },
});
