import { useQuery } from '@tanstack/react-query';
import { router, Tabs } from 'expo-router';
import { Ellipsis, House, Lightbulb, LucideIcon, Plus, Receipt } from 'lucide-react-native';
import { ColorValue, Pressable, View } from 'react-native';
import { api } from '@/api/endpoints';
import { qk } from '@/api/queryKeys';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { haptics } from '@/utils/haptics';

function TabIcon({ Icon, color }: { Icon: LucideIcon; color: ColorValue }) {
  return <Icon size={22} color={String(color)} strokeWidth={1.75} />;
}

function AddButton() {
  const { colors, name } = useTheme();
  return (
    <Pressable
      accessibilityLabel={t('tabs.addExpense')}
      onPress={() => {
        haptics.tap();
        router.push('/expense-form');
      }}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <Plus size={24} strokeWidth={2.25} color={name === 'dark' ? '#06140e' : '#fff'} />
      </View>
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
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <TabIcon Icon={House} color={color} /> }} />
      <Tabs.Screen name="expenses" options={{ title: t('tabs.expenses'), tabBarIcon: ({ color }) => <TabIcon Icon={Receipt} color={color} /> }} />
      <Tabs.Screen name="add" options={{ title: '', tabBarButton: () => <AddButton /> }} />
      <Tabs.Screen name="advisor" options={{ title: t('tabs.ai'), tabBarIcon: ({ color }) => <TabIcon Icon={Lightbulb} color={color} /> }} />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color }) => <TabIcon Icon={Ellipsis} color={color} />,
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
        }}
      />
    </Tabs>
  );
}
