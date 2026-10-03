import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { defaultServerUrl, isCustomServer, serverUrl, setServerUrl } from '@/config/server';
import { Button, Input, Notice, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { useTheme } from '@/theme/theme';

type Check = { tone: 'success' | 'danger' | 'info'; text: string } | null;

/** Lets the user point the app at the PC running the Spring Boot backend. */
export default function ServerScreen() {
  const { colors } = useTheme();
  useI18n();
  const [value, setValue] = useState(isCustomServer() ? serverUrl() : '');
  const [check, setCheck] = useState<Check>(null);
  const [testing, setTesting] = useState(false);

  const test = async (url: string) => {
    setTesting(true);
    setCheck({ tone: 'info', text: t('server.contacting', { url }) });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      // Any HTTP answer (even 401) proves the backend is reachable.
      const res = await fetch(`${url}/api/ai/status`, { signal: controller.signal });
      setCheck({ tone: 'success', text: t('server.connected', { status: res.status }) });
    } catch {
      setCheck({ tone: 'danger', text: t('server.unreachable', { url }) });
    }
    clearTimeout(timer);
    setTesting(false);
  };

  const save = async () => {
    const url = await setServerUrl(value);
    setValue(isCustomServer() ? url : '');
    await test(url);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Txt variant="muted">{t('server.intro')}</Txt>
      <Txt variant="num" color={colors.primaryText}>{defaultServerUrl()}</Txt>
      <Input
        label={t('server.custom')}
        value={value}
        onChangeText={setValue}
        placeholder={t('server.placeholder')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      {check ? <Notice tone={check.tone} text={check.text} /> : null}
      <Button title={t('server.saveTest')} onPress={save} loading={testing} />
      <Button title={t('server.testCurrent')} variant="ghost" onPress={() => test(serverUrl())} disabled={testing} />
      <View style={{ height: 6 }} />
      <Button title={t('common.done')} variant="soft" onPress={() => router.back()} />
      <Txt variant="small" style={{ marginTop: 10 }}>{t('server.tip')}</Txt>
    </ScrollView>
  );
}
