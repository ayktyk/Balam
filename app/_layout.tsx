import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.cream },
          headerTintColor: COLORS.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: COLORS.cream },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="entry/[id]"
          options={{
            title: '',
            headerBackTitle: 'Geri',
          }}
        />
      </Stack>
    </>
  );
}
