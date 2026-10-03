import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Category } from '@/api/models';
import { useToast } from '@/components/Toast';
import { Button, CategoryDot, Input, Notice, Row, Toggle, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { radius, useTheme } from '@/theme/theme';
import { haptics } from '@/utils/haptics';
import { useJsonParam } from '@/utils/params';

// Same choices as pages/user/categories.component.ts.
const ICONS = ['🏷️', '🐶', '🎮', '⚽', '🎵', '🍷', '☕', '👶', '🚌', '⛽', '🏋️', '💻', '🧴', '🎓', '🏥', '🧾', '💼', '🪴', '🛠️', '🎨'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

export default function CategoryFormScreen() {
  const category = useJsonParam<Category>('category');
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? ICONS[0]);
  const [color, setColor] = useState(category?.color ?? COLORS[0]);
  const [essential, setEssential] = useState(category?.essential ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    const body = { name: name.trim(), icon, color, essential };
    try {
      if (category) await api.updateCategory(category.id, body);
      else await api.createCategory(body);
      haptics.success();
      toast.success(category ? t('categories.updated') : t('categories.created'));
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: category ? t('categories.editTitle') : t('categories.new') }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}

        <Row style={{ justifyContent: 'center', marginBottom: 18 }}>
          <CategoryDot icon={icon} color={color} size={64} />
        </Row>

        <Input label={t('categories.name')} value={name} onChangeText={setName} placeholder={t('categories.namePlaceholder')} maxLength={50} autoFocus={!category} />

        <Txt variant="label" style={{ marginBottom: 8 }}>{t('categories.icon')}</Txt>
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

        <Txt variant="label" style={{ marginBottom: 8 }}>{t('categories.color')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityLabel={` ${c}`}
              onPress={() => {
                haptics.tap();
                setColor(c);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: color === c ? colors.text : colors.surfaceSolid,
              }}
            />
          ))}
        </View>

        <Toggle label={t('categories.essentialToggle')} value={essential} onChange={setEssential} />
        <Button title={t('common.save')} size="lg" onPress={save} loading={saving} disabled={!name.trim()} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
