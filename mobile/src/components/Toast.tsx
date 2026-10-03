import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, useTheme } from '@/theme/theme';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const ICONS: Record<ToastKind, string> = { success: '✅', error: '⛔', info: 'ℹ️', warning: '⚠️' };
const TIMEOUTS: Record<ToastKind, number> = { success: 3500, info: 3500, error: 6000, warning: 6000 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const toast = { id: nextId.current++, kind, title, message };
      setToasts((t) => [...t, toast].slice(-3));
      setTimeout(() => dismiss(toast.id), TIMEOUTS[kind]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, m) => show('success', t, m),
      error: (t, m) => show('error', t, m),
      info: (t, m) => show('info', t, m),
      warning: (t, m) => show('warning', t, m),
    }),
    [show],
  );

  const tone: Record<ToastKind, string> = { success: colors.success, error: colors.danger, info: colors.info, warning: colors.warning };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
        {toasts.map((t) => (
          <FadeIn key={t.id}>
            <Pressable
              onPress={() => dismiss(t.id)}
              style={[styles.toast, { backgroundColor: colors.surfaceSolid, borderColor: colors.borderStrong, borderLeftColor: tone[t.kind] }]}
            >
              <Text style={styles.icon}>{ICONS[t.kind]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
                {t.message ? <Text style={[styles.message, { color: colors.textMuted }]}>{t.message}</Text> : null}
              </View>
            </Pressable>
          </FadeIn>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function FadeIn({ children }: { children: ReactNode }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, gap: 8, zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  icon: { fontSize: 18 },
  title: { fontFamily: fonts.semibold, fontSize: 14 },
  message: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
});
