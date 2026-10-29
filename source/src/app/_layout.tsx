import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDatabase } from '../db/schema';
import { SettingsProvider } from '../hooks/useSettings';
import { useTheme } from '../lib/theme';

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
          <Stack.Screen name="place" options={{ title: 'Place' }} />
          <Stack.Screen name="compass/[id]" options={{ title: 'Find it' }} />
          <Stack.Screen name="share" options={{ title: 'Share nearby' }} />
          <Stack.Screen name="files" options={{ title: 'Import / Export' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </SettingsProvider>
    </SQLiteProvider>
  );
}
