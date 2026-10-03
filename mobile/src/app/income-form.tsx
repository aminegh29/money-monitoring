import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Income } from '@/api/models';
import { useAuth } from '@/auth/AuthContext';
import { DateField } from '@/components/DateField';
import { useToast } from '@/components/Toast';
import { Button, Chip, Input, Notice } from '@/components/ui';
import { t, tList, useI18n } from '@/i18n';
import { useTheme } from '@/theme/theme';
import { Months } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useJsonParam } from '@/utils/params';

export default function IncomeFormScreen() {
  const income = useJsonParam<Income>('income');
  const { month } = useLocalSearchParams<{ month?: string }>();
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(income ? String(income.amount) : '');
  const [source, setSource] = useState(income?.source ?? '');
  const [date, setDate] = useState(income?.date ?? Months.defaultDate(month ?? Months.current()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = Number(amount.replace(',', '.'));
  const valid = value > 0 && !!source.trim();

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    const body = { amount: Math.round(value * 100) / 100, source: source.trim(), date };
    try {
      if (income) await api.updateIncome(income.id, body);
      else await api.createIncome(body);
      haptics.success();
      toast.success(income ? t('income.updated') : t('income.added'));
      for (const key of ['incomes', 'dashboard', 'goals']) queryClient.invalidateQueries({ queryKey: [key] });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: income ? t('income.editTitle') : t('income.addTitle') }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}
        <Input label={t('common.amountIn', { cur: currency })} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoFocus={!income} />
        <Input label={t('income.source')} value={source} onChangeText={setSource} placeholder={t('income.sourcePlaceholder')} maxLength={100} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: -4, marginBottom: 16 }}>
          {tList('income.sources').map((s) => (
            <Chip key={s} label={s} selected={source === s} onPress={() => setSource(s)} />
          ))}
        </View>
        <DateField label={t('common.date')} value={date} onChange={setDate} />
        <Button title={t('common.save')} size="lg" onPress={save} loading={saving} disabled={!valid} style={{ marginTop: 10 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
