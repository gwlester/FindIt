import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { installCrashLogging } from "../lib/crashLog";
import { DATABASE_NAME, migrateDatabase } from "../db/schema";
import { DebugLogging } from "../components/DebugLogging";
import { HelpButton } from "../components/HelpButton";
import { SettingsButton } from "../components/SettingsButton";
import { SettingsProvider } from "../hooks/useSettings";
import { useTheme } from "../lib/theme";

// Catch-all: fatal and unhandled errors go to the debug log (when it is on) from the moment this loads.
installCrashLogging();

/** Header buttons: Settings (unless this is Settings) and help for that screen (if it has any). */
function headerButtons({
  settings = true,
  helpTopic,
}: {
  settings?: boolean;
  helpTopic?: string;
}) {
  return function HeaderButtons() {
    return (
      <View style={styles.buttons}>
        {settings ? <SettingsButton /> : null}
        {helpTopic ? <HelpButton topic={helpTopic} /> : null}
      </View>
    );
  };
}

const help = (helpTopic: string) => headerButtons({ helpTopic });
const settingsOnly = headerButtons({});

const styles = StyleSheet.create({
  buttons: { flexDirection: "row", alignItems: "center", gap: 16 },
});

export default function RootLayout() {
  const theme = useTheme();
  return (
    <ErrorBoundary>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <SettingsProvider>
          <DebugLogging />
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              contentStyle: { backgroundColor: theme.background },
            }}
          >
            <Stack.Screen name="index" options={{ title: "FindCache" }} />
            <Stack.Screen
              name="place"
              options={{ title: "Place", headerRight: help("place") }}
            />
            <Stack.Screen
              name="compass/[id]"
              options={{ title: "Find it", headerRight: help("compass") }}
            />
            <Stack.Screen
              name="share"
              options={{ title: "Share nearby", headerRight: help("share") }}
            />
            <Stack.Screen
              name="share-history"
              options={{
                title: "Sharing history",
                headerRight: help("share-history"),
              }}
            />
            <Stack.Screen name="map" options={{ title: "Map" }} />
            <Stack.Screen
              name="offline-maps"
              options={{
                title: "Offline maps",
                headerRight: help("offline-maps"),
              }}
            />
            <Stack.Screen
              name="files"
              options={{ title: "Import / Export", headerRight: help("files") }}
            />
            <Stack.Screen
              name="help"
              options={{ title: "Help", headerRight: settingsOnly }}
            />
            <Stack.Screen
              name="about"
              options={{ title: "About FindCache", headerRight: settingsOnly }}
            />
            <Stack.Screen
              name="licenses"
              options={{ title: "Licences", headerRight: settingsOnly }}
            />
            <Stack.Screen
              name="debug-log"
              options={{ title: "Debug log", headerRight: help("debug-log") }}
            />
            <Stack.Screen
              name="settings"
              options={{
                title: "Settings",
                headerRight: headerButtons({
                  settings: false,
                  helpTopic: "settings",
                }),
              }}
            />
          </Stack>
        </SettingsProvider>
      </SQLiteProvider>
    </ErrorBoundary>
  );
}
