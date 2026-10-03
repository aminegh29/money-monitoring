import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Income } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { MonthPicker } from '@/components/MonthPicker';
import { useToast } from '@/components/Toast';
import { Button, Card, CategoryDot, confirm, EmptyState, IconButton, Loading, Notice, Row, Screen, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { formatDate, formatMoney, Months } from '@/utils/format';

export default function IncomeScreen() {
  const { user, currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(Months.current());
  const incomes = useQuery({ queryKey: qk.incomes(month), queryFn: () => api.incomes(month) });

  const list = incomes.data ?? [];
  const total = list.reduce((s, i) => s + i.amount, 0);
  const money = (v: number) => formatMoney(v, currency);

  const edit = (i: Income | null) =>
    router.push({ pathname: '/income-form', params: i ? { income: JSON.stringify(i) } : { month } });

  const remove = (i: Income) =>
    confirm(t('income.deleteTitle'), t('income.deleteMsg', { name: i.source }), async () => {
      try {
        await api.deleteIncome(i.id);
        toast.success(t('income.deleted'));
        for (const key of ['incomes', 'dashboard', 'goals']) queryClient.invalidateQueries({ queryKey: [key] });
      } catch (err) {
        toast.error(t('common.couldNotDelete'), errorMessage(err));
      }
    });

  return (
    <Screen edges={[]} onRefresh={() => incomes.refetch()} refreshing={incomes.isRefetching}>
      <Txt variant="muted">{t('income.subtitle')}</Txt>
      <Row>
        <View style={{ flex: 1 }}>
          <MonthPicker month={month} onChange={setMonth} />
        </View>
        <Button title={t('common.add')} icon="＋" size="sm" height={42} onPress={() => edit(null)} />
      </Row>

      <Card>
        <Txt variant="eyebrow">{t('income.total')}</Txt>
        <Txt variant="h1" color={colors.success} style={{ marginTop: 4 }}>{money(total)}</Txt>
        <Txt variant="small">{t('income.entries', { n: list.length, month: Months.label(month) })}</Txt>
      </Card>

      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 6 }}>
        <Txt variant="label">{t('income.tipTitle')}</Txt>
        <Txt variant="muted">{t('income.tip', { amount: money(user?.monthlyIncome ?? 0) })}</Txt>
        <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
          <Text style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: 13 }}>{t('income.editProfile')}</Text>
        </Pressable>
      </Card>

      {incomes.isError ? <Notice tone="danger" text={errorMessage(incomes.error)} /> : null}
      {incomes.isLoading ? (
        <Loading />
      ) : list.length ? (
        <Card style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
          {list.map((i, idx) => (
            <Pressable
              key={i.id}
              onPress={() => edit(i)}
              onLongPress={() => remove(i)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 4,
                borderTopWidth: idx ? 1 : 0,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <CategoryDot icon="💵" color="#10b981" />
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold }}>{i.source}</Txt>
                <Txt variant="dim">{formatDate(i.date)}</Txt>
              </View>
              <Text style={{ color: colors.success, fontFamily: fonts.display, fontSize: 14 }}>+{money(i.amount)}</Text>
              <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => remove(i)} />
            </Pressable>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState emoji="💵" title={t('income.none')} text={t('income.noneHint')} />
        </Card>
      )}
    </Screen>
  );
}
