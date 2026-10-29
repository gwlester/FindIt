import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useGnssStatus } from '../hooks/useGnssStatus';
import { useSettings } from '../hooks/useSettings';
import type { Average } from '../lib/averaging';
import { formatDistance } from '../lib/format';
import { useTheme } from '../lib/theme';
import { KeepAwake } from './KeepAwake';
import { Button } from './ui';

type Props = {
  running: boolean;
  fixes: number;
  average: Average | null;
  error: string | null;
  onUse: (average: Average) => void;
  onCancel: () => void;
};

function formatDuration(sec: number) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Live view of position averaging, with satellite counts while it runs. */
export function AveragingPanel({ running, fixes, average, error, onUse, onCancel }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const gnss = useGnssStatus({ fullTracking: settings.highAccuracyGps });
  const fmt = (m: number) => formatDistance(m, settings.units);
  const ignored = average ? fixes - average.count : fixes;

  return (
    <View style={[styles.panel, { borderColor: theme.accent }]}>
      <KeepAwake tag="averaging" />
      <View style={styles.row}>
        {running ? <ActivityIndicator color={theme.accent} /> : null}
        <Text style={[styles.title, { color: theme.text }]}>
          {running ? 'Averaging — keep the phone still' : 'Averaging stopped'}
        </Text>
      </View>
      <Text style={{ color: theme.text }}>
        {average ? `${average.count} fixes · ${formatDuration(average.durationSec)}` : 'Waiting for GPS fixes…'}
        {ignored > 0 ? ` (${ignored} poor fix${ignored === 1 ? '' : 'es'} ignored)` : ''}
      </Text>
      {average ? (
        <>
          <Text style={[styles.big, { color: theme.accent }]}>± {fmt(average.accuracy)}</Text>
          <Text style={{ color: theme.muted }}>
            estimated accuracy · fixes wander ± {fmt(average.spread)}
          </Text>
        </>
      ) : null}
      {gnss.status ? (
        <Text style={{ color: theme.muted }}>
          Satellites: {gnss.status.used} used · {gnss.status.inView} in view
          {gnss.fullTrackingOn ? ' · full tracking' : ''}
        </Text>
      ) : null}
      {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      <Text style={[styles.hint, { color: theme.muted }]}>
        Longer is better: aim for 1–2 minutes with a clear view of the sky.
      </Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Use average" onPress={() => average && onUse(average)} disabled={!average} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 2, borderRadius: 10, padding: 12, gap: 4, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  big: { fontSize: 28, fontWeight: '800' },
  hint: { fontSize: 12, marginTop: 2 },
});
