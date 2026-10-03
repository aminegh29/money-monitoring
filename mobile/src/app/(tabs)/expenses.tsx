import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { shareText } from '@/api/files';
import { Expense, PAYMENT_METHODS } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { MonthPicker } from '@/components/MonthPicker';
import { useToast } from '@/components/Toast';
import {
  Badge, Button, Card, CategoryDot, Chip, confirm, EmptyState, IconButton, Input, Loading, Notice, PageHeader, Row, Screen, Txt,
} from '@/components/ui';
import { catName, t, tList, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { formatDate, formatMoney, Months } from '@/utils/format';

export default function ExpensesScreen() {
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(Months.current());
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // Debounce the search box like the web app.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const categories = useQuery({ queryKey: qk.categories, queryFn: api.categories });
  const expenses = useQuery({
    queryKey: qk.expenses(month, categoryId, search),
    queryFn: () => api.expenses(month, categoryId, search),
    placeholderData: (prev) => prev,
  });

  const list = expenses.data ?? [];
  const total = list.reduce((s, e) => s + e.amount, 0);
  const money = (v: number) => formatMoney(v, currency);

  const edit = (e: Expense) => router.push({ pathname: '/expense-form', params: { expense: JSON.stringify(e) } });

  const remove = (e: Expense) =>
    confirm(t('expenses.deleteTitle'), t('expenses.deleteMsg', { name: e.description }), async () => {
      try {
        await api.deleteExpense(e.id);
        toast.success(t('expenses.deleted'));
        for (const key of ['expenses', 'dashboard', 'budgets', 'goals']) queryClient.invalidateQueries({ queryKey: [key] });
      } catch (err) {
        toast.error(t('common.couldNotDelete'), errorMessage(err));
      }
    });

  const exportCsv = async () => {
    const rows: (string | number)[][] = [tList('expenses.csvHeaders')];
    for (const e of list) rows.push([e.date, e.description, catName(e.category.name), t(`pm.${e.paymentMethod}`), e.amount.toFixed(2), currency]);
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    try {
      await shareText(`expenses-${month}.csv`, '﻿' + csv, 'text/csv', 'public.comma-separated-values-text');
    } catch (err) {
      toast.error(t('expenses.exportError'), errorMessage(err));
    }
  };

  return (
    <Screen onRefresh={() => expenses.refetch()} refreshing={expenses.isRefetching}>
      <PageHeader
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        right={<Button title="CSV" icon="⬇" variant="ghost" size="sm" onPress={exportCsv} disabled={!list.length} />}
      />
      <MonthPicker month={month} onChange={setMonth} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flexShrink: 1 }}>
            <Txt variant="eyebrow">{t('expenses.spentIn', { month: Months.label(month) })}</Txt>
            <Txt variant="h1" color={colors.primaryText} style={{ marginTop: 2 }}>{money(total)}</Txt>
          </View>
          <Badge label={t('common.transactions', { n: list.length })} tone="primary" />
        </Row>
      </Card>

      <Input value={searchDraft} onChangeText={setSearchDraft} placeholder={t('expenses.search')} clearButtonMode="while-editing" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -8, marginHorizontal: -16 }} contentContainerStyle={{ gap: 7, paddingHorizontal: 16 }}>
        <Chip label={t('expenses.allCategories')} selected={categoryId === null} onPress={() => setCategoryId(null)} />
        {(categories.data ?? []).map((c) => (
          <Chip key={c.id} label={catName(c.name)} icon={c.icon} color={c.color} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>

      {expenses.isError ? <Notice tone="danger" text={errorMessage(expenses.error)} /> : null}
      {expenses.isLoading ? (
        <Loading />
      ) : list.length ? (
        <Card style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
          {list.map((e, i) => (
            <Pressable
              key={e.id}
              onPress={() => edit(e)}
              onLongPress={() => remove(e)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 4,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <CategoryDot icon={e.category.icon} color={e.category.color} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold }}>{e.description}</Txt>
                <Txt variant="dim" numberOfLines={1}>
                  {catName(e.category.name)} · {formatDate(e.date)} · {PAYMENT_METHODS.find((m) => m.value === e.paymentMethod)?.icon ?? ''}{' '}
                  {t(`pm.${e.paymentMethod}`)}
                </Txt>
              </View>
              <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 14 }}>{money(e.amount)}</Text>
              <IconButton icon="🗑️" label={t('common.delete')} tone="danger" onPress={() => remove(e)} />
            </Pressable>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            emoji="🧾"
            title={t('expenses.noneFound')}
            text={search || categoryId ? t('expenses.tryFilter') : t('expenses.addFirst')}
            action={<Button title={t('expenses.add')} icon="＋" size="sm" onPress={() => router.push({ pathname: '/expense-form', params: { month } })} />}
          />
        </Card>
      )}
      {list.length ? <Txt variant="dim" style={{ textAlign: 'center' }}>{t('common.tapToEdit')}</Txt> : null}
    </Screen>
  );
}
