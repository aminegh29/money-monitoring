import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert, DevSettings } from 'react-native';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { applyDirection, LangCode, t, useI18n } from './index';

/**
 * Switches the app language: UI texts at once, the account setting on the server (so the AI and the
 * web app follow), and the layout direction for Arabic (needs a restart).
 */
export function useChangeLanguage() {
  const { setLang } = useI18n();
  const { token, setUser } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    (code: LangCode) => {
      setLang(code);
      // AI texts are generated per language.
      queryClient.removeQueries({ queryKey: ['advice'] });
      if (token) {
        api.setLanguage(code).then(setUser).catch(() => {});
      }
      if (applyDirection(code)) {
        Alert.alert(t('profile.restartTitle'), t('profile.restartMsg'), [
          { text: t('profile.later'), style: 'cancel' },
          { text: t('profile.restart'), onPress: () => DevSettings.reload() },
        ]);
      }
    },
    [setLang, queryClient, token, setUser],
  );
}
