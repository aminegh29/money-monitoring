import { View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Row, Txt } from './ui';
import { tList } from '@/i18n';

/** 0-4 score used by the strength meter (same rules as the web app). */
export function passwordScore(p: string): number {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score++;
  return score;
}

export function StrengthMeter({ password }: { password: string }) {
  const { colors } = useTheme();
  if (!password) return null;
  const score = passwordScore(password);
  const tones = [colors.border, colors.danger, colors.warning, '#84cc16', colors.success];
  return (
    <Row style={{ marginTop: -6, marginBottom: 14 }} gap={6}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flex: 1, height: 5, borderRadius: 9, backgroundColor: i <= score ? tones[score] : colors.border }} />
      ))}
      <Txt variant="small" style={{ width: 64, textAlign: 'right' }}>
        {tList('auth.strength')[score]}
      </Txt>
    </Row>
  );
}
