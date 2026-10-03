import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { GoalProgress } from '@/components/GoalProgress';
import { Button, Card, EmptyState, Loading, Notice, Screen, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';

export default function GoalsScreen() {
  const { currency } = useAuth();
  useI18n();
  const goals = useQuery({ queryKey: qk.goals, queryFn: api.goals });
  const list = goals.data ?? [];
  // Open goals first (soonest deadline first, as sent by the server), reached ones at the end.
  const sorted = [...list.filter((g) => g.status !== 'COMPLETED'), ...list.filter((g) => g.status === 'COMPLETED')];

  return (
    <Screen edges={[]} onRefresh={() => goals.refetch()} refreshing={goals.isRefetching}>
      <Txt variant="muted">{t('goals.subtitle')}</Txt>
      <Button title={t('goals.new')} icon="＋" onPress={() => router.push('/goal-form')} />
      {goals.isError ? <Notice tone="danger" text={errorMessage(goals.error)} /> : null}
      {goals.isLoading ? (
        <Loading />
      ) : sorted.length ? (
        sorted.map((g) => (
          <Card key={g.id}>
            <GoalProgress goal={g} currency={currency} onPress={() => router.push({ pathname: '/goal/[id]', params: { id: String(g.id) } })} />
          </Card>
        ))
      ) : (
        <Card>
          <EmptyState
            emoji="🎯"
            title={t('goals.none')}
            text={t('goals.noneHint')}
            action={<Button title={t('goals.new')} icon="＋" size="sm" onPress={() => router.push('/goal-form')} />}
          />
        </Card>
      )}
    </Screen>
  );
}
