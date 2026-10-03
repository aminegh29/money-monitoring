import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '@/theme/theme';
import { haptics } from '@/utils/haptics';
import { Months } from '@/utils/format';
import { t } from '@/i18n';

/** ‹ Month Year › selector. Months after the current one are disabled, like the web month picker. */
export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const { colors } = useTheme();
  const atCurrent = month >= Months.current();

  const arrow = (label: string, delta: number, disabled = false) => (
    <Pressable
      hitSlop={8}
      disabled={disabled}
      onPress={() => {
        haptics.tap();
        onChange(Months.shift(month, delta));
      }}
      style={({ pressed }) => [styles.arrow, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}
    >
      <Text style={{ color: colors.text, fontSize: 20, fontFamily: fonts.semibold }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      {arrow(I18nManager.isRTL ? '›' : '‹', -1)}
      <Text style={[styles.label, { color: colors.text }]}>{Months.label(month)}</Text>
      {arrow(I18nManager.isRTL ? '‹' : '›', 1, atCurrent)}
      {!atCurrent ? (
        <Pressable onPress={() => onChange(Months.current())} hitSlop={6} style={[styles.today, { backgroundColor: colors.primarySoft }]}>
          <Text style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: 12 }}>{t('common.today')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, height: 42, paddingHorizontal: 4 },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 14.5 },
  today: { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, marginRight: 4 },
});
