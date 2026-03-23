import { useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../constants/theme';

export default function SettingsScreen() {
  const { profile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Çıkış yapmak istediğinden emin misin?')
      : true; // Native'de Alert kullanilacak

    if (!confirmed) return;

    setSigningOut(true);
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (error) {
      if (__DEV__) console.log('Çıkış hatası:', error);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Profil kartı */}
      <View style={styles.profileCard}>
        <Text style={styles.profileEmoji}>
          {profile?.avatarEmoji ?? '🌿'}
        </Text>
        <View>
          <Text style={styles.profileName}>
            {profile?.displayName ?? 'Kullanıcı'}
          </Text>
          <Text style={styles.profileRole}>Ebeveyn</Text>
        </View>
      </View>

      {/* Yasemin erişimi */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yasemin'in Erişimi</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>Durum: Kapalı</Text>
          <Text style={styles.cardHint}>
            Faz 3'te aktif edilecek. Yasemin özel koduyla giriş yapabilecek.
          </Text>
        </View>
      </View>

      {/* Dışa aktarma */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            Alert.alert('Yakında', 'Export özelliği Faz 4\'te gelecek.')
          }
        >
          <Text style={styles.cardText}>Tüm Anıları Dışa Aktar</Text>
          <Text style={styles.cardHint}>
            JSON + fotoğraflar ZIP olarak indirilir.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Çıkış */}
      <TouchableOpacity
        style={[styles.signOutButton, signingOut && { opacity: 0.5 }]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        <Text style={styles.signOutText}>
          {signingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    padding: SPACING.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  profileEmoji: {
    fontSize: 40,
  },
  profileName: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },
  profileRole: {
    fontSize: 13,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.uiBold,
    color: COLORS.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  cardText: {
    fontSize: 15,
    fontFamily: FONTS.uiMedium,
    color: COLORS.ink,
  },
  cardHint: {
    fontSize: 13,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
    marginTop: SPACING.xs,
  },
  signOutButton: {
    marginTop: 'auto',
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontFamily: FONTS.uiMedium,
  },
});
