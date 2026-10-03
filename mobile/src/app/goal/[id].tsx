import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Deposit } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { AdviceBody } from '@/components/AdviceBody';
import { Ring } from '@/components/charts';
import { goalTone } from '@/components/GoalProgress';
import { useToast } from '@/components/Toast';
import { Badge, Button, Card, confirm, GradientCard, IconButton, Loading, Notice, Row, Screen, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { formatDate, formatMoney } from '@/utils/format';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ width: '48%', flexGrow: 1, gap: 2 }}>
      <Txt variant="small">{label}</Txt>
      <Txt variant="num" color={color}>{value}</Txt>
    </View>
  );
}

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Number(id);
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');

  const goal = useQuery({ queryKey: qk.goal(goalId), queryFn: () => api.goal(goalId) });
  const deposits = useQuery({ queryKey: qk.deposits(goalId), queryFn: () => api.deposits(goalId) });
  const plan = useQuery({ queryKey: qk.goalPlan(goalId), queryFn: () => api.goalPlan(goalId), staleTime: 5 * 60_000 });

  const g = goal.data;
  const money = (v: number) => formatMoney(v, currency);
  const tone = g ? goalTone(g.status) : 'primary';
  const ringColor = { success: colors.success, primary: undefined, warning: colors.warning, danger: colors.danger }[tone];

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: qk.goalPlan(goalId) });
  };

  const regenerate = async () => {
    setRegenerating(true);
    setRegenError('');
    try {
      queryClient.setQueryData(qk.goalPlan(goalId), await api.goalPlan(goalId, true));
    } catch (err) {
      setRegenError(errorMessage(err));
    }
    setRegenerating(false);
  };

  const removeGoal = () =>
    g &&
    confirm(t('goals.deleteTitle'), t('goals.deleteMsg', { name: g.name }), async () => {
      try {
        await api.deleteGoal(goalId);
        toast.success(t('goals.deleted'));
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        router.back();
      } catch (err) {
        toast.error(t('common.couldNotDelete'), errorMessage(err));
      }
    });

  const removeDeposit = (d: Deposit) =>
    confirm(t('goals.depositDeleteTitle'), t('goals.depositDeleteMsg', { amount: money(d.amount), date: formatDate(d.date) }), async () => {
      try {
        queryClient.setQueryData(qk.goal(goalId), await api.deleteDeposit(goalId, d.id));
        refreshAll();
      } catch (err) {
        toast.error(t('common.couldNotDelete'), errorMessage(err));
      }
    });

  return (
    <Screen
      edges={[]}
      onRefresh={() => Promise.all([goal.refetch(), deposits.refetch(), plan.refetch()])}
      refreshing={goal.isRefetching}
    >
      <Stack.Screen
        options={{
          title: g ? `${g.icon} ${g.name}` : t('goals.title'),
          headerRight: () =>
            g ? (
              <Row gap={0}>
                <IconButton icon="✏️" label={t('common.edit')} onPress={() => router.push({ pathname: '/goal-form', params: { goal: JSON.stringify(g) } })} />
                <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => removeGoal()} />
              </Row>
            ) : null,
        }}
      />
      {goal.isError ? <Notice tone="danger" text={errorMessage(goal.error)} /> : null}
      {!g ? (
        goal.isLoading ? <Loading /> : null
      ) : (
        <>
          <GradientCard style={{ gap: 14 }}>
            <Row gap={16}>
              <Ring value={g.percent} size={112} stroke={11} color={ringColor}>
                <Txt variant="num" style={{ fontSize: 20 }}>{Math.round(g.percent)}%</Txt>
              </Ring>
              <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
                <Badge label={t(`goals.status.${g.status}`)} tone={tone} />
                <Txt variant="h2">{money(g.savedAmount)}</Txt>
                <Txt variant="muted">{t('budgets.of', { amount: money(g.targetAmount) })}</Txt>
                <Txt variant="dim">{t('goals.by', { date: formatDate(g.deadline) })}</Txt>
              </View>
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 10 }}>
              <Stat label={t('goals.remaining')} value={money(g.remaining)} />
              <Stat label={t('goals.monthsLeft', { n: g.monthsLeft })} value={formatDate(g.deadline)} />
              <Stat label={t('goals.required')} value={money(g.requiredPerMonth)} color={colors.primaryText} />
              <Stat
                label={t('goals.average')}
                value={money(g.averageMonthlySavings)}
                color={g.averageMonthlySavings >= g.requiredPerMonth ? colors.success : colors.warning}
              />
              <Stat label={t('goals.projected')} value={money(g.projectedAmount)} />
            </View>
            <Txt variant="small">
              {g.trackingMode === 'MANUAL'
                ? t('goals.trackingManual', { n: g.depositsCount })
                : t('goals.trackingAuto', { date: formatDate(g.startDate) })}
            </Txt>
          </GradientCard>

          <Card glow={colors.violet}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Txt variant="h3">{t('goals.aiPlan')}</Txt>
              <IconButton icon="↻" label={t('common.regenerate')} onPress={regenerate} />
            </Row>
            <AdviceBody
              advice={plan.data}
              loading={plan.isLoading || regenerating}
              error={regenError || (plan.isError ? errorMessage(plan.error) : undefined)}
            />
          </Card>

          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Txt variant="h3">{t('goals.deposits')}</Txt>
              <Button
                title={t('goals.addDeposit')}
                icon="＋"
                size="sm"
                onPress={() => router.push({ pathname: '/deposit-form', params: { goalId: String(goalId) } })}
              />
            </Row>
            {deposits.isLoading ? (
              <Loading />
            ) : deposits.data?.length ? (
              deposits.data.map((d, i) => (
                <Row key={d.id} gap={12} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: fonts.semibold }} color={colors.success}>+{money(d.amount)}</Txt>
                    <Txt variant="dim" numberOfLines={1}>{formatDate(d.date)}{d.note ? ` · ${d.note}` : ''}</Txt>
                  </View>
                  <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => removeDeposit(d)} />
                </Row>
              ))
            ) : (
              <Txt variant="muted">{t('goals.noDeposits')}</Txt>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
