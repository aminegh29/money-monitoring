import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { api } from '@/api/endpoints';
import { qk } from '@/api/queryKeys';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { haptics } from '@/utils/haptics';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 21, opacity: focused ? 1 : 0.55 }}>{icon}</Text>;
}

function AddButton() {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={t('tabs.addExpense')}
      onPress={() => {
        haptics.tap();
        router.push('/expense-form');
      }}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -14,
          shadowColor: colors.violet,
          shadowOpacity: 0.6,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 30, fontFamily: fonts.semibold }}>＋</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  useI18n();
  const { data: unread = 0 } = useQuery({ queryKey: qk.unread, queryFn: api.unreadCount, refetchInterval: 60_000 });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surfaceSolid, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tabs.Screen name="expenses" options={{ title: t('tabs.expenses'), tabBarIcon: ({ focused }) => <TabIcon icon="🧾" focused={focused} /> }} />
      <Tabs.Screen name="add" options={{ title: '', tabBarButton: () => <AddButton /> }} />
      <Tabs.Screen name="advisor" options={{ title: t('tabs.ai'), tabBarIcon: ({ focused }) => <TabIcon icon="✨" focused={focused} /> }} />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ focused }) => <TabIcon icon="☰" focused={focused} />,
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
        }}
      />
    </Tabs>
  );
}
