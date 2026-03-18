import { Stack } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.cream },
        headerTintColor: COLORS.ink,
        contentStyle: { backgroundColor: COLORS.cream },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Giriş Yap' }} />
      <Stack.Screen name="setup" options={{ title: 'Aile Kurulumu' }} />
      <Stack.Screen name="yasemin" options={{ title: "Yasemin'in Girişi" }} />
    </Stack>
  );
}
