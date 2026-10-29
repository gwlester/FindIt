import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Checkbox, Field, Section } from '../components/ui';
import { useSettings } from '../hooks/useSettings';
import type { Units } from '../lib/format';

const MAX_DISPLAY_NAME = 40;

export default function SettingsScreen() {
  const { loaded } = useSettings();
  // Render the form only once stored settings are loaded so it starts from them.
  return loaded ? <SettingsForm /> : null;
}

function SettingsForm() {
  const { settings, updateSettings } = useSettings();
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [units, setUnits] = useState<Units>(settings.units);
  const [highAccuracyGps, setHighAccuracyGps] = useState(settings.highAccuracyGps);

  const save = async () => {
    const name = displayName.trim();
    if (!name) return Alert.alert('Name required', 'Nearby users need a name to recognise you.');
    await updateSettings({ displayName: name, units, highAccuracyGps });
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
      <View>
        <Button title="Save" onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
