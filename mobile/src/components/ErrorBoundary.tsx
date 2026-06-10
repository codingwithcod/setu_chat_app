import { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render-phase crashes and shows the error on screen instead of letting
 * the app die silently. Invaluable for diagnosing release builds where there's
 * no Metro/console — the message is selectable so it can be copied or screenshotted.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Also surfaces in `adb logcat` when a device IS connected.
    console.error('[Setu] Uncaught render error:', error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Setu hit an error</Text>
        <Text style={styles.subtitle}>
          Please screenshot this and send it over.
        </Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
          <Text selectable style={styles.message}>
            {error.name}: {error.message}
          </Text>
          {!!error.stack && (
            <Text selectable style={styles.stack}>
              {error.stack}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B', paddingHorizontal: 20, paddingTop: 72 },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#a1a1aa', fontSize: 14, marginTop: 6, marginBottom: 16 },
  scroll: { flex: 1 },
  scrollInner: { paddingBottom: 40 },
  message: { color: '#fb7185', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  stack: { color: '#d4d4d8', fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
});
