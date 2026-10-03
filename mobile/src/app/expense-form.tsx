import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Expense, PAYMENT_METHODS, PaymentMethod } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { DateField } from '@/components/DateField';
import { useToast } from '@/components/Toast';
import { Button, Chip, confirm, Input, Loading, Notice, Txt } from '@/components/ui';
import { catName, t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { Months } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useJsonParam } from '@/utils/params';

export default function ExpenseFormScreen() {
  const expense = useJsonParam<Expense>('expense');
  const { month } = useLocalSearchParams<{ month?: string }>();
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: qk.categories, queryFn: api.categories });

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(expense?.category.id ?? null);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [date, setDate] = useState(expense?.date ?? Months.defaultDate(month ?? Months.current()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense?.paymentMethod ?? 'CARD');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = Number(amount.replace(',', '.'));
  const errors = {
    amount: !(value > 0) ? t('expenses.amountError') : '',
    categoryId: categoryId === null ? t('expenses.categoryError') : '',
    description: !description.trim() ? t('expenses.descriptionError') : '',
  };

  const invalidate = () => {
    for (const key of ['expenses', 'dashboard', 'budgets', 'goals']) queryClient.invalidateQueries({ queryKey: [key] });
  };

  const submit = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    setError('');
    const body = { amount: Math.round(value * 100) / 100, categoryId: categoryId!, description: description.trim(), date, paymentMethod };
    try {
      const saved = expense ? await api.updateExpense(expense.id, body) : await api.createExpense(body);
      haptics.success();
      toast.success(expense ? t('expenses.updated') : t('expenses.added'), `${saved.category.icon} ${saved.description}`);
      invalidate();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const remove = () =>
    expense &&
    confirm(t('expenses.deleteTitle'), t('expenses.deleteMsg', { name: expense.description }), async () => {
      try {
        await api.deleteExpense(expense.id);
        toast.success(t('expenses.deleted'));
        invalidate();
        router.back();
      } catch (err) {
        toast.error(t('common.couldNotDelete'), errorMessage(err));
      }
    });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: expense ? t('expenses.editTitle') : t('expenses.newTitle') }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}

        <Input
          label={t('common.amountIn', { cur: currency })}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          autoFocus={!expense}
          error={submitted && errors.amount}
          style={{ fontFamily: fonts.display, fontSize: 30, textAlign: 'center', paddingVertical: 14 }}
        />

        <Txt variant="label" style={{ marginBottom: 8 }}>{t('common.category')}</Txt>
        {categories.isLoading ? (
          <Loading />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 6 }}>
            {(categories.data ?? []).map((c) => (
              <Chip key={c.id} label={catName(c.name)} icon={c.icon} color={c.color} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        )}
        {submitted && errors.categoryId ? <Txt variant="small" color={colors.danger}>{errors.categoryId}</Txt> : null}
        <View style={{ height: 12 }} />

        <Input
          label={t('common.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('expenses.descPlaceholder')}
          maxLength={200}
          error={submitted && errors.description}
          returnKeyType="done"
        />

        <DateField label={t('common.date')} value={date} onChange={setDate} />

        <Txt variant="label" style={{ marginBottom: 8 }}>{t('expenses.paymentMethod')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 24 }}>
          {PAYMENT_METHODS.map((m) => (
            <Chip key={m.value} label={t(`pm.${m.value}`)} icon={m.icon} selected={paymentMethod === m.value} onPress={() => setPaymentMethod(m.value)} />
          ))}
        </View>

        <Button title={expense ? t('expenses.saveChanges') : t('expenses.add')} size="lg" onPress={submit} loading={saving} />
        {expense ? <Button title={t('expenses.deleteBtn')} variant="ghost" onPress={remove} style={{ marginTop: 10 }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
