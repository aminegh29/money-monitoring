import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { CURRENCIES } from '@/api/models';
import { useAuth } from '@/auth/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { StrengthMeter } from '@/components/StrengthMeter';
import { useToast } from '@/components/Toast';
import { Button, Chip, Input, Notice, Row, Toggle, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const toast = useToast();
  const { colors } = useTheme();
  const { lang } = useI18n();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currency, setCurrency] = useState('MAD');
  const [terms, setTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const errors = {
    fullName: !fullName.trim() ? t('auth.nameRequired') : '',
    email: !/^\S+@\S+\.\S+$/.test(email.trim()) ? t('auth.validEmail') : '',
    password: password.length < 8 ? t('auth.passwordMin') : '',
    confirm: !confirm ? t('auth.confirmRequired') : password !== confirm ? t('auth.mismatch') : '',
    terms: !terms ? t('auth.acceptTerms') : '',
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : '');

  const submit = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || loading) return;
    setLoading(true);
    setError('');
    try {
      // The language picked on the sign-in screens becomes the account language.
      await register({ fullName: fullName.trim(), email: email.trim(), password, currency, language: lang });
      toast.success(t('auth.welcomeToast'), t('auth.welcomeToastMsg'));
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.createTitle')} subtitle={t('auth.createSubtitle')}>
      {error ? <View style={{ marginBottom: 12 }}><Notice tone="danger" text={error} /></View> : null}
      <Input label={t('common.fullName')} value={fullName} onChangeText={setFullName} placeholder={t('auth.yourName')} autoComplete="name" maxLength={100} error={show('fullName')} />
      <Input
        label={t('common.email')}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={show('email')}
      />
      <Input
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.minChars')}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        error={show('password')}
      />
      <StrengthMeter password={password} />
      <Input
        label={t('common.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        error={show('confirm')}
      />

      <Txt variant="label" style={{ marginBottom: 8 }}>{t('common.currency')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
        {CURRENCIES.map((c) => (
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </View>

      <Toggle label={t('auth.terms')} value={terms} onChange={setTerms} />
      {show('terms') ? <Txt variant="small" color={colors.danger} style={{ marginTop: -8, marginBottom: 12 }}>{errors.terms}</Txt> : null}

      <Button title={t('auth.createBtn')} size="lg" onPress={submit} loading={loading} />

      <Row style={{ justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }} gap={4}>
        <Txt variant="muted">{t('auth.haveAccount')}</Txt>
        <Link href="/login">
          <Text style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: 14 }}>{t('auth.signIn')}</Text>
        </Link>
      </Row>
    </AuthShell>
  );
}
