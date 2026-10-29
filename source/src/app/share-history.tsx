import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { clearShareHistory, listShareHistory, pruneShareHistory, retentionLabel, type ShareRecord } from '../db/shareHistory';
import { useSettings } from '../hooks/useSettings';
import { formatDate } from '../lib/format';
import { useTheme } from '../lib/theme';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Who downloaded my shared places, and when (protocol v2 receivers send their name). */
export default function ShareHistoryScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, loaded } = useSettings();
  const [records, setRecords] = useState<ShareRecord[]>([]);
  const days = settings.shareHistoryDays;

  const reload = useCallback(async () => setRecords(await listShareHistory(db)), [db]);

  useEffect(() => {
    if (loaded) pruneShareHistory(db, days).then(reload);
  }, [db, loaded, days, reload]);

  const clear = () =>
    Alert.alert('Clear sharing history?', 'This removes the record of who downloaded your places.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearShareHistory(db).then(reload) },
    ]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      <Text style={{ color: theme.muted }}>
        {days == null ? 'Kept forever' : `Kept for ${retentionLabel(days)}`} · change this in Settings.
      </Text>
      <FlatList
        style={styles.list}
        data={records}
        keyExtractor={(r) => String(r.id)}
        persistentScrollbar
        ListEmptyComponent={<Text style={{ color: theme.muted }}>Nobody has downloaded your places yet.</Text>}
        renderItem={({ item }) => (
          <View
            testID="share-record"
            accessible
            accessibilityLabel={`${item.name}, ${plural(item.places, 'place')}, ${formatDate(item.at)}`}
            style={[styles.row, { borderColor: theme.border }]}
          >
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            <Text style={{ color: theme.muted }}>
              {plural(item.places, 'place')} · {formatDate(item.at)}
            </Text>
          </View>
        )}
      />
      <Button title="Clear history" variant="danger" onPress={clear} disabled={records.length === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  list: { flex: 1 },
  row: { borderBottomWidth: 1, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '600' },
});
