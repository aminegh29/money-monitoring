import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type Gradient = readonly [string, string, string];

// "Neon Glass" tokens from frontend/src/styles.scss.
const dark = {
  bg: '#04050d',
  bg2: '#080a18',
  surface: 'rgba(255,255,255,0.045)',
  surfaceSolid: '#0d1022',
  surface2: 'rgba(255,255,255,0.06)',
  surface3: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#eef1ff',
  textMuted: '#8b93b8',
  textDim: '#5d6488',
  cyan: '#22d3ee',
  violet: '#8b5cf6',
  magenta: '#e879f9',
  primary: '#8b7bff',
  primarySoft: 'rgba(139,123,255,0.14)',
  primaryText: '#b4a9ff',
  success: '#34f5b5',
  successSoft: 'rgba(52,245,181,0.12)',
  danger: '#ff5c8a',
  dangerSoft: 'rgba(255,92,138,0.13)',
  warning: '#ffc94d',
  warningSoft: 'rgba(255,201,77,0.13)',
  info: '#38bdf8',
  infoSoft: 'rgba(56,189,248,0.13)',
  gradient: ['#22d3ee', '#8b5cf6', '#e879f9'] as Gradient,
  gradientSoft: ['rgba(34,211,238,0.18)', 'rgba(139,92,246,0.18)', 'rgba(232,121,249,0.18)'] as Gradient,
  gridLine: 'rgba(139,147,184,0.12)',
};

export type Colors = typeof dark;

const light: Colors = {
  bg: '#eef0fb',
  bg2: '#e6e9f8',
  surface: 'rgba(255,255,255,0.62)',
  surfaceSolid: '#ffffff',
  surface2: 'rgba(255,255,255,0.75)',
  surface3: 'rgba(15,23,60,0.06)',
  border: 'rgba(30,41,99,0.09)',
  borderStrong: 'rgba(30,41,99,0.18)',
  text: '#0b1030',
  textMuted: '#5b6390',
  textDim: '#8a91b5',
  cyan: '#06b6d4',
  violet: '#7c3aed',
  magenta: '#d946ef',
  primary: '#6d5cf6',
  primarySoft: 'rgba(109,92,246,0.1)',
  primaryText: '#5b47e8',
  success: '#059669',
  successSoft: 'rgba(5,150,105,0.1)',
  danger: '#e11d58',
  dangerSoft: 'rgba(225,29,88,0.09)',
  warning: '#d97706',
  warningSoft: 'rgba(217,119,6,0.1)',
  info: '#0284c7',
  infoSoft: 'rgba(2,132,199,0.1)',
  gradient: ['#06b6d4', '#7c3aed', '#d946ef'] as Gradient,
  gradientSoft: ['rgba(34,211,238,0.18)', 'rgba(139,92,246,0.18)', 'rgba(232,121,249,0.18)'] as Gradient,
  gridLine: 'rgba(30,41,99,0.08)',
};

export const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
};

export const radius = { lg: 22, md: 14, sm: 10, pill: 999 };

type ThemeName = 'dark' | 'light';
const THEME_KEY = 'mm_theme';

interface ThemeValue {
  name: ThemeName;
  colors: Colors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue>({ name: 'dark', colors: dark, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The neon theme is designed dark-first, like the web app.
  const [name, setName] = useState<ThemeName>('dark');

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
