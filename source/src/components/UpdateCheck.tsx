import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { reportFailure } from '../lib/failure';
import { useTheme } from '../lib/theme';
import { checkForUpdate, currentVersion, downloadAndInstall, type Update } from '../lib/updates';
import { Button } from './ui';

/** Settings → Updates (sideloaded build only): look for a newer release, then download and install it. */
export function UpdateCheck() {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const install = async (update: Update) => {
    setBusy(true);
    try {
      await downloadAndInstall(update);
    } catch (e) {
      Alert.alert('Could not install the update', reportFailure('update', 'Installing the update', e));
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      const update = await checkForUpdate();
      if (!update) {
        Alert.alert('You are up to date', `FindCache ${currentVersion()} is the newest version.`);
        return;
      }
      Alert.alert(
        `Version ${update.version} is available`,
        `${update.notes ? `${update.notes}\n\n` : ''}Install it now? Android may ask you to allow FindCache to install apps.`,
        [{ text: 'Not now', style: 'cancel' }, { text: 'Download and install', onPress: () => install(update) }],
      );
    } catch (e) {
      Alert.alert('Could not check for updates', reportFailure('update', 'Checking for updates', e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={{ color: theme.muted }}>Version {currentVersion()}</Text>
      <Button title="Check for updates" variant="secondary" onPress={check} disabled={busy} />
    </>
  );
}
