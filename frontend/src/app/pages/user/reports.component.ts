import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { FormsModule } from '@angular/forms';
import { ApiService, downloadBlob } from '../../core/api.service';
import { Months, ToastService } from '../../core/ui.service';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { MonthLabelPipe } from '../../shared/pipes';
import { I18nService, t, TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-reports',
  imports: [IconComponent, FormsModule, MonthPickerComponent, MonthLabelPipe, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'reports.title' | t }}</h1>
          <p>{{ 'web.reports.subtitle' | t }}</p>
          @if (i18n.lang() !== 'en') { <p class="muted small note"><app-icon name="info" [size]="14" />{{ 'reports.englishOnly' | t }}</p> }
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card report">
          <div class="illu"><app-icon name="calendar" [size]="20" /></div>
          <h3>{{ 'reports.monthly' | t }}</h3>
          <p class="muted">{{ 'web.reports.monthlyDesc' | t }}</p>
          <div class="row controls">
            <app-month-picker [(month)]="month" />
            <button class="btn btn-primary" (click)="downloadMonth(month())" [disabled]="busy() === month()">
              @if (busy() === month()) { <span class="spinner"></span> {{ 'web.reports.generating' | t }} } @else { <app-icon name="download" [size]="16" />{{ 'reports.download' | t }} }
            </button>
          </div>
        </div>

        <div class="card report yearly">
          <div class="illu"><app-icon name="calendar-range" [size]="20" /></div>
          <h3>{{ 'reports.annual' | t }}</h3>
          <p class="muted">{{ 'web.reports.annualDesc' | t }}</p>
          <div class="row controls">
            <select class="input year" [ngModel]="yearSel()" (ngModelChange)="yearSel.set(+$event)">
              @for (y of years; track y) { <option [value]="y">{{ y }}</option> }
            </select>
            <button class="btn btn-primary" (click)="downloadYear(yearSel())" [disabled]="busy() === 'Y' + yearSel()">
              @if (busy() === 'Y' + yearSel()) { <span class="spinner"></span> {{ 'web.reports.generating' | t }} } @else { <app-icon name="download" [size]="16" />{{ 'reports.download' | t }} }
            </button>
          </div>
        </div>
      </div>

      <div class="card mt">
        <div class="card-header"><h3>{{ 'reports.quick' | t }}</h3><span class="muted small">{{ 'web.reports.last12' | t }}</span></div>
        <div class="months">
          @for (m of lastMonths(); track m) {
            <button class="month-tile" (click)="downloadMonth(m)" [disabled]="busy() === m">
              <span class="ico">@if (busy() === m) { <span class="spinner"></span> } @else { <app-icon name="file-down" [size]="18" /> }</span>
              <b>{{ m | monthLabel: 'short' }}</b>
              <span class="muted small">{{ (m === current ? 'web.reports.inProgress' : 'web.reports.complete') | t }}</span>
            </button>
          }
        </div>
      </div>
      <p class="muted small mt">{{ 'web.reports.footnote' | t }}</p>
    </div>
  `,
  styles: [`
    .note { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
    .report { display: grid; gap: 10px; }
    .illu { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary-text); }
    .report h3 { font-size: 17px; }
    .controls { flex-wrap: wrap; margin-top: 6px; }
    .year { width: 120px; }
    .months { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .month-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
      background: var(--surface); color: var(--text); font: inherit; cursor: pointer; transition: border-color .15s, background .15s; }
    .month-tile b { font-weight: 600; }
    .month-tile:hover:not(:disabled) { border-color: var(--border-strong); background: var(--surface-2); }
    .month-tile .ico { color: var(--text-muted); margin-bottom: 6px; height: 18px; display: flex; align-items: center; }
  `],
})
export class ReportsComponent implements OnInit {
  /** Optional query params, used by the "report ready" notifications. */
  readonly monthParam = input<string>('', { alias: 'month' });
  readonly yearParam = input<string>('', { alias: 'year' });

  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly i18n = inject(I18nService);

  readonly current = Months.current();
  readonly month = signal(Months.shift(Months.current(), -1));
  readonly yearSel = signal(new Date().getFullYear());
  readonly years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  readonly busy = signal<string | null>(null);
  readonly lastMonths = computed(() => Array.from({ length: 12 }, (_, i) => Months.shift(this.current, -i)));

  ngOnInit() {
    if (/^\d{4}-\d{2}$/.test(this.monthParam())) this.month.set(this.monthParam());
    if (/^\d{4}$/.test(this.yearParam())) this.yearSel.set(+this.yearParam());
  }

  downloadMonth(month: string) {
    this.busy.set(month);
    this.api.monthlyReport(month).subscribe({
      next: (blob) => {
        downloadBlob(blob, `money-monitor-${month}.pdf`);
        this.toast.success(t('web.reports.downloaded'), Months.label(month));
        this.busy.set(null);
      },
      error: () => {
        this.toast.error(t('reports.error'));
        this.busy.set(null);
      },
    });
  }

  downloadYear(year: number) {
    this.busy.set('Y' + year);
    this.api.yearlyReport(year).subscribe({
      next: (blob) => {
        downloadBlob(blob, `money-monitor-${year}-annual.pdf`);
        this.toast.success(t('web.reports.annualDownloaded'), String(year));
        this.busy.set(null);
      },
      error: () => {
        this.toast.error(t('reports.error'));
        this.busy.set(null);
      },
    });
  }
}
