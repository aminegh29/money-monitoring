import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { DateField } from '@/components/DateField';
import { useToast } from '@/components/Toast';
import { Button, Input, Notice } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { Months } from '@/utils/format';
import { haptics } from '@/utils/haptics';

/** Records money set aside for a goal. */
export default function DepositFormScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const id = Number(goalId);
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(Months.today());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = Number(amount.replace(',', '.'));
  const valid = value > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      const goal = await api.addDeposit(id, { amount: Math.round(value * 100) / 100, date, note: note.trim() });
      haptics.success();
      toast.success(t('goals.depositAdded'), `${goal.icon} ${goal.name}: ${Math.round(goal.percent)}%`);
      queryClient.setQueryData(qk.goal(id), goal);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: qk.goalPlan(id) });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}
        <Input
          label={t('common.amountIn', { cur: currency })}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          autoFocus
          style={{ fontFamily: fonts.display, fontSize: 30, textAlign: 'center', paddingVertical: 14 }}
        />
        <DateField label={t('common.date')} value={date} onChange={setDate} />
        <Input label={t('goals.note')} value={note} onChangeText={setNote} maxLength={120} />
        <Button title={t('common.save')} size="lg" onPress={save} loading={saving} disabled={!valid} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
