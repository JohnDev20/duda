import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../store/settingsStore';

export default function RootLayout() {
  const theme = useSettingsStore((state) => state.theme);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme === 'dark' ? '#0A0A0A' : '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="reader/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="developer" />
      </Stack>
    </GestureHandlerRootView>
  );
}
