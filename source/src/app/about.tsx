import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '../components/ui';
import { useBottomPadding } from '../lib/insets';
import { useTheme } from '../lib/theme';

const ICON = require('../../assets/icon.png');

/** App name, version, a short description and the licences. */
export default function AboutScreen() {
  const theme = useTheme();
  const bottom = useBottomPadding();
  const version = Constants.expoConfig?.version ?? 'unknown';
  const licences = (kind: string) => router.push({ pathname: '/licenses', params: { kind } });

  return (
    <ScrollView testID="scroll" contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <Image source={ICON} style={styles.icon} accessibilityIgnoresInvertColors />
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        FindCache
      </Text>
      <Text style={{ color: theme.muted }}>Version {version}</Text>
      <Text style={[styles.paragraph, { color: theme.text }]}>
        FindCache is a simple geocache-style app: save named places, then let the compass, the distance and the
        uncertainty radius guide you back to them. It works offline, keeps everything on your phone, and shares
        places with FindCache users nearby over Bluetooth. Maps come from OpenStreetMap and, in the United States, USGS
        satellite imagery.
      </Text>
      <Button title="FindCache licence" variant="secondary" onPress={() => licences('app')} />
      <Button title="Open-source licences" variant="secondary" onPress={() => licences('open-source')} />
      <Button title="Map data" variant="secondary" onPress={() => licences('map-data')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12, alignItems: 'stretch' },
  icon: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  paragraph: { fontSize: 15, lineHeight: 22, marginVertical: 8 },
});
