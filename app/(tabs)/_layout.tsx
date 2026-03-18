import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {emoji}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.cream,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.ink,
        tabBarInactiveTintColor: COLORS.inkLight,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: COLORS.cream },
        headerTintColor: COLORS.ink,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Anılar',
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
          title: 'Adımlar',
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
