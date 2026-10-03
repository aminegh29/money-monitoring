import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { serverUrl } from '@/config/server';
import { LANGUAGES, t, useI18n } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme/theme';
import { Txt } from './ui';

export function Logo({ size = 48 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: size * 0.5 }}>◈</Text>
    </LinearGradient>
  );
}

/** Layout shared by the sign-in, register and password screens (like pages/public/auth-layout.component.ts). */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { colors } = useTheme();
  // Re-read the server address when coming back from the Server screen.
  const [server, setServer] = useState(serverUrl());
  const { lang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);
  useFocusEffect(useCallback(() => setServer(serverUrl()), []));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientSoft[1], 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.5 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 28, gap: 6, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <Logo size={40} />
            <Txt variant="h3" style={{ fontSize: 19 }}>Money Monitor</Txt>
          </View>
          <Txt variant="h1">{title}</Txt>
          <Txt variant="muted" style={{ marginBottom: 20 }}>{subtitle}</Txt>
          {children}
          <View style={{ flex: 1 }} />
          <View style={{ marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            <Pressable onPress={() => router.push('/language')} style={[pill, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12 }}>
                {current?.flag} {current?.name}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/server')} style={[pill, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12 }}>
                🛰 {t('auth.server')}: {server}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const pill = {
  flexDirection: 'row' as const,
  gap: 6,
  borderRadius: radius.pill,
  borderWidth: 1,
  paddingVertical: 7,
  paddingHorizontal: 12,
};
