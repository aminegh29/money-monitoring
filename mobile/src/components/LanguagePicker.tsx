import { Pressable, Text, View } from 'react-native';
import { LANGUAGES, useI18n } from '@/i18n';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { fonts, radius, useTheme } from '@/theme/theme';
import { haptics } from '@/utils/haptics';

/** The five languages as a selectable list. */
export function LanguagePicker() {
  const { lang } = useI18n();
  const change = useChangeLanguage();
  const { colors } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      {LANGUAGES.map((l) => {
        const selected = l.code === lang;
        return (
          <Pressable
            key={l.code}
            onPress={() => {
              haptics.tap();
              if (!selected) change(l.code);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primarySoft : colors.surface2,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 22 }}>{l.flag}</Text>
            <Text style={{ flex: 1, color: colors.text, fontFamily: selected ? fonts.semibold : fonts.body, fontSize: 15 }}>{l.name}</Text>
            {selected ? <Text style={{ color: colors.primaryText, fontSize: 16, fontFamily: fonts.bold }}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
