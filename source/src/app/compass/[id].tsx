import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Compass } from '../../components/Compass';
import { Button } from '../../components/ui';
import { getPlace, type Place } from '../../db/locations';
import { useAveragePosition } from '../../hooks/useAveragePosition';
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

  // Smoothed position/heading steady the display; the accuracy shown is still per fix.
  const { position, permission, error } = usePosition({ smooth: true });
  const heading = useHeading();
  const gnss = useGnssStatus({ fullTracking: settings.highAccuracyGps });
  // While standing still the user can average their position for a steadier distance
  // and a tighter uncertainty radius; it stops by itself if they walk away.
  const averager = useAveragePosition({ stopWhenMoving: true });
  const average = averager.running ? averager.average : null;
  const here = average
    ? { latitude: average.latitude, longitude: average.longitude, accuracy: average.accuracy }
    : position;

  useEffect(() => {
    getPlace(db, Number(id)).then(setPlace);
  }, [db, id]);

  const distance = here && place ? distanceMeters(here, place) : null;
  const bearing = here && place ? bearingDegrees(here, place) : null;
  const uncertainty = combinedUncertainty(here?.accuracy ?? null, place?.accuracy ?? null);
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
        {average ? ` · averaged over ${average.count} fixes` : ''}
      </Text>
      {withinUncertainty ? (
        <Text style={[styles.close, { color: theme.accent }]}>You’re within the uncertainty radius — look around!</Text>
      ) : null}

      <View style={styles.averaging}>
        {averager.running ? (
          <View style={[styles.averagingPanel, { borderColor: theme.accent }]}>
            <Text style={[styles.detail, { color: theme.text, fontWeight: '700' }]}>
              Averaging your position — stand still
            </Text>
            <Text style={[styles.detail, { color: theme.muted }]}>
              {average ? `${average.count} fixes · ± ${fmt(average.accuracy)}` : 'Waiting for GPS fixes…'}
            </Text>
            <Button title="Stop averaging" variant="secondary" onPress={averager.reset} />
          </View>
        ) : (
          <>
            {averager.movedAway ? (
              <Text style={[styles.small, { color: theme.muted }]}>Stopped averaging because you moved.</Text>
            ) : null}
            <Button title="Average my position" variant="secondary" onPress={averager.start} disabled={!position} />
          </>
        )}
      </View>

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
        {gnss.fullTrackingOn ? (
          <Text style={[styles.small, { color: theme.muted }]}>Full GNSS tracking on (High-accuracy GPS)</Text>
        ) : null}
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
  averaging: { alignSelf: 'stretch', marginTop: 12 },
  averagingPanel: { borderWidth: 2, borderRadius: 10, padding: 10, gap: 4 },
  details: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16, gap: 4 },
  detail: { fontSize: 15 },
  small: { fontSize: 13 },
  notes: { alignSelf: 'stretch', marginTop: 16, fontSize: 15, lineHeight: 21 },
});
