import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Compass } from '../../components/Compass';
import { getPlace, type Place } from '../../db/locations';
import { useGnssStatus } from '../../hooks/useGnssStatus';
import { useHeading } from '../../hooks/useHeading';
import { usePosition } from '../../hooks/usePosition';
import { useSettings } from '../../hooks/useSettings';
import { formatDistance, formatLatLon } from '../../lib/format';
import { bearingDegrees, combinedUncertainty, compassPoint, distanceMeters } from '../../lib/geo';
import { useTheme } from '../../lib/theme';

export default function CompassScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);

  const { position, permission, error } = usePosition();
  const heading = useHeading();
  const gnss = useGnssStatus();

  useEffect(() => {
    getPlace(db, Number(id)).then(setPlace);
  }, [db, id]);

  const distance = position && place ? distanceMeters(position, place) : null;
  const bearing = position && place ? bearingDegrees(position, place) : null;
  const uncertainty = combinedUncertainty(position?.accuracy ?? null, place?.accuracy ?? null);
  const withinUncertainty = distance != null && uncertainty != null && distance <= uncertainty;
  const fmt = (m: number) => formatDistance(m, settings.units);

  let statusLine: string;
  if (permission === 'denied') statusLine = 'Location permission denied';
  else if (error) statusLine = error;
  else if (!position) statusLine = 'Waiting for GPS fix…';
  else statusLine = '';

  const sats = gnss.status;
  const satelliteLine = gnss.error
    ? `Satellites: ${gnss.error}`
    : sats
      ? `Satellites: ${sats.used} used · ${sats.inView} in view · ${sats.known} known`
      : 'Satellites: waiting for GNSS status…';
  const constellations = sats
    ? Object.entries(sats.usedByConstellation)
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => `${name} ${n}`)
        .join(' · ')
    : '';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: place?.name ?? 'Find it' }} />
      {place ? (
        <Text style={[styles.coords, { color: theme.muted }]}>{formatLatLon(place.latitude, place.longitude)}</Text>
      ) : null}

      <View style={styles.compass}>
        <Compass size={Math.min(width - 32, 360)} heading={heading?.degrees ?? null} bearing={bearing} />
      </View>

      {statusLine ? <Text style={[styles.status, { color: theme.danger }]}>{statusLine}</Text> : null}

      <Text style={[styles.distance, { color: theme.text }]}>{distance != null ? `≈ ${fmt(distance)}` : '—'}</Text>
      <Text style={[styles.uncertainty, { color: theme.muted }]}>
        {uncertainty != null ? `uncertainty radius ± ${fmt(uncertainty)}` : 'uncertainty unknown'}
      </Text>
      {withinUncertainty ? (
        <Text style={[styles.close, { color: theme.accent }]}>You’re within the uncertainty radius — look around!</Text>
      ) : null}

      <View style={[styles.details, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {bearing != null ? (
          <Text style={[styles.detail, { color: theme.text }]}>
            Bearing {Math.round(bearing).toString().padStart(3, '0')}° {compassPoint(bearing)}
          </Text>
        ) : null}
        <Text style={[styles.detail, { color: theme.text }]}>
          {heading
            ? `Heading ${Math.round(heading.degrees).toString().padStart(3, '0')}° ${heading.isTrue ? 'true' : 'magnetic'}`
            : 'Heading: waiting for compass…'}
        </Text>
        {heading && heading.accuracy <= 1 ? (
          <Text style={[styles.detail, { color: theme.danger }]}>
            Compass needs calibration — move the phone in a figure-8.
          </Text>
        ) : null}
        <Text style={[styles.detail, { color: theme.text }]}>
          {position?.accuracy != null ? `GPS accuracy ± ${fmt(position.accuracy)}` : 'GPS accuracy: —'}
          {place?.accuracy != null ? ` · place recorded ± ${fmt(place.accuracy)}` : ''}
        </Text>
        <Text style={[styles.detail, { color: theme.text }]}>{satelliteLine}</Text>
        {constellations ? <Text style={[styles.small, { color: theme.muted }]}>{constellations}</Text> : null}
      </View>

      {place?.notes ? <Text style={[styles.notes, { color: theme.muted }]}>{place.notes}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center', paddingBottom: 48 },
  coords: { fontSize: 14, marginBottom: 8 },
  compass: { marginVertical: 8 },
  status: { fontSize: 14, marginTop: 4 },
  distance: { fontSize: 44, fontWeight: '800', marginTop: 8 },
  uncertainty: { fontSize: 16 },
  close: { fontSize: 15, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  details: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16, gap: 4 },
  detail: { fontSize: 15 },
  small: { fontSize: 13 },
  notes: { alignSelf: 'stretch', marginTop: 16, fontSize: 15, lineHeight: 21 },
});
