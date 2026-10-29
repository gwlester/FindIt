import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Checkbox, Field, Section, Stepper } from '../components/ui';
import { DEFAULT_SEARCH_AREA_M, searchAreaRange, stepSearchDistance, toDisplayDistance } from '../lib/searchArea';
import { useSettings } from '../hooks/useSettings';
import type { Units } from '../lib/format';
import { useTheme } from '../lib/theme';

const MAX_DISPLAY_NAME = 40;

export default function SettingsScreen() {
  const { loaded } = useSettings();
  // Render the form only once stored settings are loaded so it starts from them.
  return loaded ? <SettingsForm /> : null;
}

function SettingsForm() {
  const { settings, updateSettings } = useSettings();
  const theme = useTheme();
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [units, setUnits] = useState<Units>(settings.units);
  const [highAccuracyGps, setHighAccuracyGps] = useState(settings.highAccuracyGps);
  // Kept in metres whatever the units, so switching units converts the shown value.
  const [searchDistance, setSearchDistance] = useState(settings.searchAreaDistanceM ?? DEFAULT_SEARCH_AREA_M);
  const [alwaysArrow, setAlwaysArrow] = useState(settings.searchAreaDistanceM === null);

  const save = async () => {
    const name = displayName.trim();
    if (!name) return Alert.alert('Name required', 'Nearby users need a name to recognise you.');
    await updateSettings({
      displayName: name,
      units,
      highAccuracyGps,
      searchAreaDistanceM: alwaysArrow ? null : searchDistance,
    });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Field
        label="Your name for sharing"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={MAX_DISPLAY_NAME}
        hint="Nearby FindIt users see the first dozen or so characters before they connect."
      />
      <Section title="Distance units">
        <Checkbox checked={units === 'metric'} label="Metric" sublabel="metres / kilometres" onToggle={() => setUnits('metric')} />
        <Checkbox checked={units === 'imperial'} label="Imperial" sublabel="feet / miles" onToggle={() => setUnits('imperial')} />
      </Section>
      <Section title="GPS">
        <Checkbox
          checked={highAccuracyGps}
          label="High-accuracy GPS"
          sublabel="Keep tracking every satellite while finding or averaging a place (Android 12+). Uses more battery."
          onToggle={() => setHighAccuracyGps(!highAccuracyGps)}
        />
      </Section>
      <Section title="Search area">
        <Checkbox
          checked={alwaysArrow}
          label="Always show the arrow"
          sublabel="Otherwise, close to the cache the compass shows a map of the search area."
          onToggle={() => setAlwaysArrow(!alwaysArrow)}
        />
        {alwaysArrow ? null : (
          <>
            <Text style={[styles.label, { color: theme.muted }]}>Show the search area within</Text>
            <Stepper
              value={`${toDisplayDistance(searchDistance, units)} ${searchAreaRange(units).unit}`}
              onDecrease={() => setSearchDistance(stepSearchDistance(searchDistance, units, -1))}
              onIncrease={() => setSearchDistance(stepSearchDistance(searchDistance, units, 1))}
              decreaseLabel="Decrease distance"
              increaseLabel="Increase distance"
            />
          </>
        )}
      </Section>
      <View>
        <Button title="Save" onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8 },
});
