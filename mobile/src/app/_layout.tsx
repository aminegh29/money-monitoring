import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { focusManager, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { applyDirection, I18nProvider, isLangCode, t, useI18n } from '@/i18n';
import { RealtimeProvider } from '@/realtime/RealtimeProvider';
import { fonts, ThemeProvider, useTheme } from '@/theme/theme';

// Refetch stale data when the app comes back to the foreground.
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <LanguageSync />
              <RealtimeProvider>
                <ToastProvider>{fontsLoaded ? <RootStack /> : <Splash />}</ToastProvider>
              </RealtimeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

/** The account's language (set here or on the web app) wins once the user is signed in. */
function LanguageSync() {
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const queryClient = useQueryClient();
  const accountLang = user?.language;

  useEffect(() => {
    if (isLangCode(accountLang) && accountLang !== lang) {
      setLang(accountLang);
      applyDirection(accountLang);
      queryClient.removeQueries({ queryKey: ['advice'] });
    }
    // Only react to the account changing, not to local switches (those update the account themselves).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLang]);

  return null;
}

function Splash() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function RootStack() {
  const { ready, token } = useAuth();
  const { colors, name } = useTheme();
  useI18n(); // re-render the screen titles when the language changes

  if (!ready) return <Splash />;

  const signedIn = !!token;
  const form = { presentation: 'modal' as const, headerShown: true };
  const page = (title: string) => ({ headerShown: true, title });

  return (
    <>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primaryText,
          headerTitleStyle: { fontFamily: fonts.display, color: colors.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="income" options={page(t('income.title'))} />
          <Stack.Screen name="budgets" options={page(t('budgets.title'))} />
          <Stack.Screen name="categories" options={page(t('categories.title'))} />
          <Stack.Screen name="reports" options={page(t('reports.title'))} />
          <Stack.Screen name="notifications" options={page(t('notifications.title'))} />
          <Stack.Screen name="profile" options={page(t('profile.title'))} />
          <Stack.Screen name="goals" options={page(t('goals.title'))} />
          <Stack.Screen name="goal/[id]" options={page('')} />
          <Stack.Screen name="expense-form" options={{ ...form, title: t('expenses.newTitle') }} />
          <Stack.Screen name="income-form" options={{ ...form, title: t('income.addTitle') }} />
          <Stack.Screen name="budget-form" options={{ ...form, title: t('budgets.new') }} />
          <Stack.Screen name="category-form" options={{ ...form, title: t('categories.new') }} />
          <Stack.Screen name="goal-form" options={{ ...form, title: t('goals.newTitle') }} />
          <Stack.Screen name="deposit-form" options={{ ...form, title: t('goals.addDeposit') }} />
        </Stack.Protected>

        <Stack.Screen name="server" options={{ ...form, title: t('server.title') }} />
        <Stack.Screen name="language" options={{ ...form, title: t('common.language') }} />
      </Stack>
    </>
  );
}
