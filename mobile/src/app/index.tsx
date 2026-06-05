import { Redirect } from 'expo-router';

// Entry point. The auth gate in _layout.tsx bounces unauthenticated users to
// the login screen, so redirecting to the tabs is the right default.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
