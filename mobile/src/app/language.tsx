import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { useTheme } from '@/theme/theme';

/** Language choice, reachable from the sign-in screens. Signed-in users also find it in Profile. */
export default function LanguageScreen() {
  const { colors } = useTheme();
  useI18n();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Txt variant="muted">{t('profile.languageHint')}</Txt>
      <LanguagePicker />
      <Button title={t('common.done')} variant="soft" onPress={() => router.back()} />
    </ScrollView>
  );
}
