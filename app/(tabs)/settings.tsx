import { useEffect, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, Platform, Switch, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { doc, getDoc, updateDoc, getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../constants/theme';

export default function SettingsScreen() {
  const { profile, user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [familyData, setFamilyData] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchFamily() {
      if (!profile?.familyId) return;
      setLoadingFamily(true);
      try {
        const docSnap = await getDoc(doc(db, 'families', profile.familyId));
        if (docSnap.exists()) {
          setFamilyData(docSnap.data());
        }
      } catch (error) {
        console.error('Aile verisi yuklenemedi:', error);
      } finally {
        setLoadingFamily(false);
      }
    }
    fetchFamily();
  }, [profile?.familyId]);

  async function updateFamilySetting(key: string, value: any) {
    if (!profile?.familyId) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'families', profile.familyId), {
        [key]: value
      });
      setFamilyData((prev: any) => ({ ...prev, [key]: value }));
    } catch (error) {
      Alert.alert('Hata', 'Ayarlar guncellenemedi.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleExport() {
    if (!profile?.familyId) return;
    
    setExporting(true);
    try {
      const q = query(
        collection(db, 'entries'),
        where('familyId', '==', profile.familyId),
        orderBy('entryDate', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          // Firestore timestamp'leri okunabilir tarihe ceviriyoruz
          entryDate: (data as any).entryDate?.toDate?.()?.toISOString() || null,
          createdAt: (data as any).createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: (data as any).updatedAt?.toDate?.()?.toISOString() || null,
        };
      });

      const exportData = {
        family: {
          id: profile.familyId,
          name: familyData?.name || 'Balam Ailesi',
          exportedAt: new Date().toISOString(),
        },
        entries: entries
      };

      const fileUri = `${FileSystem.cacheDirectory}balam-arsiv.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Balam Anı Arşivi',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Hata', 'Paylaşım bu cihazda desteklenmiyor.');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Hata', 'Anılar dışa aktarılamadı.');
    } finally {
      setExporting(false);
    }
  }

  async function handleSignOut() {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Çıkış yapmak istediğinden emin misin?')
      : true;

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

  const isParent = profile?.role !== 'child';

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
          <Text style={styles.profileRole}>{isParent ? 'Ebeveyn' : 'Yasemin'}</Text>
        </View>
      </View>

      {isParent ? (
        <>
          {/* Yasemin erişimi */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yasemin'in Erişimi</Text>
              {updating && <ActivityIndicator size="small" color={COLORS.gold} />}
            </View>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.cardText}>Giriş İzni</Text>
                  <Text style={styles.cardHint}>Yasemin özel koduyla giriş yapabilsin.</Text>
                </View>
                <Switch
                  value={familyData?.childAccessEnabled ?? false}
                  onValueChange={(val) => updateFamilySetting('childAccessEnabled', val)}
                  trackColor={{ false: COLORS.border, true: COLORS.goldLight }}
                  thumbColor={(familyData?.childAccessEnabled) ? COLORS.gold : COLORS.creamDark}
                  disabled={loadingFamily || updating}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border + '40' }]}>
                <View style={styles.settingInfo}>
                  <Text style={styles.cardText}>Görüntüleme Yaşı</Text>
                  <Text style={styles.cardHint}>Anıları görmeye başlayabileceği yaş.</Text>
                </View>
                <TextInput
                  style={styles.ageInput}
                  value={String(familyData?.childMinAge ?? 0)}
                  onChangeText={(val) => updateFamilySetting('childMinAge', parseInt(val || '0', 10))}
                  keyboardType="number-pad"
                  maxLength={2}
                  disabled={loadingFamily || updating}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Veri</Text>
            <TouchableOpacity
              style={[styles.card, exporting && { opacity: 0.7 }]}
              onPress={handleExport}
              disabled={exporting}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.cardText}>Tüm Anıları Dışa Aktar</Text>
                  <Text style={styles.cardHint}>
                    JSON formatında anıları indir.
                  </Text>
                </View>
                {exporting && <ActivityIndicator size="small" color={COLORS.gold} />}
              </View>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.childModeInfo}>
          <Text style={styles.childModeEmoji}>🧸</Text>
          <Text style={styles.childModeTitle}>Yasemin Modu</Text>
          <Text style={styles.childModeText}>
            Bu modda sadece ailenin senin için açtığı anıları görebilirsin. 
            Ayarları değiştirmek için ebeveyn girişine dönmelisin.
          </Text>
        </View>
      )}

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.uiBold,
    color: COLORS.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    paddingRight: SPACING.md,
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
  ageInput: {
    width: 50,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    textAlign: 'center',
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  childModeInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  childModeEmoji: {
    fontSize: 64,
  },
  childModeTitle: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    textAlign: 'center',
  },
  childModeText: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
    textAlign: 'center',
    lineHeight: 24,
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

