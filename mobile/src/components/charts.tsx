import { ReactNode, useId, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { fonts, useTheme } from '@/theme/theme';
import { compact } from '@/utils/format';
import { t } from '@/i18n';

// Charts are drawn by hand with react-native-svg, which Expo Go bundles; native chart libraries are not available there.

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (e) => setWidth(Math.round(e.nativeEvent.layout.width))];
}

/** "Nice" axis maximum (1, 2, 2.5 or 5 × 10ⁿ) so grid labels are round numbers. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 2.5, 5, 10]) if (value <= m * exp) return m * exp;
  return 10 * exp;
}

/** Tracks which column the finger is over while touching the chart. */
function useScrub(count: number, plotLeft: number, plotWidth: number) {
  const [index, setIndex] = useState<number | null>(null);
  const pick = (e: GestureResponderEvent) => {
    if (!count || plotWidth <= 0) return;
    const x = e.nativeEvent.locationX - plotLeft;
    setIndex(Math.max(0, Math.min(count - 1, Math.floor((x / plotWidth) * count))));
  };
  const handlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => true,
    onResponderGrant: pick,
    onResponderMove: pick,
    onResponderRelease: () => setTimeout(() => setIndex(null), 1500),
    onResponderTerminate: () => setIndex(null),
  };
  return { index, handlers };
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'flex-end' }}>
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i.color }} />
          <Text style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12 }}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Tooltip({ title, lines }: { title: string; lines: { label: string; value: string; color: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tooltip, { backgroundColor: colors.surfaceSolid, borderColor: colors.borderStrong }]}>
      <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 12.5 }}>{title}</Text>
      {lines.map((l) => (
        <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: l.color }} />
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>
            {l.label}: <Text style={{ color: colors.text, fontFamily: fonts.semibold }}>{l.value}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Ring ──────────────────────────────────────────────────────────────────

/** Circular progress with a gradient stroke and content in the middle. */
export function Ring({ value, size = 130, stroke = 12, color, children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const { colors } = useTheme();
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`ring${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color ?? colors.gradient[0]} />
            <Stop offset="0.5" stopColor={color ?? colors.gradient[1]} />
            <Stop offset="1" stopColor={color ?? colors.gradient[2]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface3} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#ring${id})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ── Grouped bars (income vs expenses per month) ───────────────────────────

export function GroupedBarChart({
  labels,
  series,
  height = 220,
  format,
}: {
  labels: string[];
  series: { label: string; color: string; values: number[] }[];
  height?: number;
  format: (v: number) => string;
}) {
  const { colors } = useTheme();
  const [width, onLayout] = useWidth();
  const id = useId().replace(/:/g, '');
  const left = 40;
  const bottom = 22;
  const top = 8;
  const plotW = Math.max(0, width - left);
  const plotH = height - bottom - top;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const groupW = labels.length ? plotW / labels.length : 0;
  const barW = Math.min(18, (groupW * 0.7) / series.length);
  const { index, handlers } = useScrub(labels.length, left, plotW);

  return (
    <View style={{ gap: 10 }}>
      <Legend items={series} />
      <View onLayout={onLayout} style={{ height }} {...handlers}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              {series.map((s, si) => (
                <LinearGradient key={s.label} id={`bar${id}${si}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.95} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0.15} />
                </LinearGradient>
              ))}
            </Defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = top + plotH * (1 - f);
              return (
                <G key={f}>
                  <Line x1={left} x2={width} y1={y} y2={y} stroke={colors.gridLine} strokeWidth={1} />
                  <SvgText x={left - 6} y={y + 4} fontSize={10} fill={colors.textDim} textAnchor="end">
                    {compact(max * f)}
                  </SvgText>
                </G>
              );
            })}
            {labels.map((label, i) => {
              const gx = left + groupW * i;
              const startX = gx + (groupW - barW * series.length - 4 * (series.length - 1)) / 2;
              return (
                <G key={label + i} opacity={index === null || index === i ? 1 : 0.4}>
                  {series.map((s, si) => {
                    const h = (Math.max(0, s.values[i] ?? 0) / max) * plotH;
                    return (
                      <Rect
                        key={s.label}
                        x={startX + si * (barW + 4)}
                        y={top + plotH - h}
                        width={barW}
                        height={Math.max(h, 0)}
                        rx={Math.min(6, barW / 2)}
                        fill={`url(#bar${id}${si})`}
                      />
                    );
                  })}
                  <SvgText x={gx + groupW / 2} y={height - 6} fontSize={10.5} fill={colors.textMuted} textAnchor="middle">
                    {label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        )}
        {index !== null && (
          <View pointerEvents="none" style={[styles.tooltipHost, { left: Math.min(Math.max(left + groupW * index - 40, 0), Math.max(width - 170, 0)) }]}>
            <Tooltip
              title={labels[index]}
              lines={series.map((s) => ({ label: s.label, value: format(s.values[index] ?? 0), color: s.color }))}
            />
          </View>
        )}
      </View>
    </View>
  );
}

// ── Donut (spending by category) ──────────────────────────────────────────

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = { x: cx + r * Math.cos(start), y: cy + r * Math.sin(start) };
  const e = { x: cx + r * Math.cos(end), y: cy + r * Math.sin(end) };
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function DonutChart({
  slices,
  size = 190,
  stroke = 18,
  children,
}: {
  slices: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2;
  const c = size / 2;
  const gap = slices.length > 1 ? 0.04 : 0;
  let angle = -Math.PI / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={colors.surface3} strokeWidth={stroke} fill="none" />
        {total > 0 &&
          slices.map((s, i) => {
            const sweep = (s.value / total) * Math.PI * 2;
            const start = angle + gap / 2;
            const end = angle + sweep - gap / 2;
            angle += sweep;
            if (sweep >= Math.PI * 2 - 0.001) return <Circle key={i} cx={c} cy={c} r={r} stroke={s.color} strokeWidth={stroke} fill="none" />;
            if (end <= start) return null;
            return <Path key={i} d={arcPath(c, c, r, start, end)} stroke={s.color} strokeWidth={stroke} strokeLinecap="round" fill="none" />;
          })}
      </Svg>
      {children}
    </View>
  );
}

// ── Daily bars + cumulative line ──────────────────────────────────────────

export function ComboChart({
  days,
  bars,
  line,
  height = 220,
  format,
}: {
  days: number[];
  bars: number[];
  line: number[];
  height?: number;
  format: (v: number) => string;
}) {
  const { colors } = useTheme();
  const [width, onLayout] = useWidth();
  const id = useId().replace(/:/g, '');
  const left = 36;
  const right = 40;
  const bottom = 22;
  const top = 8;
  const plotW = Math.max(0, width - left - right);
  const plotH = height - bottom - top;
  const maxBar = niceMax(Math.max(0, ...bars));
  const maxLine = niceMax(Math.max(0, ...line));
  const n = days.length;
  const step = n ? plotW / n : 0;
  const barW = Math.max(2, Math.min(10, step * 0.6));
  const { index, handlers } = useScrub(n, left, plotW);

  const pts = line.map((v, i) => ({ x: left + step * i + step / 2, y: top + plotH - (v / maxLine) * plotH }));
  // Smooth the cumulative curve with a simple Catmull-Rom → Bézier conversion.
  let d = '';
  pts.forEach((p, i) => {
    if (i === 0) {
      d = `M ${p.x} ${p.y}`;
      return;
    }
    const p0 = pts[i - 2] ?? pts[i - 1];
    const p1 = pts[i - 1];
    const p3 = pts[i + 1] ?? p;
    const t = 0.18;
    d += ` C ${p1.x + (p.x - p0.x) * t} ${p1.y + (p.y - p0.y) * t}, ${p.x - (p3.x - p1.x) * t} ${p.y - (p3.y - p1.y) * t}, ${p.x} ${p.y}`;
  });
  const area = pts.length ? `${d} L ${pts[pts.length - 1].x} ${top + plotH} L ${pts[0].x} ${top + plotH} Z` : '';
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <View style={{ gap: 10 }}>
      <Legend items={[{ label: t('dashboard.cumulative'), color: colors.violet }, { label: t('dashboard.daily'), color: colors.cyan }]} />
      <View onLayout={onLayout} style={{ height }} {...handlers}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={`area${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.violet} stopOpacity={0.35} />
                <Stop offset="1" stopColor={colors.cyan} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = top + plotH * (1 - f);
              return (
                <G key={f}>
                  <Line x1={left} x2={width - right} y1={y} y2={y} stroke={colors.gridLine} strokeWidth={1} />
                  <SvgText x={left - 6} y={y + 4} fontSize={10} fill={colors.textDim} textAnchor="end">
                    {compact(maxBar * f)}
                  </SvgText>
                  <SvgText x={width - right + 6} y={y + 4} fontSize={10} fill={colors.textDim} textAnchor="start">
                    {compact(maxLine * f)}
                  </SvgText>
                </G>
              );
            })}
            {bars.map((v, i) => {
              const h = (v / maxBar) * plotH;
              return (
                <Rect
                  key={i}
                  x={left + step * i + (step - barW) / 2}
                  y={top + plotH - h}
                  width={barW}
                  height={Math.max(h, 0)}
                  rx={Math.min(3, barW / 2)}
                  fill={colors.cyan}
                  opacity={index === null || index === i ? 0.55 : 0.2}
                />
              );
            })}
            {area ? <Path d={area} fill={`url(#area${id})`} /> : null}
            {d ? <Path d={d} stroke={colors.violet} strokeWidth={3} fill="none" /> : null}
            {index !== null && pts[index] ? (
              <>
                <Line x1={pts[index].x} x2={pts[index].x} y1={top} y2={top + plotH} stroke={colors.borderStrong} strokeDasharray="4 4" />
                <Circle cx={pts[index].x} cy={pts[index].y} r={5} fill={colors.cyan} stroke={colors.surfaceSolid} strokeWidth={2} />
              </>
            ) : null}
            {days.map((day, i) =>
              i % labelEvery === 0 ? (
                <SvgText key={day} x={left + step * i + step / 2} y={height - 6} fontSize={10.5} fill={colors.textMuted} textAnchor="middle">
                  {day}
                </SvgText>
              ) : null,
            )}
          </Svg>
        )}
        {index !== null && (
          <View pointerEvents="none" style={[styles.tooltipHost, { left: Math.min(Math.max(left + step * index - 60, 0), Math.max(width - 170, 0)) }]}>
            <Tooltip
              title={t('dashboard.day', { n: days[index] })}
              lines={[
                { label: t('dashboard.cumulative'), value: format(line[index] ?? 0), color: colors.violet },
                { label: t('dashboard.daily'), value: format(bars[index] ?? 0), color: colors.cyan },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipHost: { position: 'absolute', top: 0 },
  tooltip: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 3, minWidth: 140 },
});
