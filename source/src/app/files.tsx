import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Checkbox, Section } from '../components/ui';
import { findSummaries } from '../db/finds';
import { importPlaces, listPlaces, placesForExport, type Place } from '../db/locations';
import { pickImportFile, shareExport, type ImportedFile } from '../formats/files';
import { FORMATS, type ExchangeFormat } from '../formats/index';
import { askIncludeFinds } from '../lib/askIncludeFinds';
import { formatLatLon } from '../lib/format';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../lib/theme';

type Pending = ImportedFile & { selected: Set<number> };

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Export places to GPX or GeoJSON (format asked each time) and import either format. */
export default function FilesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    listPlaces(db).then((all) => {
      setPlaces(all);
      setSelected(new Set(all.map((p) => p.id)));
    });
  }, [db]);

  const exportAs = async (format: ExchangeFormat) => {
    const chosen = places.filter((p) => selected.has(p.id));
    const found = settings.findMode !== 'off' ? await findSummaries(db) : new Map();
    const includeFinds = chosen.some((p) => found.has(p.id)) ? await askIncludeFinds() : false;
    setBusy(true);
    try {
      await shareExport(await placesForExport(db, chosen, includeFinds), format);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const askFormat = () =>
    Alert.alert(`Export ${plural(selected.size, 'place')}`, 'Which format?', [
      { text: 'GPX: GPS units and geocaching apps', onPress: () => exportAs('gpx') },
      { text: 'GeoJSON: mapping tools', onPress: () => exportAs('geojson') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const chooseFile = async () => {
    setBusy(true);
    try {
      const file = await pickImportFile();
      if (!file) return;
      if (file.places.length === 0) {
        Alert.alert('Nothing to import', `No usable places found in ${file.fileName}.`);
        return;
      }
      setPending({ ...file, selected: new Set(file.places.map((_, i) => i)) });
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const importSelected = async () => {
    if (!pending) return;
    const chosen = pending.places.filter((_, i) => pending.selected.has(i));
    const { added, skipped } = await importPlaces(db, chosen, pending.fileName);
    setPending(null);
    const all = await listPlaces(db);
    setPlaces(all);
    setSelected(new Set(all.map((p) => p.id)));
    Alert.alert('Imported', `Added ${plural(added, 'place')}${skipped ? `, skipped ${skipped} already saved` : ''}.`);
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      {pending ? (
        <Section title={`Import from ${pending.fileName}`} style={styles.fill}>
          <Text style={{ color: theme.muted, marginBottom: 6 }}>
            {FORMATS[pending.format].label} · {plural(pending.places.length, 'place')}
            {pending.skipped ? ` · ${pending.skipped} other item${pending.skipped === 1 ? '' : 's'} skipped` : ''}
          </Text>
          <ScrollView style={styles.fill} persistentScrollbar>
            {pending.places.map((p, i) => (
              <Checkbox
                key={i}
                checked={pending.selected.has(i)}
                label={p.name}
                sublabel={formatLatLon(p.latitude, p.longitude)}
                onToggle={() => setPending({ ...pending, selected: toggle(pending.selected, i) })}
              />
            ))}
          </ScrollView>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="secondary" onPress={() => setPending(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Import selected" onPress={importSelected} disabled={pending.selected.size === 0} />
            </View>
          </View>
        </Section>
      ) : (
        <Section title="Import">
          <Text style={{ color: theme.muted, marginBottom: 6 }}>
            GPX (geocaching.com, GPS units, other apps) or GeoJSON. The format is detected from the file.
          </Text>
          <Button title="Choose a file…" onPress={chooseFile} disabled={busy} />
        </Section>
      )}

      <Section title="Export" style={styles.fill}>
        <ScrollView style={styles.fill} persistentScrollbar>
          {places.map((p) => (
            <Checkbox
              key={p.id}
              checked={selected.has(p.id)}
              label={p.name}
              sublabel={formatLatLon(p.latitude, p.longitude)}
              onToggle={() => setSelected(toggle(selected, p.id))}
            />
          ))}
          {places.length === 0 ? <Text style={{ color: theme.muted }}>You have no places to export yet.</Text> : null}
        </ScrollView>
        <Button
          title={`Export ${plural(selected.size, 'place')}…`}
          onPress={askFormat}
          disabled={busy || selected.size === 0}
        />
      </Section>

      {busy ? <ActivityIndicator color={theme.accent} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  fill: { flex: 1, minHeight: 120, marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
});
