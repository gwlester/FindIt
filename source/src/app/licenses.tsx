import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import licenses from '../help/licenses.json';
import { useTheme } from '../lib/theme';

type Kind = 'app' | 'open-source' | 'map-data';

const TITLES: Record<Kind, string> = { app: 'FindIt licence', 'open-source': 'Open-source licences', 'map-data': 'Map data' };

const MAP_DATA = [
  {
    title: 'OpenStreetMap',
    text: 'Map data © OpenStreetMap contributors, available under the Open Database License (ODbL).',
    link: 'openstreetmap.org/copyright',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    title: 'OpenFreeMap and OpenMapTiles',
    text: 'Street map tiles and style from OpenFreeMap, built with OpenMapTiles (© OpenMapTiles).',
    link: 'openfreemap.org',
    url: 'https://openfreemap.org',
  },
  {
    title: 'USGS The National Map',
    text: 'Satellite imagery from the U.S. Geological Survey, in the public domain (United States only).',
    link: 'nationalmap.gov',
    url: 'https://www.usgs.gov/programs/national-geospatial-program/national-map',
  },
];

/** FindIt's licence, the bundled open-source licences, or the map data credits (`kind`). */
export default function LicensesScreen() {
  const theme = useTheme();
  const { kind: param } = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind = param === 'app' || param === 'map-data' ? param : 'open-source';
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => setExpanded(expanded === key ? null : key);
  const mono = [styles.mono, { color: theme.text, borderColor: theme.border }];
  const link = (label: string, url: string) => (
    <Text accessibilityRole="link" onPress={() => Linking.openURL(url)} style={[styles.link, { color: theme.accent }]}>
      {label}
    </Text>
  );
  const heading = (text: string) => (
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
      {text}
    </Text>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: TITLES[kind] }} />
      {kind === 'app' ? <Text style={mono}>{licenses.app}</Text> : null}

      {kind === 'open-source' ? (
        <>
          <Text style={{ color: theme.muted }}>FindIt is built with these open-source projects. Tap one to read its licence.</Text>
          {heading('Bundled JavaScript packages')}
          {licenses.packages.map((p) => {
            const key = `${p.name}@${p.version}`;
            return (
              <View key={key}>
                <Pressable accessibilityRole="button" onPress={() => toggle(key)} style={[styles.row, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.text }}>
                    {`${p.name} ${p.version}, ${p.license}`}
                  </Text>
                </Pressable>
                {expanded === key ? <Text style={mono}>{p.text}</Text> : null}
              </View>
            );
          })}
          {heading('Native libraries')}
          {licenses.native.map((n) => {
            const label = `${n.name}, ${n.license}`;
            const text = 'text' in n ? (n.text as string) : null;
            return (
              <View key={n.name}>
                {text ? (
                  <Pressable accessibilityRole="button" onPress={() => toggle(n.name)} style={[styles.row, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.text }}>{label}</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.row, { borderColor: theme.border }]}>{link(label, n.url)}</View>
                )}
                {text && expanded === n.name ? <Text style={mono}>{text}</Text> : null}
              </View>
            );
          })}
        </>
      ) : null}

      {kind === 'map-data'
        ? MAP_DATA.map((d) => (
            <View key={d.title} style={styles.section}>
              {heading(d.title)}
              <Text style={{ color: theme.text }}>{d.text}</Text>
              {link(d.link, d.url)}
            </View>
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 6 },
  heading: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  mono: { fontFamily: 'monospace', fontSize: 12, borderWidth: 1, borderRadius: 6, padding: 8 },
  link: { paddingVertical: 6, fontWeight: '600' },
  section: { gap: 6 },
});
