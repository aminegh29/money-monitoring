import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Advice } from '@/api/models';
import { t } from '@/i18n';
import { fonts, useTheme } from '@/theme/theme';
import { timeAgo } from '@/utils/format';
import { Markdown } from './Markdown';
import { Loading, Notice, Txt } from './ui';

/** "Analysing…" placeholder, then the AI Markdown text with its source footer. Used for every AI text. */
export function AdviceBody({ advice, loading, error }: { advice?: Advice; loading: boolean; error?: string }) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 36, gap: 8 }}>
        <LinearGradient colors={colors.gradient} style={{ width: 54, height: 54, borderRadius: 27, marginBottom: 6 }} />
        <Txt style={{ fontFamily: fonts.semibold }}>{t('advisor.analysing')}</Txt>
        <Txt variant="small" style={{ textAlign: 'center' }}>{t('advisor.analysingHint')}</Txt>
        <Loading />
      </View>
    );
  }
  if (advice) {
    return (
      <>
        <Markdown>{advice.content}</Markdown>
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border }}>
          <Txt variant="dim">
            {t('advisor.generated', {
              when: timeAgo(advice.createdAt),
              source: advice.source === 'rules' ? t('advisor.builtIn') : advice.source,
            })}
          </Txt>
        </View>
        {error ? <View style={{ marginTop: 10 }}><Notice tone="danger" text={error} /></View> : null}
      </>
    );
  }
  return error ? <Notice tone="danger" text={error} /> : null;
}
