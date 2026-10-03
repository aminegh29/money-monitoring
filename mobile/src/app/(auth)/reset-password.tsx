import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { AuthShell } from '@/components/AuthShell';
import { StrengthMeter } from '@/components/StrengthMeter';
import { Button, Input, Notice } from '@/components/ui';
import { t, useI18n } from '@/i18n';

/** Reset emails link to the web app, so on the phone the token from that link is pasted in here. */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  useI18n();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cleanToken = token.trim().replace(/^.*token=/, '');
  const mismatch = !!confirm && confirm !== password;
  const valid = !!cleanToken && password.length >= 8 && confirm === password;

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    try {
      const { valid: tokenValid } = await api.validateResetToken(cleanToken);
      if (!tokenValid) {
        setError(t('auth.invalidToken'));
        setLoading(false);
        return;
      }
      await api.resetPassword(cleanToken, password);
      router.replace({ pathname: '/login', params: { reason: 'reset' } });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}
      <Input label={t('auth.tokenLabel')} value={token} onChangeText={setToken} placeholder={t('auth.pasteHere')} autoCapitalize="none" autoCorrect={false} />
      <Input
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.minChars')}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
      />
      <StrengthMeter password={password} />
      <Input
        label={t('common.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        error={mismatch && t('auth.mismatch')}
      />
      <Button title={t('auth.updatePassword')} size="lg" onPress={submit} loading={loading} disabled={!valid} />
    </AuthShell>
  );
}
