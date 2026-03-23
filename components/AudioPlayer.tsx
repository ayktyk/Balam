import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

type AudioPlayerProps = {
  uri: string;
  compact?: boolean;
  durationMillis?: number | null;
};

function formatDuration(durationMillis?: number | null) {
  if (!durationMillis || durationMillis < 1) {
    return '0:00';
  }

  const totalSeconds = Math.floor(durationMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

export function AudioPlayer({
  uri,
  compact = false,
  durationMillis,
}: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<AVPlaybackStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unloadSound() {
    const currentSound = soundRef.current;

    if (!currentSound) {
      return;
    }

    soundRef.current = null;

    try {
      await currentSound.unloadAsync();
    } catch {
      // Bilesen kapanirken best-effort unload yeterli.
    }
  }

  useEffect(() => {
    return () => {
      void unloadSound();
    };
  }, []);

  useEffect(() => {
    setPlaybackStatus(null);
    setError(null);
    void unloadSound();
  }, [uri]);

  async function handleTogglePlayback() {
    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (!soundRef.current) {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        const { sound, status } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 250,
          },
          (nextStatus) => {
            setPlaybackStatus(nextStatus);
          }
        );

        soundRef.current = sound;
        setPlaybackStatus(status);
        return;
      }

      const currentStatus = await soundRef.current.getStatusAsync();

      if (!currentStatus.isLoaded) {
        await unloadSound();
        setPlaybackStatus(currentStatus);
        return;
      }

      if (currentStatus.isPlaying) {
        const pausedStatus = await soundRef.current.pauseAsync();
        setPlaybackStatus(pausedStatus);
        return;
      }

      if (currentStatus.didJustFinish) {
        await soundRef.current.setPositionAsync(0);
      }

      const playingStatus = await soundRef.current.playAsync();
      setPlaybackStatus(playingStatus);
    } catch (playbackError) {
      if (__DEV__) {
        const message =
          playbackError instanceof Error
            ? playbackError.message
            : 'Bilinmeyen hata';
        // eslint-disable-next-line no-console
        console.log('Ses oynatma hatasi:', message);
      }

      setError('Ses oynatilamadi.');
      await unloadSound();
      setPlaybackStatus(null);
    } finally {
      setLoading(false);
    }
  }

  const isLoaded = playbackStatus?.isLoaded === true;
  const isPlaying = isLoaded ? playbackStatus.isPlaying : false;
  const positionMillis = isLoaded ? playbackStatus.positionMillis ?? 0 : 0;
  const resolvedDurationMillis = isLoaded
    ? playbackStatus.durationMillis ?? durationMillis ?? 0
    : durationMillis ?? 0;
  const progress =
    resolvedDurationMillis > 0
      ? Math.min(positionMillis / resolvedDurationMillis, 1)
      : 0;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.button, compact && styles.buttonCompact]}
          onPress={handleTogglePlayback}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.warmWhite} />
          ) : (
            <Text style={styles.buttonText}>
              {isPlaying ? 'Duraklat' : positionMillis > 0 ? 'Devam et' : 'Oynat'}
            </Text>
          )}
        </Pressable>

        <View style={styles.meta}>
          <Text style={[styles.title, compact && styles.titleCompact]}>
            {isPlaying ? 'Ses oynatiliyor' : 'Sesli mesaj'}
          </Text>
          <Text style={[styles.duration, compact && styles.durationCompact]}>
            {formatDuration(positionMillis)} / {formatDuration(resolvedDurationMillis)}
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.progress,
            {
              width: `${Math.max(progress * 100, progress > 0 ? 6 : 0)}%`,
            },
          ]}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  containerCompact: {
    padding: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  button: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  buttonCompact: {
    minWidth: 76,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
  },
  buttonText: {
    color: COLORS.warmWhite,
    fontSize: 13,
    fontFamily: FONTS.uiBold,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: COLORS.ink,
    fontSize: 14,
    fontFamily: FONTS.uiBold,
  },
  titleCompact: {
    fontSize: 13,
  },
  duration: {
    color: COLORS.inkLight,
    fontSize: 12,
    fontFamily: FONTS.ui,
  },
  durationCompact: {
    fontSize: 11,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.creamDark,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontFamily: FONTS.uiMedium,
  },
});
