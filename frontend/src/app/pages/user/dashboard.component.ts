import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { debounceTime } from 'rxjs';
import { ApiService, downloadBlob } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { catName, CategoryNamePipe, currentLocale, I18nService, t, TranslatePipe } from '../../core/i18n';
import { Advice, Dashboard, Goal } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { Months, ToastService } from '../../core/ui.service';
import { ChartComponent, verticalGradient } from '../../shared/chart.component';
import { CountUpDirective, RingComponent } from '../../shared/fx';
import { Native } from '../../core/native';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { goalTone } from '../../shared/goals';
import { formatMoney, LocalDatePipe, MarkdownPipe, MoneyPipe } from '../../shared/pipes';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ChartComponent, MonthPickerComponent, MoneyPipe, MarkdownPipe, CountUpDirective, RingComponent, TranslatePipe, CategoryNamePipe, LocalDatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);
  private i18n = inject(I18nService);
  readonly goals = signal<Goal[]>([]);
  readonly activeGoals = computed(() => this.goals().filter((g) => g.status !== 'COMPLETED').slice(0, 3));

  readonly month = signal(Months.current());
  readonly data = signal<Dashboard | null>(null);
  readonly insight = signal<Advice | null>(null);
  readonly insightLoading = signal(false);
  readonly downloading = signal(false);
  readonly pulse = signal(false);

  readonly firstName = computed(() => this.auth.user()?.fullName.split(' ')[0] ?? '');
  readonly greeting = computed(() => {
    this.i18n.lang();
    const h = new Date().getHours();
    return t(h < 12 ? 'dashboard.morning' : h < 18 ? 'dashboard.afternoon' : 'dashboard.evening');
  });
  readonly cur = computed(() => this.data()?.currency ?? this.auth.currency());
  readonly isCurrentMonth = computed(() => this.month() === Months.current());
  readonly goalProgress = computed(() => {
    const d = this.data();
    if (!d || !d.savingsGoal) return null;
    return Math.max(0, Math.min(100, (d.balance / d.savingsGoal) * 100));
  });

  /** First section of the AI advice, shown as a teaser. */
  readonly insightTeaser = computed(() => {
    const content = this.insight()?.content ?? '';
    const sections = content.split(/\n(?=#{1,4} )/);
    return sections.slice(0, 2).join('\n').slice(0, 700);
  });

  readonly incomeShare = computed(() => {
    const d = this.data();
    if (!d) return 0;
    const max = Math.max(d.totalIncome, d.totalExpenses, 1);
    return (d.totalIncome / max) * 100;
  });
  readonly expenseShare = computed(() => {
    const d = this.data();
    if (!d) return 0;
    const max = Math.max(d.totalIncome, d.totalExpenses, 1);
    return (d.totalExpenses / max) * 100;
  });
  readonly monthName = computed(() => {
    this.i18n.lang();
    return Months.name(this.month());
  });
  readonly dateLine = computed(() => {
    this.i18n.lang();
    return new Date().toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  });

  readonly trendChart = computed<ChartConfiguration>(() => {
    const trend = this.data()?.trend ?? [];
    this.i18n.lang();
    return {
      type: 'bar',
      data: {
        labels: trend.map((p) => Months.name(p.period, 'short')),
        datasets: [
          { label: t('dashboard.incomeLegend'), data: trend.map((p) => p.income), backgroundColor: verticalGradient('rgba(52,245,181,.95)', 'rgba(52,245,181,.08)'),
            borderRadius: 10, borderSkipped: false, maxBarThickness: 22, glowColor: 'rgba(52,245,181,.6)' } as any,
          { label: t('dashboard.expensesLegend'), data: trend.map((p) => p.expenses), backgroundColor: verticalGradient('rgba(139,92,246,.95)', 'rgba(34,211,238,.1)'),
            borderRadius: 10, borderSkipped: false, maxBarThickness: 22, glowColor: 'rgba(139,92,246,.7)' } as any,
        ],
      },
      options: {
        plugins: {
          legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7 } },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatMoney(c.parsed.y, this.cur())}` } },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, border: { display: false }, grid: { color: 'rgba(139,147,184,.08)' }, ticks: { callback: (v) => compact(Number(v)), maxTicksLimit: 5 } },
        },
      },
    };
  });

  readonly categoryChart = computed<ChartConfiguration>(() => {
    const cats = this.data()?.byCategory ?? [];
    this.i18n.lang();
    return {
      type: 'doughnut',
      data: {
        labels: cats.map((c) => catName(c.name)),
        datasets: [{ data: cats.map((c) => c.amount), backgroundColor: cats.map((c) => c.color), borderWidth: 0, spacing: 3, borderRadius: 6, hoverOffset: 10,
          glowColor: 'rgba(139,92,246,.5)', glowBlur: 18 } as any],
      },
      options: {
        cutout: '76%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${formatMoney(Number(c.raw), this.cur())}` } } },
      } as any,
    };
  });

  readonly dailyChart = computed<ChartConfiguration>(() => {
    const daily = this.data()?.daily ?? [];
    const today = Months.today();
    const visible = this.isCurrentMonth() ? daily.filter((d) => d.date <= today) : daily;
    let running = 0;
    const cumulative = visible.map((d) => (running += d.amount));
    this.i18n.lang();
    return {
      type: 'line',
      data: {
        labels: visible.map((d) => Number(d.date.slice(8))),
        datasets: [
          { label: t('dashboard.cumulative'), data: cumulative, borderColor: '#a78bfa', backgroundColor: verticalGradient('rgba(139,92,246,.35)', 'rgba(34,211,238,0)'),
            fill: true, tension: 0.42, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#22d3ee', borderWidth: 3, yAxisID: 'y1', glowBlur: 18 } as any,
          { type: 'bar', label: t('dashboard.daily'), data: visible.map((d) => d.amount), backgroundColor: 'rgba(34,211,238,.45)', hoverBackgroundColor: '#22d3ee',
            borderRadius: 4, maxBarThickness: 10, yAxisID: 'y' } as any,
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7 } },
          tooltip: { callbacks: { title: (items) => t('dashboard.day', { n: items[0].label }), label: (c) => ` ${c.dataset.label}: ${formatMoney(c.parsed.y, this.cur())}` } },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 10 } },
          y: { beginAtZero: true, position: 'left', border: { display: false }, grid: { color: 'rgba(139,147,184,.08)' }, ticks: { callback: (v) => compact(Number(v)), maxTicksLimit: 5 } },
          y1: { beginAtZero: true, position: 'right', border: { display: false }, grid: { display: false }, ticks: { callback: (v) => compact(Number(v)), maxTicksLimit: 5 } },
        },
      },
    };
  });

  constructor() {
    this.loadGoals();
    this.realtime.on('GOALS_CHANGED').pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => this.loadGoals());
    effect(() => {
      const m = this.month();
      untracked(() => {
        this.load();
        this.loadInsight(m);
      });
    });

    // Real-time: any change to the user's data refreshes the dashboard instantly.
    this.realtime
      .on('EXPENSES_CHANGED', 'INCOMES_CHANGED', 'BUDGETS_CHANGED', 'CATEGORIES_CHANGED', 'PROFILE_CHANGED', 'GOALS_CHANGED')
      .pipe(debounceTime(250), takeUntilDestroyed())
      .subscribe(() => {
        this.load();
        this.loadGoals();
        this.pulse.set(true);
        setTimeout(() => this.pulse.set(false), 2500);
      });
    // The AI insight is regenerated less eagerly, to stay within the free AI providers' rate limits.
    this.realtime
      .on('EXPENSES_CHANGED', 'INCOMES_CHANGED')
      .pipe(debounceTime(4000), takeUntilDestroyed())
      .subscribe(() => this.loadInsight(this.month()));
  }

  load() {
    this.api.dashboard(this.month()).subscribe((d) => this.data.set(d));
  }

  loadGoals() {
    this.api.goals().subscribe((g) => this.goals.set(g));
  }

  loadInsight(month: string, refresh = false) {
    this.insightLoading.set(true);
    this.api.monthlyAdvice(month, refresh).subscribe({
      next: (a) => {
        this.insight.set(a);
        this.insightLoading.set(false);
      },
      error: () => this.insightLoading.set(false),
    });
  }

  downloadPdf() {
    Native.tap();
    this.downloading.set(true);
    this.api.monthlyReport(this.month()).subscribe({
      next: (blob) => {
        downloadBlob(blob, `money-monitor-${this.month()}.pdf`);
        this.downloading.set(false);
      },
      error: () => {
        this.toast.error(t('dashboard.reportError'));
        this.downloading.set(false);
      },
    });
  }

  readonly goalTone = goalTone;

  budgetColor(percent: number) {
    return percent >= 100 ? 'var(--danger)' : percent >= 80 ? 'var(--warning)' : 'var(--success)';
  }

  abs(n: number) {
    return Math.abs(n);
  }
}

function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(Math.round(v));
}
