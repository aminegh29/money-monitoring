import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/api/client';
import { shareReport } from '@/api/files';
import { MonthPicker } from '@/components/MonthPicker';
import { useToast } from '@/components/Toast';
import { Button, Card, Chip, Screen, Txt } from '@/components/ui';
import { currentLang, t, useI18n } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme/theme';
import { Months } from '@/utils/format';

export default function ReportsScreen() {
  const params = useLocalSearchParams<{ month?: string; year?: string }>();
  const { colors } = useTheme();
  useI18n();
  const toast = useToast();
  const [month, setMonth] = useState(params.month ?? Months.current());
  const [year, setYear] = useState(params.year ? Number(params.year) : new Date().getFullYear());
  const [busy, setBusy] = useState<string | null>(null);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const recent = Array.from({ length: 12 }, (_, i) => Months.shift(Months.current(), -i));

  const download = async (kind: 'monthly' | 'yearly', period: string | number) => {
    setBusy(`${kind}-${period}`);
    try {
      await shareReport(kind, period);
    } catch (err) {
      toast.error(t('reports.error'), errorMessage(err));
    }
    setBusy(null);
  };

  return (
    <Screen edges={[]}>
      <Txt variant="muted">{t('reports.subtitle')}</Txt>
      {currentLang() !== 'en' ? <Txt variant="dim">ℹ️ {t('reports.englishOnly')}</Txt> : null}

      <Card style={{ gap: 12 }}>
        <Txt variant="h3">{t('reports.monthly')}</Txt>
        <MonthPicker month={month} onChange={setMonth} />
        <Button title={t('reports.download')} icon="⤓" onPress={() => download('monthly', month)} loading={busy === `monthly-${month}`} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt variant="h3">{t('reports.annual')}</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
          {years.map((y) => (
            <Chip key={y} label={String(y)} selected={y === year} onPress={() => setYear(y)} />
          ))}
        </ScrollView>
        <Button title={t('reports.download')} icon="⤓" onPress={() => download('yearly', year)} loading={busy === `yearly-${year}`} />
      </Card>

      <Txt variant="label" style={{ marginTop: 4 }}>{t('reports.quick')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {recent.map((m) => (
          <Pressable
            key={m}
            onPress={() => download('monthly', m)}
            disabled={!!busy}
            style={({ pressed }) => ({
              width: '31%',
              flexGrow: 1,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceSolid,
              paddingVertical: 14,
              alignItems: 'center',
              gap: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {busy === `monthly-${m}` ? <ActivityIndicator color={colors.primary} /> : <Txt style={{ fontSize: 20 }}>📄</Txt>}
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 13 }}>{Months.label(m, 'short')}</Txt>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
