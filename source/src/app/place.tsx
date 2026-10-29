import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AveragingPanel } from '../components/AveragingPanel';
import { Button, Field, Section } from '../components/ui';
import { addPlace, getPlace, updatePlace } from '../db/locations';
import { useAveragePosition } from '../hooks/useAveragePosition';
import { usePosition } from '../hooks/usePosition';
import { useSettings } from '../hooks/useSettings';
import type { Average } from '../lib/averaging';
import { formatDistance } from '../lib/format';
import { parseCoordinate } from '../lib/geo';
import { useTheme } from '../lib/theme';

const MAX_NAME_LENGTH = 60;

export default function PlaceScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const { position, permission } = usePosition();
  const averager = useAveragePosition();
  const [averaging, setAveraging] = useState(false);

  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [notes, setNotes] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [source, setSource] = useState('local');

  useEffect(() => {
    if (editingId == null) return;
    getPlace(db, editingId).then((place) => {
      if (!place) return;
      setName(place.name);
      setLat(String(place.latitude));
      setLon(String(place.longitude));
      setNotes(place.notes);
      setAccuracy(place.accuracy);
      setSource(place.source);
    });
  }, [db, editingId]);

  const useCurrentPosition = () => {
    if (!position) return;
    setLat(position.latitude.toFixed(6));
    setLon(position.longitude.toFixed(6));
    setAccuracy(position.accuracy);
  };

  const startAveraging = () => {
    setAveraging(true);
    averager.start();
  };

  const applyAverage = (average: Average) => {
    averager.reset();
    setAveraging(false);
    setLat(average.latitude.toFixed(7));
    setLon(average.longitude.toFixed(7));
    setAccuracy(average.accuracy);
  };

  const cancelAveraging = () => {
    averager.reset();
    setAveraging(false);
  };

  // Typing coordinates by hand means we no longer know how accurate they are.
  const editCoordinate = (setter: (v: string) => void) => (text: string) => {
    setter(text);
    setAccuracy(null);
  };

  const save = async () => {
    const latitude = parseCoordinate(lat, 'lat');
    const longitude = parseCoordinate(lon, 'lon');
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert('Name required', 'Give this place a name.');
    if (latitude == null) return Alert.alert('Invalid latitude', 'Use e.g. 30.4352 or N 30° 26.112');
    if (longitude == null) return Alert.alert('Invalid longitude', 'Use e.g. -91.1903 or W 091° 11.418');
    const place = { name: trimmed, latitude, longitude, accuracy, notes: notes.trim(), source };
    try {
      if (editingId == null) await addPlace(db, place);
      else await updatePlace(db, editingId, place);
      router.back();
    } catch (e) {
      Alert.alert('Could not save', String(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Stack.Screen options={{ title: editingId == null ? 'Add place' : 'Edit place' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Old oak tree cache"
          autoFocus={editingId == null}
        />

        <Section title="Coordinates">
          {averaging ? (
            <AveragingPanel
              running={averager.running}
              fixes={averager.fixes}
              average={averager.average}
              error={averager.error}
              onUse={applyAverage}
              onCancel={cancelAveraging}
            />
          ) : (
            <View style={styles.buttons}>
              <View style={{ flex: 1 }}>
                <Button
                  title={position ? 'Use current' : 'Waiting for GPS…'}
                  variant="secondary"
                  onPress={useCurrentPosition}
                  disabled={!position}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Average position"
                  variant="secondary"
                  onPress={startAveraging}
                  disabled={permission === 'denied'}
                />
              </View>
            </View>
          )}
          <Text style={[styles.gps, { color: theme.muted }]}>
            {permission === 'denied'
              ? 'Location permission denied — enter coordinates by hand.'
              : position?.accuracy != null
                ? `GPS accuracy now ± ${formatDistance(position.accuracy, settings.units)}`
                : ' '}
          </Text>
          <Field
            label="Latitude"
            value={lat}
            onChangeText={editCoordinate(setLat)}
            placeholder="30.435200 or N 30° 26.112"
            autoCapitalize="characters"
          />
          <Field
            label="Longitude"
            value={lon}
            onChangeText={editCoordinate(setLon)}
            placeholder="-91.190300 or W 091° 11.418"
            autoCapitalize="characters"
            hint="Decimal degrees, degrees + minutes, or degrees/minutes/seconds."
          />
          {accuracy != null ? (
            <Text style={{ color: theme.muted }}>
              Recorded accuracy ± {formatDistance(accuracy, settings.units)}
            </Text>
          ) : null}
        </Section>

        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Hints, description…"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Button title="Save" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  gps: { fontSize: 13, marginBottom: 10, marginTop: 2 },
  buttons: { flexDirection: 'row', gap: 10 },
});
