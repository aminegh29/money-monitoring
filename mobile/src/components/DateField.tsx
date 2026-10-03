import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '@/theme/theme';
import { formatDate, Months } from '@/utils/format';
import { currentLocale, useI18n } from '@/i18n';
import { Txt } from './ui';

/** Date input bound to a "YYYY-MM-DD" string. By default dates after today can't be picked (expenses, income). */
export function DateField({
  label,
  value,
  onChange,
  future = false,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  /** Only dates after today, for deadlines. */
  future?: boolean;
}) {
  const { colors, name } = useTheme();
  const { lang } = useI18n();
  const date = Months.fromIso(value);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maximumDate = future ? undefined : new Date();
  const minimumDate = future ? tomorrow : undefined;

  return (
    <View style={{ gap: 6, marginBottom: 14 }}>
      <Txt variant="label">{label}</Txt>
      {Platform.OS === 'ios' ? (
        <View style={{ alignItems: 'flex-start' }}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            locale={currentLocale()}
            key={lang}
            themeVariant={name}
            accentColor={colors.primary}
            onChange={(_, d) => d && onChange(Months.toIso(d))}
          />
        </View>
      ) : (
        <Pressable
          onPress={() =>
            DateTimePickerAndroid.open({
              value: date,
              mode: 'date',
              maximumDate,
              minimumDate,
              onChange: (_, d) => d && onChange(Months.toIso(d)),
            })
          }
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface2,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            height: 48,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 15 }}>📅 {formatDate(value)}</Text>
        </Pressable>
      )}
    </View>
  );
}
