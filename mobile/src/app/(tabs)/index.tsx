import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { shareReport } from '@/api/files';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { ComboChart, DonutChart, GroupedBarChart, Ring } from '@/components/charts';
import { GoalProgress } from '@/components/GoalProgress';
import { Markdown } from '@/components/Markdown';
import { MonthPicker } from '@/components/MonthPicker';
import { useToast } from '@/components/Toast';
import {
  Badge, Button, Card, CategoryDot, EmptyState, GradientCard, IconButton, Loading, Notice, ProgressBar, Row, Screen, Txt,
} from '@/components/ui';
import { catName, currentLocale, t, useI18n } from '@/i18n';
import { useRealtime } from '@/realtime/RealtimeProvider';
import { budgetColor, fonts, useTheme } from '@/theme/theme';
import { formatDate, formatMoney, Months } from '@/utils/format';

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flexShrink: 1 }}>
        <Txt variant="h3">{title}</Txt>
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
      {right}
    </Row>
  );
}

export default function DashboardScreen() {
  const { user, currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { lastSync } = useRealtime();
  const [month, setMonth] = useState(Months.current());
  const [downloading, setDownloading] = useState(false);
  const [refreshingInsight, setRefreshingInsight] = useState(false);
  const [seenSync, setSeenSync] = useState(0);

  const dashboard = useQuery({ queryKey: qk.dashboard(month), queryFn: () => api.dashboard(month) });
  const insight = useQuery({ queryKey: qk.monthlyAdvice(month), queryFn: () => api.monthlyAdvice(month), staleTime: 5 * 60_000 });
  const goals = useQuery({ queryKey: qk.goals, queryFn: api.goals });

  // "Synced live" badge for a few seconds after the server pushes a change.
  const pulse = lastSync > seenSync;
  useEffect(() => {
    if (!lastSync) return;
    const timer = setTimeout(() => setSeenSync(lastSync), 2500);
    return () => clearTimeout(timer);
  }, [lastSync]);

  const d = dashboard.data;
  const cur = d?.currency ?? currency;
  const money = (v: number) => formatMoney(v, cur);
  const isCurrentMonth = month === Months.current();
  const firstName = user?.fullName.split(' ')[0] ?? '';
  const h = new Date().getHours();
  const greeting = h < 12 ? t('dashboard.morning') : h < 18 ? t('dashboard.afternoon') : t('dashboard.evening');

  const daily = useMemo(() => {
    const all = d?.daily ?? [];
    const visible = isCurrentMonth ? all.filter((x) => x.date <= Months.today()) : all;
    const line: number[] = [];
    for (const x of visible) line.push((line[line.length - 1] ?? 0) + x.amount);
    return {
      days: visible.map((x) => Number(x.date.slice(8))),
      bars: visible.map((x) => x.amount),
      line,
    };
  }, [d, isCurrentMonth]);

  // First section of the AI advice, shown as a teaser.
  const teaser = useMemo(() => {
    const content = insight.data?.content ?? '';
    return content.split(/\n(?=#{1,4} )/).slice(0, 2).join('\n').slice(0, 700);
  }, [insight.data]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await shareReport('monthly', month);
    } catch (err) {
      toast.error(t('dashboard.reportError'), errorMessage(err));
    }
    setDownloading(false);
  };

  const regenerateInsight = async () => {
    setRefreshingInsight(true);
    try {
      queryClient.setQueryData(qk.monthlyAdvice(month), await api.monthlyAdvice(month, true));
    } catch (err) {
      toast.error(t('dashboard.insightError'), errorMessage(err));
    }
    setRefreshingInsight(false);
  };

  const max = d ? Math.max(d.totalIncome, d.totalExpenses, 1) : 1;
  const goalProgress = d && d.savingsGoal ? Math.max(0, Math.min(100, (d.balance / d.savingsGoal) * 100)) : null;
  const activeGoals = (goals.data ?? []).filter((g) => g.status !== 'COMPLETED').slice(0, 3);

  return (
    <Screen onRefresh={() => Promise.all([dashboard.refetch(), insight.refetch(), goals.refetch()])} refreshing={dashboard.isRefetching}>
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">{new Date().toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h1" style={{ flexShrink: 1 }}>
            {greeting}, <Text style={{ color: colors.primaryText }}>{firstName}</Text>
          </Txt>
          {pulse ? <Badge label={t('dashboard.synced')} tone="success" /> : null}
        </Row>
      </View>
      <Row>
        <View style={{ flex: 1 }}>
          <MonthPicker month={month} onChange={setMonth} />
        </View>
        <Button title="PDF" icon="⤓" variant="ghost" size="sm" onPress={downloadPdf} loading={downloading} height={42} />
      </Row>

      {dashboard.isError && !d ? <Notice tone="danger" text={errorMessage(dashboard.error)} /> : null}
      {!d ? (
        dashboard.isLoading ? <Loading /> : null
      ) : (
        <>
          {/* Hero: net balance, income vs spent, savings ring */}
          <GradientCard>
            <Txt variant="eyebrow">{t('dashboard.netBalance', { month: Months.name(month) })}</Txt>
            <Row style={{ alignItems: 'flex-end', marginTop: 6, marginBottom: 14 }} gap={6}>
              <Txt variant="h1" style={{ fontSize: 34 }} color={d.balance < 0 ? colors.danger : colors.text}>
                {formatMoney(d.balance, '').trim()}
              </Txt>
              <Txt variant="muted" style={{ marginBottom: 6 }}>{cur}</Txt>
            </Row>
            <Row style={{ alignItems: 'center' }} gap={16}>
              <View style={{ flex: 1, gap: 12 }}>
                <View style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="small">{t('dashboard.income')}</Txt>
                    <Txt variant="num" style={{ fontSize: 13 }}>{money(d.totalIncome)}</Txt>
                  </Row>
                  <ProgressBar percent={(d.totalIncome / max) * 100} color={colors.success} />
                </View>
                <View style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="small">{t('dashboard.spent')}</Txt>
                    <Txt variant="num" style={{ fontSize: 13 }}>{money(d.totalExpenses)}</Txt>
                  </Row>
                  <ProgressBar percent={(d.totalExpenses / max) * 100} />
                </View>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Ring value={d.savingsRate < 0 ? 0 : d.savingsRate} size={104} stroke={10}>
                  <Txt variant="num" style={{ fontSize: 19 }}>{d.savingsRate.toFixed(1)}%</Txt>
                  <Txt variant="eyebrow" style={{ fontSize: 9 }}>{t('dashboard.saved')}</Txt>
                </Ring>
                <Txt variant="dim" style={{ fontSize: 11 }}>{t('dashboard.target')}</Txt>
              </View>
            </Row>
            {d.totalIncome === 0 ? (
              <View style={{ marginTop: 12 }}>
                <Link label={t('dashboard.addIncome')} onPress={() => router.push('/income')} />
              </View>
            ) : null}
          </GradientCard>

          {/* Goals */}
          <Card>
            <CardHeader title={`🎯 ${t('dashboard.goals')}`} right={<Link label={t('common.manage')} onPress={() => router.push('/goals')} />} />
            {activeGoals.length ? (
              <View style={{ gap: 16 }}>
                {activeGoals.map((g) => (
                  <GoalProgress key={g.id} goal={g} currency={cur} onPress={() => router.push({ pathname: '/goal/[id]', params: { id: String(g.id) } })} />
                ))}
              </View>
            ) : (
              <EmptyState
                emoji="🎯"
                title={t('dashboard.noGoals')}
                text={t('dashboard.noGoalsHint')}
                action={<Button title={t('dashboard.createGoal')} variant="soft" size="sm" onPress={() => router.push('/goal-form')} />}
              />
            )}
          </Card>

          {/* Pulse */}
          <Card>
            <CardHeader
              title={t('dashboard.pulse')}
              right={<Badge label={isCurrentMonth ? t('dashboard.liveMonth') : t('dashboard.closed')} tone={isCurrentMonth ? 'success' : 'neutral'} />}
            />
            <View style={{ gap: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="muted">{t('dashboard.vsLast')}</Txt>
                {d.previousMonthExpenses > 0 ? (
                  <Txt variant="num" color={d.changePercent > 0 ? colors.danger : colors.success}>
                    {d.changePercent > 0 ? '▲' : '▼'} {Math.abs(d.changePercent)}%
                  </Txt>
                ) : (
                  <Txt variant="num" color={colors.textMuted}>n/a</Txt>
                )}
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="muted">{t('dashboard.dailyAverage')}</Txt>
                <Txt variant="num">{money(d.dailyAverage)}</Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="muted">{isCurrentMonth ? t('dashboard.projected') : t('dashboard.totalSpent')}</Txt>
                <Txt variant="num">{money(d.projectedMonthEnd)}</Txt>
              </Row>
              <View style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="muted">{t('dashboard.savingsGoal')}</Txt>
                  {goalProgress !== null ? (
                    <Txt variant="num" style={{ fontSize: 13 }}>{goalProgress.toFixed(0)}%</Txt>
                  ) : (
                    <Link label={t('dashboard.setGoal')} onPress={() => router.push('/profile')} />
                  )}
                </Row>
                {goalProgress !== null ? (
                  <>
                    <ProgressBar percent={goalProgress} />
                    <Txt variant="dim">{t('common.perMonth', { amount: money(d.savingsGoal) })}</Txt>
                  </>
                ) : null}
              </View>
            </View>
          </Card>

          {/* Cash flow */}
          <Card>
            <CardHeader title={t('dashboard.cashFlow')} subtitle={t('dashboard.last6')} />
            <GroupedBarChart
              labels={d.trend.map((p) => Months.name(p.period, 'short'))}
              series={[
                { label: t('dashboard.incomeLegend'), color: colors.success, values: d.trend.map((p) => p.income) },
                { label: t('dashboard.expensesLegend'), color: colors.violet, values: d.trend.map((p) => p.expenses) },
              ]}
              format={money}
            />
          </Card>

          {/* Where it goes */}
          <Card>
            <CardHeader title={t('dashboard.whereItGoes')} right={<Link label={t('common.details')} onPress={() => router.push('/expenses')} />} />
            {d.byCategory.length ? (
              <>
                <DonutChart slices={d.byCategory.map((c) => ({ value: c.amount, color: c.color }))}>
                  <Txt variant="eyebrow">{t('dashboard.total')}</Txt>
                  <Txt variant="num" style={{ fontSize: 16 }}>{money(d.totalExpenses)}</Txt>
                </DonutChart>
                <View style={{ marginTop: 16, gap: 10 }}>
                  {d.byCategory.slice(0, 5).map((c) => (
                    <Row key={c.categoryId}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                      <Txt style={{ flex: 1 }} numberOfLines={1}>{c.icon} {catName(c.name)}</Txt>
                      <Txt variant="num" color={colors.textMuted} style={{ fontSize: 13 }}>{c.percent}%</Txt>
                    </Row>
                  ))}
                </View>
              </>
            ) : (
              <EmptyState emoji="🌌" title={t('dashboard.noExpenses')} text={t('dashboard.noExpensesHint')} />
            )}
          </Card>

          {/* Spending velocity */}
          <Card>
            <CardHeader title={t('dashboard.velocity')} subtitle={t('common.perDay', { amount: money(d.dailyAverage) })} />
            {d.totalExpenses > 0 ? (
              <ComboChart days={daily.days} bars={daily.bars} line={daily.line} format={money} />
            ) : (
              <EmptyState emoji="📈" title={t('dashboard.noSpending')} text={t('dashboard.noSpendingHint')} />
            )}
          </Card>

          {/* Budgets */}
          <Card>
            <CardHeader title={t('dashboard.budgets')} right={<Link label={t('common.manage')} onPress={() => router.push('/budgets')} />} />
            {d.budgets.length ? (
              <View style={{ gap: 14 }}>
                {d.budgets.slice(0, 5).map((b) => (
                  <View key={b.id} style={{ gap: 6 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt numberOfLines={1} style={{ flexShrink: 1 }}>
                        {b.category ? `${b.category.icon} ${catName(b.category.name)}` : t('dashboard.overall')}
                      </Txt>
                      <Txt variant="num" style={{ fontSize: 13 }} color={budgetColor(colors, b.percent)}>{b.percent}%</Txt>
                    </Row>
                    <ProgressBar percent={b.percent} color={budgetColor(colors, b.percent)} />
                    <Txt variant="dim">{t('dashboard.spentOf', { spent: money(b.spent), limit: money(b.limitAmount) })}</Txt>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                emoji="🎯"
                title={t('dashboard.noBudgets')}
                action={<Button title={t('dashboard.createFirstBudget')} variant="soft" size="sm" onPress={() => router.push('/budgets')} />}
              />
            )}
          </Card>

          {/* Latest activity */}
          <Card>
            <CardHeader title={t('dashboard.latest')} right={<Link label={t('common.viewAll')} onPress={() => router.push('/expenses')} />} />
            {d.recent.length ? (
              <View style={{ gap: 12 }}>
                {d.recent.map((e) => (
                  <Pressable key={e.id} onPress={() => router.push({ pathname: '/expense-form', params: { expense: JSON.stringify(e) } })}>
                    <Row gap={12}>
                      <CategoryDot icon={e.category.icon} color={e.category.color} />
                      <View style={{ flex: 1 }}>
                        <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold }}>{e.description}</Txt>
                        <Txt variant="dim">{catName(e.category.name)} · {formatDate(e.date)}</Txt>
                      </View>
                      <Txt variant="num" style={{ fontSize: 14 }}>−{money(e.amount)}</Txt>
                    </Row>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState emoji="🧾" title={t('dashboard.nothing')} text={t('dashboard.nothingHint')} />
            )}
          </Card>

          {/* AI insight */}
          <Card glow={colors.violet}>
            <CardHeader title={t('dashboard.aiInsight')} right={<IconButton icon="↻" label={t('common.regenerate')} onPress={regenerateInsight} />} />
            {insight.isLoading || refreshingInsight ? (
              <Loading />
            ) : insight.data ? (
              <>
                <Markdown size={13.5}>{teaser}</Markdown>
                <Button title={t('dashboard.openAdvisor')} size="sm" onPress={() => router.push('/advisor')} style={{ marginTop: 8 }} />
              </>
            ) : insight.isError ? (
              <Txt variant="muted">{errorMessage(insight.error)}</Txt>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}
