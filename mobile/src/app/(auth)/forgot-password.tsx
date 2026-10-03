import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { AuthShell } from '@/components/AuthShell';
import { Button, Input, Notice } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    }
    setLoading(false);
  };

  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      <View style={{ gap: 10, marginBottom: 6 }}>
        {sent && <Notice tone="success" text={t('auth.forgotSent')} />}
        {error ? <Notice tone="danger" text={error} /> : null}
      </View>
      <Input
        label={t('common.email')}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Button title={sent ? t('auth.sendAgain') : t('auth.sendLink')} size="lg" onPress={submit} loading={loading} disabled={!valid} />
      <View style={{ height: 12 }} />
      <Button title={t('auth.haveToken')} variant="ghost" onPress={() => router.push('/reset-password')} />
      <Link href="/login" style={{ alignSelf: 'center', marginTop: 20 }}>
        <Text style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: 14 }}>{t('auth.backToSignIn')}</Text>
      </Link>
    </AuthShell>
  );
}
