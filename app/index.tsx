import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  // Giriş yapmamışsa auth ekranına yönlendir
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Profil yoksa setup ekranına yönlendir
  if (!profile) {
    return <Redirect href="/(auth)/setup" />;
  }

  // Giriş yapmışsa ana ekrana yönlendir
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
});
