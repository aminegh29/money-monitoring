import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { useToast } from '@/components/Toast';
import { Button, Notice, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme/theme';
import { haptics } from '@/utils/haptics';

const RESEND_SECONDS = 60;

/** Enter the 6-digit code emailed at sign-up (or after signing in with an unconfirmed email). */
export default function VerifyEmailScreen() {
  const { email = '', notice } = useLocalSearchParams<{ email?: string; notice?: string }>();
  const { verifyEmail } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  useI18n();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(notice === 'notVerified' ? t('auth.notVerified') : '');
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async (value = code) => {
    if (value.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      await verifyEmail(email, value);
      haptics.success();
      toast.success(t('auth.verified'), t('auth.welcomeToastMsg'));
      // Signed in: the root layout switches to the app.
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
      setLoading(false);
    }
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) submit(digits);
  };

  const resend = async () => {
    setError('');
    try {
      await api.resendVerification(email);
      setInfo(t('auth.resent'));
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <AuthShell title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email })}>
      <View style={{ gap: 10, marginBottom: 6 }}>
        {info ? <Notice tone="info" text={info} /> : null}
        {error ? <Notice tone="danger" text={error} /> : null}
      </View>

      <Txt variant="label" style={{ marginBottom: 8 }}>{t('auth.codeLabel')}</Txt>
      <TextInput
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        placeholder="••••••"
        placeholderTextColor={colors.textDim}
        selectionColor={colors.primary}
        style={{
          height: 64,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.borderStrong,
          backgroundColor: colors.surface2,
          color: colors.text,
          fontFamily: fonts.display,
          fontSize: 30,
          letterSpacing: 12,
          textAlign: 'center',
          marginBottom: 16,
        }}
      />

      <Button title={t('auth.verifyBtn')} size="lg" onPress={() => submit()} loading={loading} disabled={code.length !== 6} />

      <View style={{ alignItems: 'center', gap: 14, marginTop: 22 }}>
        <Pressable onPress={resend} disabled={wait > 0} hitSlop={8}>
          <Text style={{ color: wait > 0 ? colors.textDim : colors.primaryText, fontFamily: fonts.semibold, fontSize: 14 }}>
            {wait > 0 ? t('auth.resendIn', { s: wait }) : t('auth.resend')}
          </Text>
        </Pressable>
        <Txt variant="small" style={{ textAlign: 'center' }}>{t('auth.spamHint')}</Txt>
        <Pressable onPress={() => router.replace('/register')} hitSlop={8}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13 }}>{t('auth.wrongEmail')}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
