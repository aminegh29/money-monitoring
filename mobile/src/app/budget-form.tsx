import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Budget } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { Button, Chip, Input, Loading, Notice, Txt } from '@/components/ui';
import { catName, t, useI18n } from '@/i18n';
import { useTheme } from '@/theme/theme';
import { Months } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useJsonParam } from '@/utils/params';

export default function BudgetFormScreen() {
  const budget = useJsonParam<Budget>('budget');
  const { month: monthParam } = useLocalSearchParams<{ month?: string }>();
  const month = budget?.period ?? monthParam ?? Months.current();
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: qk.categories, queryFn: api.categories });

  const [categoryId, setCategoryId] = useState<number | null>(budget?.category?.id ?? null);
  const [limit, setLimit] = useState(budget ? String(budget.limitAmount) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = Number(limit.replace(',', '.'));
  const valid = value >= 1;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.saveBudget({ categoryId, period: month, limitAmount: value });
      haptics.success();
      toast.success(t('budgets.saved'));
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: budget ? t('budgets.editTitle') : t('budgets.new') }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}

        <Txt variant="label" style={{ marginBottom: 8 }}>{t('common.category')}</Txt>
        {categories.isLoading ? (
          <Loading />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18, opacity: budget ? 0.6 : 1 }}>
            {/* The category of an existing budget can't change, like the web form. */}
            <Chip label={t('budgets.overallChip')} icon="🧾" selected={categoryId === null} onPress={() => !budget && setCategoryId(null)} />
            {(categories.data ?? []).map((c) => (
              <Chip
                key={c.id}
                label={catName(c.name)}
                icon={c.icon}
                color={c.color}
                selected={categoryId === c.id}
                onPress={() => !budget && setCategoryId(c.id)}
              />
            ))}
          </View>
        )}

        <Input label={t('budgets.limit', { cur: currency })} value={limit} onChangeText={setLimit} placeholder={t('budgets.limitPlaceholder')} keyboardType="decimal-pad" />
        <Txt variant="small" style={{ marginBottom: 20 }}>{t('budgets.appliesTo', { month: Months.label(month) })}</Txt>
        <Button title={t('budgets.saveBtn')} size="lg" onPress={save} loading={saving} disabled={!valid} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
