import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { ChatMessage } from '@/api/models';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { AdviceBody } from '@/components/AdviceBody';
import { Markdown } from '@/components/Markdown';
import { MonthPicker } from '@/components/MonthPicker';
import { Badge, Button, Card, Chip, Row, Txt } from '@/components/ui';
import { t, tList, useI18n } from '@/i18n';
import { fonts, radius, useTheme } from '@/theme/theme';
import { formatMoney, Months } from '@/utils/format';

type Tab = 'month' | 'year' | 'savings' | 'chat';

export default function AdvisorScreen() {
  const { colors } = useTheme();
  useI18n();
  const [tab, setTab] = useState<Tab>('month');
  const status = useQuery({ queryKey: qk.aiStatus, queryFn: api.aiStatus, staleTime: 5 * 60_000 });
  const s = status.data;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h1">{t('advisor.title')}</Txt>
          {s ? (
            <Badge
              label={s.configured ? `🟢 ${s.provider}${s.model ? ' · ' + s.model : ''}` : t('advisor.offline')}
              tone={s.configured ? 'success' : 'warning'}
            />
          ) : null}
        </Row>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'month', label: t('advisor.monthly') },
            { value: 'year', label: t('advisor.year') },
            { value: 'savings', label: t('advisor.savings') },
            { value: 'chat', label: t('advisor.penny') },
          ]}
        />
      </View>
      {tab === 'chat' ? <Chat /> : tab === 'savings' ? <SavingsView /> : <AdviceView kind={tab} />}
    </SafeAreaView>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center', backgroundColor: active ? colors.primarySoft : 'transparent' }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: active ? colors.primaryText : colors.textMuted, fontFamily: active ? fonts.semibold : fonts.medium, fontSize: 13 }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AdviceView({ kind }: { kind: 'month' | 'year' }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(Months.current());
  const [year, setYear] = useState(new Date().getFullYear());
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const key = kind === 'month' ? qk.monthlyAdvice(month) : qk.yearlyAdvice(year);
  const fetcher = (refresh: boolean) => (kind === 'month' ? api.monthlyAdvice(month, refresh) : api.yearlyAdvice(year, refresh));
  const advice = useQuery({ queryKey: key, queryFn: () => fetcher(false), staleTime: 5 * 60_000 });

  const regenerate = async () => {
    setRegenerating(true);
    setRegenError('');
    try {
      queryClient.setQueryData(key, await fetcher(true));
    } catch (err) {
      setRegenError(errorMessage(err));
    }
    setRegenerating(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
      <Row>
        <View style={{ flex: 1 }}>
          {kind === 'month' ? (
            <MonthPicker month={month} onChange={setMonth} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
              {years.map((y) => (
                <Chip key={y} label={String(y)} selected={y === year} onPress={() => setYear(y)} />
              ))}
            </ScrollView>
          )}
        </View>
        <Button title={t('common.regenerate')} icon="↻" variant="ghost" size="sm" onPress={regenerate} disabled={advice.isLoading || regenerating} height={42} />
      </Row>

      <Card glow={colors.violet}>
        <AdviceBody
          advice={advice.data}
          loading={advice.isLoading || regenerating}
          error={regenError || (advice.isError ? errorMessage(advice.error) : undefined)}
        />
      </Card>
    </ScrollView>
  );
}

/** Plan to reach the monthly savings goal from the profile. */
function SavingsView() {
  const { colors } = useTheme();
  const { user, currency } = useAuth();
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const advice = useQuery({ queryKey: qk.savingsAdvice, queryFn: () => api.savingsAdvice(), staleTime: 5 * 60_000 });

  const regenerate = async () => {
    setRegenerating(true);
    setRegenError('');
    try {
      queryClient.setQueryData(qk.savingsAdvice, await api.savingsAdvice(true));
    } catch (err) {
      setRegenError(errorMessage(err));
    }
    setRegenerating(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 8 }}>
        <Txt variant="muted">{t('advisor.savingsIntro')}</Txt>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Txt style={{ fontFamily: fonts.semibold }}>
            {t('dashboard.savingsGoal')}: {user?.savingsGoal ? t('common.perMonth', { amount: formatMoney(user.savingsGoal, currency) }) : '—'}
          </Txt>
          <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
            <Text style={{ color: colors.primaryText, fontFamily: fonts.semibold, fontSize: 13 }}>{t('advisor.changeGoal')}</Text>
          </Pressable>
        </Row>
      </Card>
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button title={t('common.regenerate')} icon="↻" variant="ghost" size="sm" onPress={regenerate} disabled={advice.isLoading || regenerating} />
      </Row>
      <Card glow={colors.violet}>
        <AdviceBody
          advice={advice.data}
          loading={advice.isLoading || regenerating}
          error={regenError || (advice.isError ? errorMessage(advice.error) : undefined)}
        />
      </Card>
    </ScrollView>
  );
}

function Chat() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    const history = messages;
    setMessages([...history, { role: 'user', content: message }]);
    setDraft('');
    setSending(true);
    try {
      const r = await api.chat(message, history);
      setMessages((m) => [...m, { role: 'assistant', content: r.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ ' + errorMessage(err) }]);
    }
    setSending(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {!messages.length ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 42 }}>🤖</Text>
            <Txt variant="h3" style={{ textAlign: 'center' }}>{t('advisor.askPenny')}</Txt>
            <Txt variant="muted" style={{ textAlign: 'center' }}>{t('advisor.chatHello')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {tList('advisor.suggestions').map((s) => (
                <Chip key={s} label={s} onPress={() => send(s)} />
              ))}
            </View>
          </View>
        ) : (
          messages.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' ? <Bot /> : null}
              {m.role === 'user' ? (
                <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[bubble, { borderBottomRightRadius: 4 }]}>
                  <Text style={{ color: '#fff', fontFamily: fonts.body, fontSize: 14.5 }}>{m.content}</Text>
                </LinearGradient>
              ) : (
                <View style={[bubble, { backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 }]}>
                  <Markdown size={14}>{m.content}</Markdown>
                </View>
              )}
            </View>
          ))
        )}
        {sending ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <Bot />
            <View style={[bubble, { backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.border }]}>
              <Txt variant="muted">{t('advisor.typing')}</Txt>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.bg }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('advisor.placeholder')}
          placeholderTextColor={colors.textDim}
          maxLength={2000}
          multiline
          style={{
            flex: 1,
            maxHeight: 110,
            minHeight: 44,
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 15,
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 12,
          }}
        />
        {messages.length ? (
          <Button title={t('advisor.clear')} variant="ghost" size="sm" onPress={() => setMessages([])} height={44} style={{ alignSelf: 'flex-end' }} />
        ) : null}
        <Button title={t('advisor.send')} size="sm" onPress={() => send(draft)} disabled={!draft.trim() || sending} height={44} style={{ alignSelf: 'flex-end' }} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Bot() {
  const { colors } = useTheme();
  return (
    <LinearGradient colors={colors.gradient} style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 14 }}>✨</Text>
    </LinearGradient>
  );
}

const bubble = { maxWidth: '85%' as const, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 };
