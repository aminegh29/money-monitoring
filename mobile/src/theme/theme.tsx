import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type Gradient = readonly [string, string, string];

// Same tokens as the web app (frontend/src/styles.scss): calm neutrals and one brand green.
// "gradient" entries are solid on purpose (no neon gradients); the names are kept so components stay unchanged.
const light = {
  bg: '#f6f7f5',
  bg2: '#eef0ed',
  surface: '#ffffff',
  surfaceSolid: '#ffffff',
  surface2: '#f2f4f1',
  surface3: '#e8ebe7',
  border: '#e3e6e2',
  borderStrong: '#cdd3cd',
  text: '#16201b',
  textMuted: '#5a6660',
  textDim: '#8c9690',
  cyan: '#2a5f9e',
  violet: '#0f6e4f',
  magenta: '#7a6bb0',
  primary: '#0f6e4f',
  primarySoft: '#e5f1eb',
  primaryText: '#0d6648',
  success: '#17794d',
  successSoft: '#e6f3ec',
  danger: '#c0352b',
  dangerSoft: '#fbecea',
  warning: '#a86200',
  warningSoft: '#fcf1df',
  info: '#2a5f9e',
  infoSoft: '#e8eff8',
  gradient: ['#0f6e4f', '#0f6e4f', '#0f6e4f'] as Gradient,
  gradientSoft: ['#e5f1eb', '#e5f1eb', '#e5f1eb'] as Gradient,
  gridLine: '#e3e6e2',
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#0f1211',
  bg2: '#131716',
  surface: '#161a19',
  surfaceSolid: '#161a19',
  surface2: '#1c211f',
  surface3: '#242a28',
  border: '#262c2a',
  borderStrong: '#363e3b',
  text: '#e7ebe9',
  textMuted: '#9aa49f',
  textDim: '#6c7671',
  cyan: '#6fa3dc',
  violet: '#3aa077',
  magenta: '#9d8fd4',
  primary: '#3aa077',
  primarySoft: 'rgba(58,160,119,0.14)',
  primaryText: '#5cc198',
  success: '#4cb583',
  successSoft: 'rgba(76,181,131,0.13)',
  danger: '#ec6a5e',
  dangerSoft: 'rgba(236,106,94,0.13)',
  warning: '#e0a548',
  warningSoft: 'rgba(224,165,72,0.13)',
  info: '#6fa3dc',
  infoSoft: 'rgba(111,163,220,0.13)',
  gradient: ['#3aa077', '#3aa077', '#3aa077'] as Gradient,
  gradientSoft: ['rgba(58,160,119,0.14)', 'rgba(58,160,119,0.14)', 'rgba(58,160,119,0.14)'] as Gradient,
  gridLine: '#262c2a',
};

export const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Inter_600SemiBold',
  displayMedium: 'Inter_500Medium',
};

export const radius = { lg: 14, md: 10, sm: 8, pill: 999 };

type ThemeName = 'dark' | 'light';
const THEME_KEY = 'mm_theme';

interface ThemeValue {
  name: ThemeName;
  colors: Colors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue>({ name: 'light', colors: light, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Light by default, like the web app; the user's choice is remembered.
  const [name, setName] = useState<ThemeName>('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') setName(saved);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      name,
      colors: name === 'dark' ? dark : light,
      toggle: () => {
        const next = name === 'dark' ? 'light' : 'dark';
        setName(next);
        AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      },
    }),
    [name],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Budget threshold colour: under 80% fine, 80–100% warning, over the limit danger. */
export function budgetColor(colors: Colors, percent: number) {
  return percent >= 100 ? colors.danger : percent >= 80 ? colors.warning : colors.success;
}

/** Appends a two-digit alpha to a #rrggbb colour, like the web app's `c.color + '22'`. */
export function alpha(hex: string, a: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex + a : hex;
}
