import { Pressable, View } from 'react-native';
import { Goal, GoalStatus } from '@/api/models';
import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { formatDate, formatMoney } from '@/utils/format';
import { Badge, ProgressBar, Row, Txt } from './ui';

type Tone = 'success' | 'primary' | 'warning' | 'danger';

export function goalTone(status: GoalStatus): Tone {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'ON_TRACK':
      return 'primary';
    case 'AT_RISK':
      return 'warning';
    default:
      return 'danger';
  }
}

/** One goal: name, status, progress bar, amounts and what is needed per month. */
export function GoalProgress({ goal, currency, onPress }: { goal: Goal; currency: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const tone = goalTone(goal.status);
  const barColor = { success: colors.success, primary: undefined, warning: colors.warning, danger: colors.danger }[tone];
  const money = (v: number) => formatMoney(v, currency);

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ gap: 7, opacity: pressed ? 0.7 : 1 })}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold, flexShrink: 1 }}>
          {goal.icon} {goal.name}
        </Txt>
        <Badge label={t(`goals.status.${goal.status}`)} tone={tone} />
      </Row>
      <ProgressBar percent={goal.percent} color={barColor} height={9} />
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Txt variant="small">{t('goals.savedOf', { saved: money(goal.savedAmount), target: money(goal.targetAmount) })}</Txt>
        <Txt variant="small" style={{ fontFamily: fonts.semibold }}>{Math.round(goal.percent)}%</Txt>
      </Row>
      {goal.status !== 'COMPLETED' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 }}>
          <Txt variant="dim">{t('goals.by', { date: formatDate(goal.deadline) })}</Txt>
          {goal.monthsLeft > 0 ? <Txt variant="dim">· {t('goals.needed', { amount: money(goal.requiredPerMonth) })}</Txt> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
