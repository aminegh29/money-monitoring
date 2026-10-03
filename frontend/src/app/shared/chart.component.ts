import { Component, effect, ElementRef, inject, input, OnDestroy, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, Plugin, registerables, ScriptableContext } from 'chart.js';
import { ThemeService } from '../core/ui.service';

Chart.register(...registerables);

/** Adds a neon glow behind lines, bars and arcs. */
const glowPlugin: Plugin = {
  id: 'neonGlow',
  beforeDatasetDraw(chart, args) {
    const ds = chart.data.datasets[args.index] as any;
    const color = ds.glowColor ?? (typeof ds.borderColor === 'string' ? ds.borderColor : null);
    if (!color) return;
    chart.ctx.save();
    chart.ctx.shadowColor = color;
    chart.ctx.shadowBlur = ds.glowBlur ?? 14;
  },
  afterDatasetDraw(chart, args) {
    const ds = chart.data.datasets[args.index] as any;
    if (ds.glowColor ?? (typeof ds.borderColor === 'string' ? ds.borderColor : null)) chart.ctx.restore();
  },
};

/**
 * Scriptable vertical gradient for bar/line fills:
 * backgroundColor: verticalGradient('#22d3ee', 'rgba(139,92,246,.05)')
 */
export function verticalGradient(top: string, bottom: string) {
  return (ctx: ScriptableContext<any>) => {
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return top;
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    return g;
  };
}

/** Horizontal cyan → violet → magenta gradient (the brand gradient). */
export function brandGradient(alpha = 1) {
  return (ctx: ScriptableContext<any>) => {
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return '#8b5cf6';
    const g = chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
    g.addColorStop(0, `rgba(34,211,238,${alpha})`);
    g.addColorStop(0.55, `rgba(139,92,246,${alpha})`);
    g.addColorStop(1, `rgba(232,121,249,${alpha})`);
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
    const styles = getComputedStyle(document.documentElement);
    const css = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
    Chart.defaults.color = css('--text-dim', '#5d6488');
    Chart.defaults.borderColor = css('--border', 'rgba(255,255,255,.08)');
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 11.5;

    const tooltip = {
      backgroundColor: css('--surface-solid', '#0d1022'),
      titleColor: css('--text', '#eef1ff'),
      bodyColor: css('--text-muted', '#8b93b8'),
      borderColor: css('--border-strong', 'rgba(255,255,255,.16)'),
      borderWidth: 1,
      cornerRadius: 12,
      padding: 12,
      titleFont: { family: 'Space Grotesk, Inter, sans-serif', weight: 600 as const, size: 13 },
      boxPadding: 5,
      usePointStyle: true,
    };

    this.chart?.destroy();
    const options: any = config.options ?? {};
    this.chart = new Chart(this.canvas().nativeElement, {
      ...config,
      plugins: [...(config.plugins ?? []), glowPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        ...options,
        plugins: { ...options.plugins, tooltip: { ...tooltip, ...options.plugins?.tooltip } },
      },
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }
}
