import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field } from '../components/ui';
import { useSettings } from '../hooks/useSettings';
import { clearDebugLog, debugLog, flushDebugLog, formatDebugLog, readDebugLog, type DebugEntry } from '../lib/debugLog';
import { describeApp } from '../lib/appInfo';
import { reportFailure } from '../lib/failure';
import { MAX_DESCRIPTION_LENGTH, buildUploadText, uploadDebugLog, uploadEnabled, uploadEntryMessage } from '../lib/logUpload';
import { useTheme } from '../lib/theme';
import { currentVersion } from '../lib/updates';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const stamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/** The debug log (Settings → Troubleshooting): view it, share it as a text file, or clear it. */
export default function DebugLogScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [problem, setProblem] = useState('');
  const description = problem.trim();

  const reload = useCallback(async () => setEntries(await readDebugLog(db)), [db]);

  useEffect(() => {
    readDebugLog(db).then(setEntries);
  }, [db]);

  const share = async () => {
    try {
      const file = new File(Paths.cache, `findcache-debug-log-${stamp(new Date())}.txt`);
      file.create({ overwrite: true });
      file.write(formatDebugLog(entries));
      await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Share the FindCache debug log' });
    } catch (e) {
      Alert.alert('Could not share the log', e instanceof Error ? e.message : String(e));
    }
  };

  const send = () =>
    Alert.alert(
      'Send the log to KnG?',
      `This uploads the ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} in this log and your description of the problem. It can include nearby Bluetooth device names and the names used for sharing, but not your saved places. It is used only to find problems and is deleted after 6 months.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              // The server requires the log to end with this entry, so it is written (and kept in the
              // log on the phone) just before sending.
              const version = currentVersion();
              const at = Date.now();
              debugLog('app', uploadEntryMessage(version), at);
              await flushDebugLog();
              const stored = await readDebugLog(db);
              const { id } = await uploadDebugLog(buildUploadText(stored, version, at), description, version);
              Alert.alert('Log sent', `Thank you. If you ask about it, quote this reference: ${id}`);
            } catch (e) {
              Alert.alert('Could not send the log', reportFailure('upload', 'Sending the log', e));
            }
          },
        },
      ],
    );

  const clear = () =>
    Alert.alert('Clear the debug log?', 'This deletes every entry.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearDebugLog(db, `Debug log cleared: ${describeApp(currentVersion())}`).then(reload) },
    ]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      <Text style={{ color: theme.muted }}>
        {settings.debugLogging
          ? `Debug logging is on. ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}, newest first.`
          : 'Debug logging is off. Turn it on in Settings → Troubleshooting, try what goes wrong, then come back.'}
      </Text>
      <FlatList
        style={[styles.list, { borderColor: theme.border }]}
        data={entries}
        keyExtractor={(e) => String(e.id)}
        persistentScrollbar
        ListEmptyComponent={<Text style={{ color: theme.muted, padding: 8 }}>The log is empty.</Text>}
        renderItem={({ item }) => (
          <Text testID="debug-entry" style={[styles.entry, { color: theme.text }]}>
            {clock(item.at)} [{item.tag}] {item.message}
          </Text>
        )}
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button title="Refresh" variant="secondary" onPress={reload} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Clear log" variant="danger" onPress={clear} disabled={entries.length === 0} />
        </View>
      </View>
      <Button title="Share log" onPress={share} disabled={entries.length === 0} />
      {uploadEnabled() ? (
        <>
          <Field
            label="What went wrong?"
            accessibilityLabel="What went wrong?"
            hint="Required to send. Say what you were doing and what happened."
            value={problem}
            onChangeText={setProblem}
            maxLength={MAX_DESCRIPTION_LENGTH}
            multiline
          />
          <Button title="Send log to KnG" onPress={send} disabled={entries.length === 0 || description === ''} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 10 },
  list: { flex: 1, borderWidth: 1, borderRadius: 8 },
  entry: { fontFamily: 'monospace', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3 },
  row: { flexDirection: 'row', gap: 10 },
});
