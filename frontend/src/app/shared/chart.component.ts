import { Component, effect, ElementRef, inject, input, OnDestroy, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, registerables, ScriptableContext } from 'chart.js';
import { ThemeService } from '../core/ui.service';

Chart.register(...registerables);

/** Reads a CSS custom property of the current theme ("--chart-1" → "#0f6e4f"). */
export function cssVar(name: string, fallback = '#888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** "#0f6e4f" + alpha → "rgba(15,110,79,alpha)". */
export function withAlpha(hex: string, alpha: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * Colours in chart configs can be written as "var(--chart-1)" or "var(--chart-1)/.2" (with alpha);
 * they are resolved when the chart is drawn, so charts follow the light/dark theme.
 */
function resolveColor(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('var(')) {
    const [, name, alpha] = value.match(/^var\((--[\w-]+)\)(?:\/([\d.]+))?$/) ?? [];
    if (!name) return value;
    const color = cssVar(name);
    return alpha ? withAlpha(color, Number(alpha)) : color;
  }
  if (Array.isArray(value)) return value.map(resolveColor);
  return value;
}

const COLOR_KEYS = ['backgroundColor', 'borderColor', 'hoverBackgroundColor', 'hoverBorderColor', 'pointBackgroundColor', 'pointBorderColor', 'pointHoverBackgroundColor'];

/**
 * Scriptable vertical gradient for line fills: backgroundColor: verticalGradient('var(--chart-1)/.18', 'var(--chart-1)/0')
 */
export function verticalGradient(top: string, bottom: string) {
  return (ctx: ScriptableContext<any>) => {
    const { chart } = ctx;
    const area = chart.chartArea;
    const from = resolveColor(top) as string;
    if (!area) return from;
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, from);
    g.addColorStop(1, resolveColor(bottom) as string);
    return g;
  };
}

/** Thin wrapper around Chart.js that re-renders when its config or the theme changes. */
@Component({
  selector: 'app-chart',
  template: `<div class="chart-box" [style.height.px]="height()"><canvas #canvas></canvas></div>`,
  styles: [`:host { display: block; } .chart-box { position: relative; width: 100%; }`],
})
export class ChartComponent implements OnDestroy {
  readonly config = input.required<ChartConfiguration>();
  readonly height = input(260);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private theme = inject(ThemeService);
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const config = this.config();
      this.theme.theme(); // re-render with the right colors when the theme changes
      // Wait for the container's height binding to be laid out, otherwise Chart.js measures a wrong size.
      requestAnimationFrame(() => this.render(config));
    });
  }

  private render(config: ChartConfiguration) {
    Chart.defaults.color = cssVar('--text-muted', '#5a6660');
    Chart.defaults.borderColor = cssVar('--border', '#e3e6e2');
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 12;

    const tooltip = {
      backgroundColor: cssVar('--surface-solid', '#fff'),
      titleColor: cssVar('--text', '#16201b'),
      bodyColor: cssVar('--text-muted', '#5a6660'),
      borderColor: cssVar('--border', '#e3e6e2'),
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      titleFont: { family: 'Inter, sans-serif', weight: 600 as const, size: 13 },
      boxPadding: 5,
      usePointStyle: true,
    };

    const datasets = config.data.datasets.map((ds: any) => {
      const copy = { ...ds };
      for (const key of COLOR_KEYS) if (key in copy) copy[key] = resolveColor(copy[key]);
      return copy;
    });

    this.chart?.destroy();
    const options: any = { ...(config.options ?? {}) };
    if (options.scales) {
      options.scales = Object.fromEntries(
        Object.entries(options.scales).map(([id, scale]: [string, any]) => [
          id,
          scale?.grid?.color ? { ...scale, grid: { ...scale.grid, color: resolveColor(scale.grid.color) } } : scale,
        ]),
      );
    }
    this.chart = new Chart(this.canvas().nativeElement, {
      ...config,
      data: { ...config.data, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutCubic' },
        ...options,
        plugins: { ...options.plugins, tooltip: { ...tooltip, ...options.plugins?.tooltip } },
      },
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }
}
