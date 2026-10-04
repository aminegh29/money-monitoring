import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { CURRENCIES } from '@/api/models';
import { useAuth } from '@/auth/AuthContext';
import { LanguagePicker } from '@/components/LanguagePicker';
import { StrengthMeter } from '@/components/StrengthMeter';
import { useToast } from '@/components/Toast';
import { Badge, Button, Card, Chip, confirm, Input, Row, Screen, Toggle, Txt } from '@/components/ui';
import { t, useI18n } from '@/i18n';
import { useTheme } from '@/theme/theme';
import { formatDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const { name: theme, toggle, colors } = useTheme();
  const { lang } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'MAD');
  const [monthlyIncome, setMonthlyIncome] = useState(String(user?.monthlyIncome ?? 0));
  const [savingsGoal, setSavingsGoal] = useState(String(user?.savingsGoal ?? 0));
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications ?? true);
  const [saving, setSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const num = (s: string) => Number(s.replace(',', '.'));
  const profileValid = !!fullName.trim() && num(monthlyIncome) >= 0 && num(savingsGoal) >= 0;
  const mismatch = !!confirmPassword && confirmPassword !== newPassword;
  const passwordValid = !!currentPassword && newPassword.length >= 8 && newPassword === confirmPassword;

  const saveProfile = async () => {
    if (!profileValid || saving) return;
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        fullName: fullName.trim(),
        currency,
        monthlyIncome: num(monthlyIncome),
        savingsGoal: num(savingsGoal),
        language: lang,
        emailNotifications,
      });
      setUser(updated);
      haptics.success();
      toast.success(t('profile.saved'));
      for (const key of ['dashboard', 'goals']) queryClient.invalidateQueries({ queryKey: [key] });
      queryClient.invalidateQueries({ queryKey: ['advice', 'savings'] });
    } catch (err) {
      toast.error(t('profile.saveError'), errorMessage(err));
    }
    setSaving(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword);
      toast.success(t('profile.deleted'));
      logout();
    } catch (err) {
      toast.error(t('common.couldNotDelete'), errorMessage(err));
      setDeleting(false);
    }
  };

  const changePassword = async () => {
    if (!passwordValid || changing) return;
    setChanging(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      haptics.success();
      toast.success(t('profile.passwordChanged'));
    } catch (err) {
      toast.error(t('profile.passwordError'), errorMessage(err));
    }
    setChanging(false);
  };

  return (
    <Screen edges={[]}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h3" numberOfLines={1}>{user?.fullName}</Txt>
            <Txt variant="small" numberOfLines={1}>{user?.email}</Txt>
          </View>
          <Badge label={user?.role === 'ADMIN' ? t('profile.adminBadge') : t('profile.member')} tone="primary" />
        </Row>
        {user?.createdAt ? (
          <Txt variant="dim" style={{ marginTop: 8 }}>{t('profile.memberSince', { date: formatDate(user.createdAt.slice(0, 10)) })}</Txt>
        ) : null}
      </Card>

      <Card>
        <Txt variant="h3" style={{ marginBottom: 6 }}>🌐 {t('common.language')}</Txt>
        <Txt variant="small" style={{ marginBottom: 12 }}>{t('profile.languageHint')}</Txt>
        <LanguagePicker />
      </Card>

      <Card>
        <Txt variant="h3" style={{ marginBottom: 14 }}>{t('profile.details')}</Txt>
        <Input label={t('common.fullName')} value={fullName} onChangeText={setFullName} maxLength={100} />
        <Txt variant="label" style={{ marginBottom: 8 }}>{t('common.currency')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {CURRENCIES.map((c) => (
            <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </View>
        <Input label={t('profile.expectedIncome', { cur: currency })} value={monthlyIncome} onChangeText={setMonthlyIncome} keyboardType="decimal-pad" />
        <Input label={t('profile.savingsGoal', { cur: currency })} value={savingsGoal} onChangeText={setSavingsGoal} keyboardType="decimal-pad" />
        <Toggle label={`${t('profile.emailNotifs')}: ${t('profile.emailNotifsHint', { email: user?.email ?? '' })}`} value={emailNotifications} onChange={setEmailNotifications} />
        <Button title={t('profile.saveProfile')} onPress={saveProfile} loading={saving} disabled={!profileValid} />
      </Card>

      <Card>
        <Txt variant="h3" style={{ marginBottom: 14 }}>{t('profile.changePassword')}</Txt>
        <Input label={t('profile.current')} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" textContentType="password" />
        <Input
          label={t('auth.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder={t('auth.minChars')}
          textContentType="newPassword"
        />
        <StrengthMeter password={newPassword} />
        <Input
          label={t('profile.confirmNew')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          error={mismatch && t('auth.mismatch')}
        />
        <Button title={t('auth.updatePassword')} variant="ghost" onPress={changePassword} loading={changing} disabled={!passwordValid} />
      </Card>

      <Card>
        <Txt variant="h3" style={{ marginBottom: 12 }}>{t('profile.appearance')}</Txt>
        <Button title={theme === 'dark' ? t('profile.toLight') : t('profile.toDark')} icon={theme === 'dark' ? '☀️' : '🌙'} variant="ghost" onPress={toggle} />
      </Card>

      <Button
        title={t('common.signOut')}
        icon="⎋"
        variant="ghost"
        onPress={() => confirm(t('common.signOutTitle'), t('common.signOutMsg'), () => logout(), t('common.signOut'))}
      />

      {user?.role !== 'ADMIN' ? (
        <Card style={{ borderColor: colors.danger }}>
          <Txt variant="h3" color={colors.danger} style={{ marginBottom: 6 }}>{t('profile.dangerZone')}</Txt>
          <Txt variant="small" style={{ marginBottom: 12 }}>{t('profile.deleteAccountHint')}</Txt>
          <Input
            label={t('profile.current')}
            value={deletePassword}
            onChangeText={setDeletePassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
          />
          <Button
            title={t('profile.deleteAccount')}
            variant="danger"
            loading={deleting}
            disabled={!deletePassword}
            onPress={() => confirm(t('profile.deleteConfirmTitle'), t('profile.deleteConfirmMsg'), deleteAccount, t('profile.deleteAccount'))}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
