import { Camera, Map, Marker, NativeUserLocation, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { findSummaries } from '../db/finds';
import { listPlaces, type Place } from '../db/locations';
import { usePosition } from '../hooks/usePosition';
import { useSettings } from '../hooks/useSettings';
import { formatDistance } from '../lib/format';
import { distanceMeters } from '../lib/geo';
import { likelyInUsgsCoverage, mapStyleFor, type MapLayer } from '../lib/mapSources';
import { initialView } from '../lib/mapView';
import { useTheme } from '../lib/theme';

const LAYERS: { layer: MapLayer; label: string }[] = [
  { layer: 'streets', label: 'Map' },
  { layer: 'satellite', label: 'Satellite' },
];

/** All places on a street map or US satellite imagery; tap one to find it. `id` focuses a place. */
export default function MapScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { settings, updateSettings } = useSettings();
  const { position } = usePosition();

  const [places, setPlaces] = useState<Place[] | null>(null);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);
  const [center, setCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    Promise.all([listPlaces(db), findSummaries(db)]).then(([all, finds]) => {
      setFound(new Set([...finds].filter(([, f]) => f.myCount > 0).map(([placeId]) => placeId)));
      setPlaces(all);
    });
  }, [db]);

  if (!places) return null;

  const layer = settings.mapLayer;
  const focus = places.find((p) => p.id === Number(id));
  const view = initialView(focus ? [focus] : places);
  const selected = places.find((p) => p.id === selectedId);
  const outsideCoverage = layer === 'satellite' && center != null && !likelyInUsgsCoverage(center[1], center[0]);

  const chooseLayer = (next: MapLayer) => updateSettings({ ...settings, mapLayer: next });
  const onRegionDidChange = (e: NativeSyntheticEvent<ViewStateChangeEvent>) => setCenter(e.nativeEvent.center);

  return (
    <View style={styles.screen}>
      <Map style={styles.map} mapStyle={mapStyleFor(layer)} onRegionDidChange={onRegionDidChange} compass>
        {view ? <Camera initialViewState={view} /> : <Camera trackUserLocation="default" zoom={14} />}
        <NativeUserLocation />
        {places.map((p) => (
          <Marker key={p.id} id={String(p.id)} lngLat={[p.longitude, p.latitude]} anchor="bottom" onPress={() => setSelectedId(p.id)}>
            <View style={styles.marker}>
              <Text style={[styles.markerLabel, { color: theme.text, backgroundColor: theme.surface }]}>
                {p.name}
                {found.has(p.id) ? ' ✓' : ''}
              </Text>
              <View style={[styles.pin, { backgroundColor: p.id === selectedId ? theme.danger : theme.accent }]} />
            </View>
          </Marker>
        ))}
      </Map>

      <View style={[styles.layers, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {LAYERS.map(({ layer: l, label }) => (
          <Pressable
            key={l}
            accessibilityRole="button"
            accessibilityState={{ selected: layer === l }}
            onPress={() => chooseLayer(l)}
            style={[styles.layerButton, layer === l && { backgroundColor: theme.accent }]}
          >
            <Text style={{ color: layer === l ? theme.accentText : theme.text, fontWeight: '600' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {outsideCoverage || places.length === 0 ? (
        <Text style={[styles.notice, { color: theme.text, backgroundColor: theme.surface }]}>
          {places.length === 0 ? 'No places yet. Add one from the list.' : 'Satellite imagery covers the US only.'}
        </Text>
      ) : null}

      {selected ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: insets.bottom + 12 }]}>
          <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.text }]}>
            {selected.name}
          </Text>
          {position ? (
            <Text style={{ color: theme.muted }}>
              {formatDistance(distanceMeters(position, selected), settings.units)} away
            </Text>
          ) : null}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button title="Close" variant="secondary" onPress={() => setSelectedId(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Find it"
                onPress={() => router.push({ pathname: '/compass/[id]', params: { id: String(selected.id) } })}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  marker: { alignItems: 'center' },
  markerLabel: { fontSize: 12, fontWeight: '600', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
  pin: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff', marginTop: 2 },
  layers: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  layerButton: { paddingHorizontal: 14, paddingVertical: 8 },
  notice: { position: 'absolute', top: 60, left: 12, right: 12, padding: 8, borderRadius: 8, textAlign: 'center' },
  card: { position: 'absolute', left: 12, right: 12, bottom: 0, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
