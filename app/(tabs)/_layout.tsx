import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

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
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarActiveTintColor: COLORS.ink,
        tabBarInactiveTintColor: COLORS.inkLight,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        headerStyle: { backgroundColor: COLORS.cream },
        headerTintColor: COLORS.ink,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Anilar',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✉️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Yaz',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🖊️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="milestones"
        options={{
          title: 'Adimlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌟" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.cream,
    borderTopColor: COLORS.border,
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
