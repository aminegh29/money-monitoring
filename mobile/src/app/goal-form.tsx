import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Goal } from '@/api/models';
import { useAuth } from '@/auth/AuthContext';
import { DateField } from '@/components/DateField';
import { useToast } from '@/components/Toast';
import { Button, Chip, Input, Notice, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { radius, useTheme } from '@/theme/theme';
import { Months } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useJsonParam } from '@/utils/params';

const ICONS = ['🎯', '🛟', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '👶', '🏖️', '🎁', '🏥', '📈', '🛋️', '🐶'];
const QUICK_MONTHS = [3, 6, 10, 12, 24];

export default function GoalFormScreen() {
  const goal = useJsonParam<Goal>('goal');
  const { currency } = useAuth();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(goal?.name ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? ICONS[0]);
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : '');
  const [initial, setInitial] = useState(goal && goal.initialAmount ? String(goal.initialAmount) : '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? Months.addMonths(10));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const num = (s: string) => Number(s.replace(',', '.'));
  const errors = {
    name: !name.trim() ? t('goals.nameError') : '',
    target: !(num(target) > 0) ? t('goals.targetError') : '',
    deadline: deadline <= Months.today() ? t('goals.deadlineError') : '',
  };

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    setError('');
    const body = { name: name.trim(), icon, targetAmount: num(target), initialAmount: initial ? num(initial) : 0, deadline };
    try {
      const saved = goal ? await api.updateGoal(goal.id, body) : await api.createGoal(body);
      haptics.success();
      toast.success(goal ? t('goals.updated') : t('goals.created'), `${saved.icon} ${saved.name}`);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['advice', 'goal', saved.id] });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: goal ? t('goals.editTitle') : t('goals.newTitle') }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}

        <Input
          label={t('goals.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('goals.namePlaceholder')}
          maxLength={80}
          autoFocus={!goal}
          error={submitted && errors.name}
        />

        <Txt variant="label" style={{ marginBottom: 8 }}>{t('goals.icon')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
          {ICONS.map((i) => (
            <Pressable
              key={i}
              onPress={() => {
                haptics.tap();
                setIcon(i);
              }}
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.sm,
                borderWidth: icon === i ? 2 : 1,
                borderColor: icon === i ? colors.primary : colors.border,
                backgroundColor: icon === i ? colors.primarySoft : colors.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20 }}>{i}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label={t('goals.target', { cur: currency })}
          value={target}
          onChangeText={setTarget}
          placeholder="5000"
          keyboardType="decimal-pad"
          error={submitted && errors.target}
        />
        <Input label={t('goals.initial', { cur: currency })} value={initial} onChangeText={setInitial} placeholder="0" keyboardType="decimal-pad" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          {QUICK_MONTHS.map((n) => (
            <Chip key={n} label={t('goals.inMonths', { n })} selected={deadline === Months.addMonths(n)} onPress={() => setDeadline(Months.addMonths(n))} />
          ))}
        </View>
        <DateField label={t('goals.deadline')} value={deadline} onChange={setDeadline} future />
        {submitted && errors.deadline ? <Txt variant="small" color={colors.danger} style={{ marginTop: -8, marginBottom: 12 }}>{errors.deadline}</Txt> : null}

        <Button title={t('common.save')} size="lg" onPress={save} loading={saving} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
