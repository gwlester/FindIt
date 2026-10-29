import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { deletePlace, listPlaces, type Place } from '../db/locations';
import { usePosition } from '../hooks/usePosition';
import { useSettings } from '../hooks/useSettings';
import { formatDistance, formatLatLon } from '../lib/format';
import { distanceMeters } from '../lib/geo';
import { useTheme } from '../lib/theme';

export default function PlacesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { position } = usePosition();
  const [places, setPlaces] = useState<Place[]>([]);

  const reload = useCallback(() => {
    listPlaces(db).then(setPlaces).catch((e) => Alert.alert('Could not load places', String(e)));
  }, [db]);

  useFocusEffect(reload);

  const confirmDelete = (place: Place) =>
    Alert.alert('Delete place?', place.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlace(db, place.id).then(reload),
      },
    ]);

  const showActions = (place: Place) =>
    Alert.alert(place.name, formatLatLon(place.latitude, place.longitude), [
      { text: 'Edit', onPress: () => router.push({ pathname: '/place', params: { id: String(place.id) } }) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(place) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable accessibilityRole="button" onPress={() => router.push('/files')} hitSlop={12}>
                <Text style={[styles.headerButton, { color: theme.accent }]}>Files</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} hitSlop={12}>
                <Text style={[styles.headerButton, { color: theme.accent }]}>Settings</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={places}
        keyExtractor={(p) => String(p.id)}
        style={styles.list}
        persistentScrollbar
        contentContainerStyle={places.length === 0 ? styles.emptyContainer : styles.listContent}
        ListHeaderComponent={
          places.length > 0 ? (
            <Text style={[styles.tip, { color: theme.muted }]}>Tap a place to find it · long-press to edit</Text>
          ) : undefined
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>
            No places yet. Add one from your current position, enter coordinates, or receive some from a nearby
            FindIt user.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/compass/[id]', params: { id: String(item.id) } })}
            onLongPress={() => showActions(item)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.sub, { color: theme.muted }]}>{formatLatLon(item.latitude, item.longitude)}</Text>
              {item.source !== 'local' ? (
                <Text style={[styles.sub, { color: theme.muted }]}>From {item.source}</Text>
              ) : null}
            </View>
            {position ? (
              <Text style={[styles.distance, { color: theme.accent }]}>
                {formatDistance(distanceMeters(position, item), settings.units)}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Button title="Add place" onPress={() => router.push('/place')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Share nearby" variant="secondary" onPress={() => router.push('/share')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButtons: { flexDirection: 'row', gap: 20 },
  headerButton: { fontSize: 16, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  empty: { textAlign: 'center', fontSize: 16, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  name: { fontSize: 17, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
  distance: { fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  tip: { textAlign: 'center', fontSize: 12 },
});
