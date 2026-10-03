import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, ReactNode, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps,
  TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { alpha, fonts, radius, useTheme } from '@/theme/theme';
import { haptics } from '@/utils/haptics';
import { t } from '@/i18n';

// ── Layout ────────────────────────────────────────────────────────────────

/** Scrollable page with the app background, safe-area padding and optional pull-to-refresh. */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ children, style, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceSolid, borderColor: glow ? alpha(glow, '55') : colors.border },
        glow ? { shadowColor: glow, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Card with the soft cyan → violet → magenta wash used for hero sections. */
export function GradientCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSolid, overflow: 'hidden' }, style]}>
      <LinearGradient colors={colors.gradientSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

// ── Text ──────────────────────────────────────────────────────────────────

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'muted' | 'small' | 'dim' | 'eyebrow' | 'num' | 'label';

export function Txt({ variant = 'body', style, color, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const { colors } = useTheme();
  const base: Record<Variant, TextStyle> = {
    h1: { fontFamily: fonts.display, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
    h2: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: -0.3 },
    h3: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
    body: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
    muted: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
    small: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
    dim: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textDim },
    eyebrow: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' },
    num: { fontFamily: fonts.display, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
    label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  };
  return <Text {...rest} style={[base[variant], color ? { color } : null, style]} />;
}

// ── Buttons ───────────────────────────────────────────────────────────────

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  height: fixedHeight,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const height = fixedHeight ?? (size === 'sm' ? 36 : size === 'lg' ? 54 : 46);
  const off = disabled || loading;
  const textColor = variant === 'primary' || variant === 'danger' ? '#fff' : variant === 'soft' ? colors.primaryText : colors.text;
  const content = (
    <>
      {loading ? <ActivityIndicator color={textColor} size="small" /> : icon ? <Text style={{ fontSize: size === 'sm' ? 13 : 15 }}>{icon}</Text> : null}
      <Text style={{ color: textColor, fontFamily: fonts.semibold, fontSize: size === 'sm' ? 13 : 15 }}>{title}</Text>
    </>
  );
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      disabled={off}
      style={({ pressed }) => [{ opacity: off ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.button, { height }]}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            { height },
            variant === 'ghost' && { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong },
            variant === 'soft' && { backgroundColor: colors.primarySoft },
            variant === 'danger' && { backgroundColor: colors.danger },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone }: { icon: string; onPress: () => void; label?: string; tone?: 'danger' }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: pressed ? (tone === 'danger' ? colors.dangerSoft : colors.surface3) : 'transparent' },
      ]}
    >
      <Text style={{ fontSize: 16 }}>{icon}</Text>
    </Pressable>
  );
}

// ── Inputs ────────────────────────────────────────────────────────────────

export const Input = forwardRef<TextInput, TextInputProps & { label?: string; error?: string | false; right?: ReactNode }>(
  function Input({ label, error, right, style, ...rest }, ref) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
      <View style={{ gap: 6, marginBottom: 14 }}>
        {label ? <Txt variant="label">{label}</Txt> : null}
        <View
          style={[
            styles.input,
            {
              backgroundColor: colors.surface2,
              borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            },
          ]}
        >
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textDim}
            selectionColor={colors.primary}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            {...rest}
            style={[{ flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15, paddingVertical: 12 }, style]}
          />
          {right}
        </View>
        {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      </View>
    );
  },
);

export function Chip({
  label,
  icon,
  selected,
  color,
  onPress,
}: {
  label: string;
  icon?: string;
  selected?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.primary;
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={[
        styles.chip,
        {
          borderColor: selected ? c : colors.border,
          backgroundColor: selected ? alpha(c, '2e') : colors.surface2,
        },
      ]}
    >
      {icon ? <Text style={{ fontSize: 14 }}>{icon}</Text> : null}
      <Text style={{ color: colors.text, fontFamily: selected ? fonts.semibold : fonts.body, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onChange(!value);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}
    >
      <View
        style={[
          styles.checkbox,
          { borderColor: value ? colors.primary : colors.borderStrong, backgroundColor: value ? colors.primary : 'transparent' },
        ]}
      >
        {value ? <Text style={{ color: '#fff', fontSize: 13, fontFamily: fonts.bold }}>✓</Text> : null}
      </View>
      <Txt variant="muted" style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );
}

// ── Feedback ──────────────────────────────────────────────────────────────

/** Native confirmation dialog for destructive actions. */
export function confirm(title: string, message: string, onConfirm: () => void, confirmLabel = t('common.delete')) {
  haptics.warning();
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral';

function toneColors(colors: ReturnType<typeof useTheme>['colors'], tone: Tone) {
  switch (tone) {
    case 'success':
      return { fg: colors.success, bg: colors.successSoft };
    case 'danger':
      return { fg: colors.danger, bg: colors.dangerSoft };
    case 'warning':
      return { fg: colors.warning, bg: colors.warningSoft };
    case 'info':
      return { fg: colors.info, bg: colors.infoSoft };
    case 'primary':
      return { fg: colors.primaryText, bg: colors.primarySoft };
    default:
      return { fg: colors.textMuted, bg: colors.surface3 };
  }
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors } = useTheme();
  const t = toneColors(colors, tone);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontFamily: fonts.semibold, fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'info' }: { text: string; tone?: Tone }) {
  const { colors } = useTheme();
  const t = toneColors(colors, tone);
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.fg }]}>
      <Text style={{ color: t.fg, fontFamily: fonts.medium, fontSize: 13.5 }}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ percent, color, height = 8 }: { percent: number; color?: string; height?: number }) {
  const { colors } = useTheme();
  const width = `${Math.max(0, Math.min(100, percent))}%` as const;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.surface3, overflow: 'hidden' }}>
      {color ? (
        <View style={{ width, height, borderRadius: height, backgroundColor: color }} />
      ) : (
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width, height, borderRadius: height }} />
      )}
    </View>
  );
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
      <Text style={{ fontSize: 38 }}>{emoji}</Text>
      <Txt variant="h3">{title}</Txt>
      {text ? <Txt variant="muted" style={{ textAlign: 'center' }}>{text}</Txt> : null}
      {action ? <View style={{ marginTop: 10 }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** Rounded emoji tile tinted with the category colour. */
export function CategoryDot({ icon, color, size = 38 }: { icon: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: alpha(color, '22'),
        borderWidth: 1,
        borderColor: alpha(color, '55'),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.48 }}>{icon}</Text>
    </View>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ marginBottom: 16, gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h1" style={{ flexShrink: 1 }}>{title}</Txt>
        {right}
      </Row>
      {subtitle ? <Txt variant="muted">{subtitle}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: 16, paddingBottom: 120, gap: 14 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  button: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: 18 },
  iconButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  input: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 48 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9, alignSelf: 'flex-start' },
  notice: { borderRadius: radius.md, borderWidth: 1, padding: 12 },
});
