import { Link, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ApiError, errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { Button, Input, Notice, Row, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';

export default function LoginScreen() {
  const { login, logoutReason, clearLogoutReason } = useAuth();
  const { reason: paramReason } = useLocalSearchParams<{ reason?: string }>();
  const { colors } = useTheme();
  useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const reason = logoutReason ?? paramReason;
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length > 0;

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    clearLogoutReason();
    try {
      await login(email.trim(), password);
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        // Right password, email not confirmed yet: a fresh code was just emailed.
        router.push({ pathname: '/verify-email', params: { email: email.trim(), notice: 'notVerified' } });
        return;
      }
      setError(errorMessage(err, t('errors.invalidLogin')));
    }
  };

  return (
    <AuthShell title={t('auth.welcomeBack')} subtitle={t('auth.signInSubtitle')}>
      <View style={{ gap: 10, marginBottom: 6 }}>
        {reason === 'expired' && <Notice tone="info" text={t('auth.expired')} />}
        {reason === 'disabled' && <Notice tone="warning" text={t('auth.disabled')} />}
        {reason === 'reset' && <Notice tone="success" text={t('auth.resetDone')} />}
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
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Input
        ref={passwordRef}
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        right={
          <Pressable onPress={() => setShow(!show)} hitSlop={8}>
            <Text style={{ fontSize: 17 }}>{show ? '🙈' : '👁️'}</Text>
          </Pressable>
        }
      />
      <Link href="/forgot-password" style={{ alignSelf: 'flex-end', marginTop: -6, marginBottom: 18 }}>
        <Text style={{ color: colors.primaryText, fontFamily: fonts.medium, fontSize: 13 }}>{t('auth.forgot')}</Text>
      </Link>

      <Button title={t('auth.signIn')} size="lg" onPress={submit} loading={loading} disabled={!valid} />

      <Row style={{ justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }} gap={4}>
        <Txt variant="muted">{t('auth.noAccount')}</Txt>
        <Link href="/register">
          <Text style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: 14 }}>{t('auth.createFree')}</Text>
        </Link>
      </Row>

    </AuthShell>
  );
}
