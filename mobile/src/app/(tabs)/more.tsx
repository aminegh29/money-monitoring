import { useQuery } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { I18nManager, Pressable, Text, View } from 'react-native';
import { api } from '@/api/endpoints';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/AuthShell';
import { Badge, Button, Card, confirm, Row, Screen, Txt } from '@/components/ui';
import { serverUrl } from '@/config/server';
import { LANGUAGES, t, useI18n } from '@/i18n';
import { useRealtime } from '@/realtime/RealtimeProvider';
import { fonts, useTheme } from '@/theme/theme';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { colors, name, toggle } = useTheme();
  const { lang } = useI18n();
  const { connected } = useRealtime();
  const { data: unread = 0 } = useQuery({ queryKey: qk.unread, queryFn: api.unreadCount });
  const language = LANGUAGES.find((l) => l.code === lang);

  const links: { href: Href; icon: string; title: string; subtitle: string; badge?: number }[] = [
    { href: '/goals', icon: '🎯', title: t('goals.title'), subtitle: t('more.goals') },
    { href: '/income', icon: '💰', title: t('income.title'), subtitle: t('more.income') },
    { href: '/budgets', icon: '📊', title: t('budgets.title'), subtitle: t('more.budgets') },
    { href: '/categories', icon: '🏷️', title: t('categories.title'), subtitle: t('more.categories') },
    { href: '/reports', icon: '📄', title: t('reports.title'), subtitle: t('more.reports') },
    { href: '/notifications', icon: '🔔', title: t('notifications.title'), subtitle: t('more.notifications'), badge: unread },
    { href: '/profile', icon: '👤', title: t('profile.title'), subtitle: t('more.profile') },
  ];

  return (
    <Screen>
      <Card>
        <Row gap={12}>
          <Logo size={46} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3" numberOfLines={1}>{user?.fullName}</Txt>
            <Txt variant="small" numberOfLines={1}>{user?.email}</Txt>
          </View>
          <Badge label={connected ? t('common.live') : t('common.offline')} tone={connected ? 'success' : 'neutral'} />
        </Row>
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        {links.map((l, i) => (
          <Pressable
            key={l.title}
            onPress={() => router.push(l.href)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              borderTopWidth: i ? 1 : 0,
              borderColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 22 }}>{l.icon}</Text>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: fonts.semibold }}>{l.title}</Txt>
              <Txt variant="small">{l.subtitle}</Txt>
            </View>
            {l.badge ? <Badge label={String(l.badge)} tone="danger" /> : null}
            <Text style={{ color: colors.textDim, fontSize: 20 }}>{I18nManager.isRTL ? '‹' : '›'}</Text>
          </Pressable>
        ))}
      </Card>

      <Button title={`${t('common.language')}: ${language?.flag} ${language?.name}`} icon="🌐" variant="ghost" onPress={() => router.push('/language')} />
      <Button title={name === 'dark' ? t('profile.toLight') : t('profile.toDark')} icon={name === 'dark' ? '☀️' : '🌙'} variant="ghost" onPress={toggle} />
      <Button
        title={t('common.signOut')}
        icon="⎋"
        variant="ghost"
        onPress={() => confirm(t('common.signOutTitle'), t('common.signOutMsg'), () => logout(), t('common.signOut'))}
      />
      <Txt variant="dim" style={{ textAlign: 'center' }}>{t('more.connectedTo', { url: serverUrl() })}</Txt>
    </Screen>
  );
}
