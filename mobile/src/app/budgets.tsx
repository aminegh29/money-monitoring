import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Budget } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { Ring } from '@/components/charts';
import { MonthPicker } from '@/components/MonthPicker';
import { useToast } from '@/components/Toast';
import {
  Badge, Button, Card, CategoryDot, confirm, EmptyState, GradientCard, IconButton, Loading, Notice, ProgressBar, Row, Screen, Txt,
} from '@/components/ui';
import { catName, t, useI18n } from '@/i18n';
import { budgetColor, fonts, useTheme } from '@/theme/theme';
import { formatMoney, Months } from '@/utils/format';

export default function BudgetsScreen() {
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(Months.current());
  const [copying, setCopying] = useState(false);
  const budgets = useQuery({ queryKey: qk.budgets(month), queryFn: () => api.budgets(month) });

  const list = budgets.data ?? [];
  const overall = list.find((b) => !b.category) ?? null;
  const byCategory = list.filter((b) => !!b.category);
  const money = (v: number) => formatMoney(v, currency);

  const open = (b: Budget | null) =>
    router.push({ pathname: '/budget-form', params: b ? { budget: JSON.stringify(b), month } : { month } });

  const copyPrevious = async () => {
    setCopying(true);
    try {
      const copied = await api.copyBudgets(month);
      queryClient.setQueryData(qk.budgets(month), copied);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.info(copied.length ? t('budgets.copied') : t('budgets.noneLast'));
    } catch (err) {
      toast.error(t('budgets.copyError'), errorMessage(err));
    }
    setCopying(false);
  };

  const remove = (b: Budget) =>
    confirm(
      t('budgets.deleteTitle'),
      t('budgets.deleteMsg', { name: b.category ? catName(b.category.name) : t('budgets.overallName') }),
      async () => {
        try {
          await api.deleteBudget(b.id);
          toast.success(t('budgets.deleted'));
          queryClient.invalidateQueries({ queryKey: ['budgets'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        } catch (err) {
          toast.error(t('common.couldNotDelete'), errorMessage(err));
        }
      },
    );

  const remaining = (b: Budget, key: 'budgets.remaining' | 'budgets.left') => (
    <Txt variant="small" color={b.remaining < 0 ? colors.danger : colors.textMuted} style={{ flexShrink: 1 }}>
      {t(b.remaining < 0 ? 'budgets.overBy' : key, { amount: money(Math.abs(b.remaining)) })}
    </Txt>
  );

  return (
    <Screen edges={[]} onRefresh={() => budgets.refetch()} refreshing={budgets.isRefetching}>
      <Txt variant="muted">{t('budgets.subtitle')}</Txt>
      <MonthPicker month={month} onChange={setMonth} />
      <Row>
        <Button title={t('budgets.copy')} icon="⧉" variant="ghost" size="sm" onPress={copyPrevious} loading={copying} style={{ flex: 1 }} />
        <Button title={t('budgets.new')} icon="＋" size="sm" onPress={() => open(null)} style={{ flex: 1 }} />
      </Row>

      {budgets.isError ? <Notice tone="danger" text={errorMessage(budgets.error)} /> : null}
      {budgets.isLoading ? <Loading /> : null}

      {overall ? (
        <GradientCard style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="small">{t('budgets.overallTitle')}</Txt>
              <Txt variant="h2" style={{ marginTop: 4 }}>{money(overall.spent)}</Txt>
              <Txt variant="muted">{t('budgets.of', { amount: money(overall.limitAmount) })}</Txt>
            </View>
            <Ring value={overall.percent} size={76} stroke={8} color={budgetColor(colors, overall.percent)}>
              <Txt variant="num">{overall.percent}%</Txt>
            </Ring>
          </Row>
          <ProgressBar percent={overall.percent} color={budgetColor(colors, overall.percent)} height={12} />
          <Row style={{ justifyContent: 'space-between' }}>
            {remaining(overall, 'budgets.remaining')}
            <Row gap={0}>
              <IconButton icon="✏️" label={t('common.edit')} onPress={() => open(overall)} />
              <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => remove(overall)} />
            </Row>
          </Row>
        </GradientCard>
      ) : null}

      {byCategory.map((b) => (
        <Card key={b.id} style={{ gap: 10 }} glow={b.percent >= 100 ? colors.danger : undefined}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ flex: 1 }} gap={10}>
              <CategoryDot icon={b.category!.icon} color={b.category!.color} size={34} />
              <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold, flexShrink: 1 }}>{catName(b.category!.name)}</Txt>
            </Row>
            <Badge label={`${b.percent}%`} tone={b.percent >= 100 ? 'danger' : b.percent >= 80 ? 'warning' : 'success'} />
          </Row>
          <Txt>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 17 }}>{money(b.spent)}</Txt>
            <Txt variant="muted"> {t('budgets.of', { amount: money(b.limitAmount) })}</Txt>
          </Txt>
          <ProgressBar percent={b.percent} color={budgetColor(colors, b.percent)} />
          <Row style={{ justifyContent: 'space-between' }}>
            {remaining(b, 'budgets.left')}
            <Row gap={0}>
              <IconButton icon="✏️" label={t('common.edit')} onPress={() => open(b)} />
              <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => remove(b)} />
            </Row>
          </Row>
        </Card>
      ))}

      {!budgets.isLoading && !list.length ? (
        <Card>
          <EmptyState
            emoji="🎯"
            title={t('budgets.none', { month: Months.label(month) })}
            text={t('budgets.noneHint')}
            action={<Button title={t('budgets.create')} size="sm" onPress={() => open(null)} />}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
