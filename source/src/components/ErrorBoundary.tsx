import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { debugLog } from '../lib/debugLog';
import { useTheme } from '../lib/theme';
import { Button } from './ui';

function Fallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
      <Text style={[styles.body, { color: theme.muted }]}>
        FindCache hit an unexpected problem and stopped this screen. Your places are safe. If it keeps happening, turn on
        debug logging in Settings and send the log.
      </Text>
      <Text style={[styles.detail, { color: theme.muted }]}>{message}</Text>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}

/** Catches errors thrown while rendering, writes them to the debug log, and shows a plain message. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const where = (info.componentStack ?? '').split('\n').slice(0, 6).join('\n');
    debugLog('crash', `Screen error: ${error.message}\n${(error.stack ?? '').split('\n').slice(0, 6).join('\n')}\n${where}`);
  }

  render() {
    if (this.state.error) {
      return <Fallback message={this.state.error.message} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  detail: { fontSize: 13, fontFamily: 'monospace' },
});
