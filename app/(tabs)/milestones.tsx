import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

export default function MilestonesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌟</Text>
      <Text style={styles.title}>Milestone'lar</Text>
      <Text style={styles.subtitle}>
        Faz 2'de fotoğraf desteğiyle birlikte gelecek.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkLight,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
