import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchSharedPlaces,
  onBluetoothStateChange,
  scanForNearbyUsers,
  type NearbyUser,
} from '../ble/client';
import { requestBluetoothPermissions } from '../ble/permissions';
import type { SharedPlace } from '../ble/protocol';
import { startSharing, stopSharing, onSharePeer } from '../ble/server';
import { Button, Checkbox, Section } from '../components/ui';
import { addPlace, hasDuplicate, listPlaces, type Place } from '../db/locations';
import { useSettings } from '../hooks/useSettings';
import { formatLatLon } from '../lib/format';
import { useTheme } from '../lib/theme';

/** Nearby users not heard from for this long drop off the list. */
const STALE_MS = 15000;

type Received = { from: string; places: SharedPlace[]; selected: Set<number> };

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function signalLabel(rssi: number | null) {
  if (rssi == null) return '';
  if (rssi > -60) return 'very close';
  if (rssi > -75) return 'close';
  return 'farther away';
}

export default function ShareScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();

  const [bluetooth, setBluetooth] = useState<string>('Unknown');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState(0);

  const [scanning, setScanning] = useState(false);
  const [nearby, setNearby] = useState<Map<string, NearbyUser>>(new Map());
  const [fetching, setFetching] = useState<{ id: string; done: number; total: number } | null>(null);
  const [received, setReceived] = useState<Received | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    listPlaces(db).then((all) => {
      setPlaces(all);
      setSelected(new Set(all.map((p) => p.id)));
    });
  }, [db]);

  useEffect(() => {
    const stateSub = onBluetoothStateChange(setBluetooth);
    const peerSub = onSharePeer((e) => setConnectedPeers((n) => Math.max(0, n + (e.state === 'connected' ? 1 : -1))));
    return () => {
      stateSub.remove();
      peerSub.remove();
      stopScanRef.current?.();
      stopSharing().catch(() => {});
    };
  }, []);

  // Drop nearby users that have gone quiet.
  useEffect(() => {
    if (!scanning) return;
    const timer = setInterval(() => {
      setNearby((current) => {
        const now = Date.now();
        const fresh = [...current].filter(([, u]) => now - u.lastSeen < STALE_MS);
        return fresh.length === current.size ? current : new Map(fresh);
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [scanning]);

  const bluetoothReady = bluetooth === 'PoweredOn';

  const toggleSharing = async () => {
    if (sharing) {
      await stopSharing().catch(() => {});
      setSharing(false);
      setConnectedPeers(0);
      return;
    }
    if (!(await requestBluetoothPermissions())) {
      Alert.alert('Bluetooth permission needed', 'Allow "Nearby devices" to share with other FindIt users.');
      return;
    }
    const shared = places
      .filter((p) => selected.has(p.id))
      .map(({ name, latitude, longitude, accuracy, notes }) => ({ name, latitude, longitude, accuracy, notes }));
    try {
      await startSharing(settings.displayName, shared);
      setSharing(true);
    } catch (e) {
      Alert.alert('Could not start sharing', e instanceof Error ? e.message : String(e));
    }
  };

  const toggleScanning = async () => {
    if (scanning) {
      stopScanRef.current?.();
      stopScanRef.current = null;
      setScanning(false);
      return;
    }
    if (!(await requestBluetoothPermissions())) {
      Alert.alert('Bluetooth permission needed', 'Allow "Nearby devices" to find other FindIt users.');
      return;
    }
    setNearby(new Map());
    stopScanRef.current = scanForNearbyUsers(
      (user) => setNearby((current) => new Map(current).set(user.id, user)),
      (message) => {
        setScanning(false);
        Alert.alert('Scan failed', message);
      },
    );
    setScanning(true);
  };

  const download = async (user: NearbyUser) => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    setScanning(false);
    setFetching({ id: user.id, done: 0, total: 0 });
    try {
      const result = await fetchSharedPlaces(user.id, (done, total) => setFetching({ id: user.id, done, total }));
      setReceived({ ...result, selected: new Set(result.places.map((_, i) => i)) });
    } catch (e) {
      Alert.alert('Could not download', e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(null);
    }
  };

  const importSelected = async () => {
    if (!received) return;
    let added = 0;
    let skipped = 0;
    for (const [i, place] of received.places.entries()) {
      if (!received.selected.has(i)) continue;
      if (await hasDuplicate(db, place)) {
        skipped++;
        continue;
      }
      await addPlace(db, { ...place, source: received.from });
      added++;
    }
    setReceived(null);
    setPlaces(await listPlaces(db));
    Alert.alert('Imported', `Added ${added} place${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} already saved` : ''}.`);
  };

  // Each list scrolls inside its own section so the buttons always stay on screen.
  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 16 }]}>
      {!bluetoothReady ? (
        <Text style={[styles.warning, { color: theme.danger }]}>
          {bluetooth === 'PoweredOff' ? 'Bluetooth is off — turn it on to share.' : `Bluetooth: ${bluetooth}`}
        </Text>
      ) : null}

      {received ? (
        <Section title={`From ${received.from}`} style={styles.fill}>
          <ScrollView style={styles.fill} persistentScrollbar>
            {received.places.length === 0 ? (
              <Text style={{ color: theme.muted }}>They aren’t sharing any places.</Text>
            ) : (
              received.places.map((p, i) => (
                <Checkbox
                  key={i}
                  checked={received.selected.has(i)}
                  label={p.name}
                  sublabel={formatLatLon(p.latitude, p.longitude)}
                  onToggle={() => setReceived({ ...received, selected: toggle(received.selected, i) })}
                />
              ))
            )}
          </ScrollView>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="secondary" onPress={() => setReceived(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Import selected" onPress={importSelected} disabled={received.selected.size === 0} />
            </View>
          </View>
        </Section>
      ) : (
        <Section title="Receive from nearby" style={styles.fill}>
          <Button
            title={scanning ? 'Stop looking' : 'Look for nearby FindIt users'}
            variant={scanning ? 'secondary' : 'primary'}
            onPress={toggleScanning}
            disabled={!bluetoothReady || fetching != null}
          />
          <ScrollView style={styles.fill} persistentScrollbar>
            {scanning && nearby.size === 0 ? (
              <View style={styles.row}>
                <ActivityIndicator color={theme.accent} />
                <Text style={{ color: theme.muted }}>Looking… the other phone must be sharing.</Text>
              </View>
            ) : null}
            {[...nearby.values()].map((user) => (
              <Pressable
                key={user.id}
                onPress={() => download(user)}
                disabled={fetching != null}
                style={({ pressed }) => [styles.user, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{user.name}</Text>
                <Text style={{ color: theme.muted }}>{signalLabel(user.rssi)} · tap to download</Text>
              </Pressable>
            ))}
          </ScrollView>
          {fetching ? (
            <View style={styles.row}>
              <ActivityIndicator color={theme.accent} />
              <Text style={{ color: theme.muted }}>
                {fetching.total ? `Downloading ${fetching.done} of ${fetching.total}…` : 'Connecting…'}
              </Text>
            </View>
          ) : null}
        </Section>
      )}

      <Section title="Share my places" style={styles.fill}>
        <Text style={{ color: theme.muted, marginBottom: 6 }}>
          Nearby FindIt users will see you as “{settings.displayName}”.
        </Text>
        <ScrollView style={styles.fill} persistentScrollbar>
          {places.map((p) => (
            <Checkbox
              key={p.id}
              checked={selected.has(p.id)}
              label={p.name}
              sublabel={formatLatLon(p.latitude, p.longitude)}
              onToggle={() => !sharing && setSelected(toggle(selected, p.id))}
            />
          ))}
          {places.length === 0 ? <Text style={{ color: theme.muted }}>You have no places to share yet.</Text> : null}
        </ScrollView>
        <Button
          title={sharing ? 'Stop sharing' : `Share ${selected.size} place${selected.size === 1 ? '' : 's'}`}
          variant={sharing ? 'danger' : 'primary'}
          onPress={toggleSharing}
          disabled={!bluetoothReady || (!sharing && selected.size === 0)}
        />
        {sharing ? (
          <Text style={{ color: theme.accent, marginTop: 4 }}>
            Sharing — keep this screen open.{connectedPeers > 0 ? ` ${connectedPeers} connected now.` : ''}
          </Text>
        ) : null}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  // Sections split the free height; each needs room for a few rows before scrolling.
  fill: { flex: 1, minHeight: 120, marginBottom: 0 },
  warning: { fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  user: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
});
