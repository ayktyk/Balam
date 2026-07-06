import { useEffect, useState } from 'react';
import { Alert, ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform, Switch, TextInput, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { createBackupZip, BackupProgress } from '../../lib/backup';
import { SPACING, RADIUS, SHADOWS, FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { THEMES } from '../../constants/themes';
import type { ThemeId } from '../../constants/themes';

const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export default function SettingsScreen() {
  const { profile, user } = useAuth();
  const { colors, themeId, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [familyData, setFamilyData] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);

  useEffect(() => {
    async function fetchFamily() {
      if (!profile?.familyId) return;
      setLoadingFamily(true);
      try {
        const docSnap = await getDoc(doc(db, 'families', profile.familyId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Eski ailelerde childAccessCode alanı yok — varsayılanı yaz
          if (!data.childAccessCode && profile?.familyId) {
            await updateDoc(doc(db, 'families', profile.familyId), { childAccessCode: '2026' });
            data.childAccessCode = '2026';
          }
          setFamilyData(data);
        }
      } catch (error) {
        console.error('Aile verisi yüklenemedi:', error);
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
      Alert.alert('Hata', 'Ayarlar güncellenemedi.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleFullBackup() {
    if (!profile?.familyId || !user) return;

    if (Platform.OS !== 'web') {
      Alert.alert('Bilgi', 'Tam yedek şimdilik web sürümünde (tarayıcı / ana ekran uygulaması) alınabiliyor.');
      return;
    }

    setExporting(true);
    setBackupProgress(null);
    try {
      const { blob, fileName, failedFiles } = await createBackupZip({
        familyId: profile.familyId,
        familyName: familyData?.name || 'Balam Ailesi',
        currentUid: user.uid,
        onProgress: setBackupProgress,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // WebKit/iOS indirmeyi geç başlatabilir — URL'i hemen değil, 60 sn sonra iptal et
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      // Hatırlatma için son yedek bilgisini aile kaydına yaz (yalnız bu 2 alan).
      // await yok — indirme zaten başarılı; çevrimdışında yazma kuyruğa girer,
      // başarı mesajı bu defter kaydının sonucuna bağlı kalmaz.
      const now = Timestamp.now();
      updateDoc(doc(db, 'families', profile.familyId), {
        lastBackupAt: now,
        lastBackupBy: profile.displayName ?? '',
      }).catch((e) => {
        if (__DEV__) console.log('lastBackupAt yazılamadı:', e);
      });
      setFamilyData((prev: any) => ({ ...prev, lastBackupAt: now, lastBackupBy: profile.displayName ?? '' }));

      window.alert(
        failedFiles.length > 0
          ? `Yedek indirildi ama ${failedFiles.length} medya dosyası inemedi — ayrıntı ZIP içindeki eksik-dosyalar.txt dosyasında. Yedeği tekrar almayı dene.`
          : 'Tam yedek indirildi. Dosyayı bilgisayarına veya harici bir diske de kopyalamayı unutma.'
      );
    } catch (error) {
      if (__DEV__) console.log('Yedek hatası:', error);
      window.alert('Yedek alınamadı. İnternet bağlantını kontrol edip tekrar dene.');
    } finally {
      setExporting(false);
      setBackupProgress(null);
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

  const lastBackupDate: Date | null = familyData?.lastBackupAt?.toDate?.() ?? null;
  const daysSinceBackup = lastBackupDate
    ? Math.floor((Date.now() - lastBackupDate.getTime()) / 86400000)
    : null;
  // !loadingFamily: aile verisi yüklenirken kart yanıp sönmesin
  const showBackupReminder =
    isParent && !loadingFamily && (daysSinceBackup === null || daysSinceBackup > 30);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.cream }]} contentContainerStyle={styles.contentContainer}>
      {/* Profil karti */}
      <View style={[styles.profileCard, { backgroundColor: colors.creamDark }]}>
        <Text style={styles.profileEmoji}>
          {profile?.avatarEmoji ?? '🌿'}
        </Text>
        <View>
          <Text style={[styles.profileName, { color: colors.ink }]}>
            {profile?.displayName ?? 'Kullanıcı'}
          </Text>
          <Text style={[styles.profileRole, { color: colors.inkLight }]}>{isParent ? 'Ebeveyn' : 'Yasemin'}</Text>
        </View>
      </View>

      {/* Tema secici */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.inkLight }]}>Tema</Text>
        <View style={styles.themeGrid}>
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            const isActive = id === themeId;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.themeCard,
                  { backgroundColor: t.colors.creamDark, borderColor: isActive ? t.colors.gold : t.colors.border },
                  isActive && { borderWidth: 2.5 },
                ]}
                onPress={() => setTheme(id)}
                activeOpacity={0.7}
              >
                <View style={[styles.themePreview, { backgroundColor: t.colors.cream }]}>
                  <View style={[styles.themePreviewDot, { backgroundColor: t.colors.gold }]} />
                  <View style={[styles.themePreviewLine, { backgroundColor: t.colors.ink }]} />
                  <View style={[styles.themePreviewLine, styles.themePreviewLineShort, { backgroundColor: t.colors.inkLight }]} />
                </View>
                <Text style={[styles.themeCardName, { color: t.colors.ink }]}>{t.emoji} {t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isParent ? (
        <>
          {/* Yasemin erisimi */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.inkLight }]}>Yasemin'in Erişimi</Text>
              {updating && <ActivityIndicator size="small" color={colors.gold} />}
            </View>
            <View style={[styles.card, { backgroundColor: colors.creamDark }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.cardText, { color: colors.ink }]}>Giriş İzni</Text>
                  <Text style={[styles.cardHint, { color: colors.inkLight }]}>Yasemin özel koduyla giriş yapabilsin.</Text>
                </View>
                <Switch
                  value={familyData?.childAccessEnabled ?? false}
                  onValueChange={(val) => updateFamilySetting('childAccessEnabled', val)}
                  trackColor={{ false: colors.border, true: colors.goldLight }}
                  thumbColor={(familyData?.childAccessEnabled) ? colors.gold : colors.creamDark}
                  disabled={loadingFamily || updating}
                />
              </View>

              {familyData?.childAccessEnabled && (
                <View style={[styles.settingRow, { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: colors.border + '40' }]}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.cardText, { color: colors.ink }]}>Yasemin'in Giriş Kodu</Text>
                    <Text style={[styles.cardHint, { color: colors.inkLight }]}>Yasemin giriş ekranında bu kodu girer.</Text>
                  </View>
                  <View style={[styles.childCodeBox, { backgroundColor: colors.warmWhite, borderColor: colors.border }]}>
                    <Text style={[styles.childCodeText, { color: colors.ink }]}>{familyData?.childAccessCode ?? '2026'}</Text>
                  </View>
                </View>
              )}

              <View style={[styles.settingRow, { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: colors.border + '40' }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.cardText, { color: colors.ink }]}>Görüntüleme Yaşı</Text>
                  <Text style={[styles.cardHint, { color: colors.inkLight }]}>Anıları görmeye başlayabileceği yaş.</Text>
                </View>
                <TextInput
                  style={[styles.ageInput, { backgroundColor: colors.warmWhite, color: colors.ink, borderColor: colors.border }]}
                  value={String(familyData?.childMinAge ?? 0)}
                  onChangeText={(val) => updateFamilySetting('childMinAge', parseInt(val || '0', 10))}
                  keyboardType="number-pad"
                  maxLength={2}
                  disabled={loadingFamily || updating}
                />
              </View>
            </View>
          </View>

          {profile?.familyId && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.inkLight }]}>Aile Daveti</Text>
              <View style={[styles.card, { backgroundColor: colors.creamDark }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.cardText, { color: colors.ink }]}>Aile Kodu</Text>
                  <Text style={[styles.cardHint, { color: colors.inkLight }]}>
                    Bu kodu eşine gönder. Kayıt olduktan sonra "Mevcut Aileye Katıl" seçeneğinde bu kodu girerek aynı aileye katılabilir.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.codeBox, { backgroundColor: colors.warmWhite, borderColor: colors.border }]}
                  onPress={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(profile.familyId);
                      if (Platform.OS === 'web') {
                        window.alert('Aile kodu kopyalandı!');
                      } else {
                        Alert.alert('Kopyalandı', 'Aile kodu panoya kopyalandı.');
                      }
                    }
                  }}
                >
                  <Text style={[styles.codeText, { color: colors.ink }]}>{profile.familyId}</Text>
                  <Text style={[styles.codeCopyHint, { color: colors.inkLight }]}>Kopyalamak için dokun</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.inkLight }]}>Veri</Text>

            {showBackupReminder && (
              <View style={[styles.card, { backgroundColor: colors.capsuleBg, borderWidth: 1, borderColor: colors.gold, marginBottom: SPACING.md }]}>
                <Text style={[styles.cardText, { color: colors.ink }]}>
                  {daysSinceBackup === null
                    ? 'Henüz hiç tam yedek alınmamış.'
                    : `Son yedek ${daysSinceBackup} gün önce alınmış.`}
                </Text>
                <Text style={[styles.cardHint, { color: colors.inkLight }]}>
                  Anıların güvende kalması için arada bir tam yedek indir.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.creamDark }, exporting && { opacity: 0.7 }]}
              onPress={handleFullBackup}
              disabled={exporting}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.cardText, { color: colors.ink }]}>Tam Yedek İndir (ZIP)</Text>
                  <Text style={[styles.cardHint, { color: colors.inkLight }]}>
                    {exporting && backupProgress
                      ? backupProgress.done === backupProgress.total
                        ? 'Paketleniyor…'
                        : `İndiriliyor: ${backupProgress.done}/${backupProgress.total} dosya`
                      : 'Tüm yazılar + fotoğraflar + sesler tek dosyada. İçindeki album.html çevrimdışı açılır.'}
                  </Text>
                </View>
                {exporting && <ActivityIndicator size="small" color={colors.gold} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.creamDark, marginTop: SPACING.md }]}
              onPress={() => router.push('/trash')}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.cardText, { color: colors.ink }]}>Çöp Kutusu</Text>
                  <Text style={[styles.cardHint, { color: colors.inkLight }]}>
                    Silinen anıları 30 gün içinde geri al.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.inkLight }]}>Hesap ve Kurtarma</Text>
            <View style={[styles.card, { backgroundColor: colors.creamDark }]}>
              <Text style={[styles.cardText, { color: colors.ink }]}>Anıların bulutta güvende</Text>
              <Text style={[styles.cardHint, { color: colors.inkLight, marginTop: SPACING.xs, lineHeight: 20 }]}>
                • Telefon değişince: yeni telefonda uygulama adresini aç, giriş yap — her şey yerinde.{'\n'}
                • Şifreni unutursan: giriş ekranındaki "Şifremi unuttum" bağlantısını kullan.{'\n'}
                • Uygulama telefondan silinirse: hiçbir anı kaybolmaz, veriler bulutta durur.{'\n'}
                • İkinizin de ayrı hesabı var: biri kilitlense diğeri tüm arşive erişir.{'\n'}
                • Yine de arada bir "Tam Yedek İndir" ile kopyayı bilgisayara al.
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.childModeInfo}>
          <Text style={styles.childModeEmoji}>🧸</Text>
          <Text style={[styles.childModeTitle, { color: colors.ink }]}>Yasemin Modu</Text>
          <Text style={[styles.childModeText, { color: colors.inkLight }]}>
            Bu modda sadece ailenin senin için açtığı anıları görebilirsin.
            Ayarları değiştirmek için ebeveyn girişine dönmelisin.
          </Text>
        </View>
      )}

      {/* Cikis */}
      <TouchableOpacity
        style={[styles.signOutButton, { borderColor: colors.danger }, signingOut && { opacity: 0.5 }]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        <Text style={[styles.signOutText, { color: colors.danger }]}>
          {signingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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
  },
  profileRole: {
    fontSize: 13,
    fontFamily: FONTS.ui,
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
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  themeCard: {
    width: '30%' as any,
    flexGrow: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  themePreview: {
    width: '100%',
    height: 40,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    marginBottom: SPACING.xs,
    justifyContent: 'center',
  },
  themePreviewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  themePreviewLine: {
    width: '60%',
    height: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  themePreviewLineShort: {
    width: '40%',
  },
  themeCardName: {
    fontSize: 11,
    fontFamily: FONTS.uiMedium,
    textAlign: 'center',
  },
  card: {
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
  },
  cardHint: {
    fontSize: 13,
    fontFamily: FONTS.ui,
    marginTop: SPACING.xs,
  },
  ageInput: {
    width: 50,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    textAlign: 'center',
    fontFamily: FONTS.uiBold,
    borderWidth: 1,
  },
  childCodeBox: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
  },
  childCodeText: {
    fontSize: 18,
    fontFamily: FONTS.uiBold,
    letterSpacing: 2,
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
    textAlign: 'center',
  },
  childModeText: {
    fontSize: 16,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  codeBox: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 14,
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.5,
  },
  codeCopyHint: {
    fontSize: 11,
    fontFamily: FONTS.ui,
    marginTop: SPACING.xs,
  },
  signOutButton: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: FONTS.uiMedium,
  },
});

