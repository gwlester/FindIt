import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDatabase } from '../db/schema';
import { HelpButton } from '../components/HelpButton';
import { SettingsProvider } from '../hooks/useSettings';
import { useTheme } from '../lib/theme';

/** Header button with help for that screen. */
function help(topic: string) {
  return function HeaderHelp() {
    return <HelpButton topic={topic} />;
  };
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      <SettingsProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'FindIt' }} />
          <Stack.Screen name="place" options={{ title: 'Place', headerRight: help('place') }} />
          <Stack.Screen name="compass/[id]" options={{ title: 'Find it', headerRight: help('compass') }} />
          <Stack.Screen name="share" options={{ title: 'Share nearby', headerRight: help('share') }} />
          <Stack.Screen name="share-history" options={{ title: 'Sharing history', headerRight: help('share-history') }} />
          <Stack.Screen name="map" options={{ title: 'Map' }} />
          <Stack.Screen name="offline-maps" options={{ title: 'Offline maps', headerRight: help('offline-maps') }} />
          <Stack.Screen name="files" options={{ title: 'Import / Export', headerRight: help('files') }} />
          <Stack.Screen name="help" options={{ title: 'Help' }} />
          <Stack.Screen name="about" options={{ title: 'About FindIt' }} />
          <Stack.Screen name="licenses" options={{ title: 'Licences' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings', headerRight: help('settings') }} />
        </Stack>
      </SettingsProvider>
    </SQLiteProvider>
  );
}
