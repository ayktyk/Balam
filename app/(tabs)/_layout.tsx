import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text
        style={[
          styles.iconText,
          focused ? styles.iconTextFocused : styles.iconTextIdle,
        ]}
      >
        {emoji}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isParent = profile?.role !== 'child';

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.cream, borderTopColor: colors.border, paddingBottom: insets.bottom + 8, height: 72 + insets.bottom }],
        tabBarItemStyle: styles.tabBarItem,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkLight,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.ink,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isParent ? 'Anilar' : 'Senin Icin',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={isParent ? "✉️" : "🎁"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Yaz',
          href: isParent ? '/write' : null, // Çocuk modunda gizle
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🖊️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="milestones"
        options={{
          title: 'Adimlar',
          href: isParent ? '/milestones' : null, // Çocuk modunda gizle
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌟" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: isParent ? 'Ayarlar' : 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={isParent ? "⚙️" : "🧸"} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 72,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarItem: {
    paddingTop: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONTS.uiMedium,
    marginTop: -1,
  },
  tabBarIcon: {
    marginBottom: 2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  iconTextFocused: {
    opacity: 1,
    transform: [{ translateY: -0.5 }],
  },
  iconTextIdle: {
    opacity: 0.52,
  },
});
