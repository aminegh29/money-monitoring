import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { AppNotification, NotificationType } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, IconButton, Loading, Notice, Row, Screen, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { timeAgo } from '@/utils/format';

const ICONS: Record<NotificationType, string> = { INFO: 'ℹ️', WARNING: '⚠️', SUCCESS: '✅', REPORT: '📄' };

/** Backend links point at web routes ("/app/budgets"); the mobile routes are the same without "/app". */
function mobileRoute(link: string): Href | null {
  const path = link.replace(/^\/app/, '') || '/';
  if (path === '/dashboard') return '/';
  return /^\/(expenses|income|budgets|categories|advisor|reports|notifications|profile|goals)(\?|$)/.test(path) ? (path as Href) : null;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: qk.notifications, queryFn: api.notifications });
  const list = notifications.data ?? [];
  const unread = list.filter((n) => !n.read).length;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.notifications });
    queryClient.invalidateQueries({ queryKey: qk.unread });
  };

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      refresh();
    } catch (err) {
      toast.error(t('common.somethingWrong'), errorMessage(err));
    }
  };

  const open = async (n: AppNotification) => {
    if (!n.read) await run(() => api.markRead(n.id));
    const route = n.link ? mobileRoute(n.link) : null;
    if (route) router.push(route);
  };

  return (
    <Screen edges={[]} onRefresh={() => notifications.refetch()} refreshing={notifications.isRefetching}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="muted">{unread ? t('notifications.unread', { n: unread }) : t('notifications.caughtUp')}</Txt>
        <Button title={t('notifications.markAll')} variant="ghost" size="sm" onPress={() => run(api.markAllRead)} disabled={!unread} />
      </Row>
      {notifications.isError ? <Notice tone="danger" text={errorMessage(notifications.error)} /> : null}
      {notifications.isLoading ? (
        <Loading />
      ) : list.length ? (
        list.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)}>
            <Card
              style={{
                paddingVertical: 12,
                backgroundColor: n.read ? colors.surfaceSolid : colors.primarySoft,
                borderColor: n.read ? colors.border : colors.primary,
              }}
            >
              <Row style={{ alignItems: 'flex-start' }} gap={12}>
                <Txt style={{ fontSize: 20 }}>{ICONS[n.type]}</Txt>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt style={{ fontFamily: n.read ? fonts.medium : fonts.bold }}>{n.title}</Txt>
                  <Txt variant="muted">{n.message}</Txt>
                  <Txt variant="dim">{timeAgo(n.createdAt)}</Txt>
                </View>
                <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => run(() => api.deleteNotification(n.id))} />
              </Row>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <EmptyState emoji="🔔" title={t('notifications.none')} text={t('notifications.noneHint')} />
        </Card>
      )}
    </Screen>
  );
}
