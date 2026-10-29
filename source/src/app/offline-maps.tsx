import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate } from '../lib/format';
import { deleteDownload, listDownloads, watchDownload, type Download } from '../lib/offlineMaps';
import { useTheme } from '../lib/theme';

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;
const LAYER_LABEL = { streets: 'Map', satellite: 'Satellite' } as const;

/** Map areas saved for use without a connection (airplane mode); delete ones you no longer need. */
export default function OfflineMapsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [downloads, setDownloads] = useState<Download[]>([]);

  const reload = useCallback(async () => setDownloads(await listDownloads()), []);

  useEffect(() => {
    listDownloads().then(setDownloads);
  }, []);

  // Follow downloads that are still running.
  const running = downloads.filter((d) => !d.complete).map((d) => d.id).join(',');
  useEffect(() => {
    if (!running) return;
    const stops = running.split(',').map((id) =>
      watchDownload(id, (_id, percentage, bytes, complete) =>
        setDownloads((list) => list.map((d) => (d.id === id ? { ...d, percentage, bytes, complete } : d))),
      ),
    );
    return () => {
      stops.forEach((stop) => stop.then((fn) => fn()));
    };
  }, [running]);

  const confirmDelete = (d: Download) =>
    Alert.alert('Delete offline map?', d.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(d.id).then(reload) },
    ]);

  const total = downloads.reduce((sum, d) => sum + d.bytes, 0);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      <Text style={{ color: theme.muted }}>
        Saved areas work with no connection, even in airplane mode. To add one, open the map, show the area and tap
        Download (once for Map, once for Satellite).
      </Text>
      {downloads.length ? (
        <Text style={[styles.total, { color: theme.text }]}>
          {downloads.length} area{downloads.length === 1 ? '' : 's'} · {megabytes(total)}
        </Text>
      ) : null}
      <FlatList
        style={styles.list}
        data={downloads}
        keyExtractor={(d) => d.id}
        persistentScrollbar
        ListEmptyComponent={<Text style={{ color: theme.muted }}>No offline maps yet.</Text>}
        renderItem={({ item }) => {
          const state = item.complete ? 'ready' : `downloading ${Math.floor(item.percentage)}%`;
          const details = `${LAYER_LABEL[item.layer]}, ${megabytes(item.bytes)}, ${state}, ${formatDate(item.createdAt)}`;
          return (
            <View style={[styles.row, { borderColor: theme.border }]}>
              <View testID="offline-map" accessible accessibilityLabel={`${item.name}, ${details}`} style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                <Text style={{ color: theme.muted }}>{details.replace(/, /g, ' · ')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
                onPress={() => confirmDelete(item)}
                hitSlop={8}
              >
                <Text style={{ color: theme.danger, fontWeight: '600' }}>Delete</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  total: { fontWeight: '600' },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '600' },
});
