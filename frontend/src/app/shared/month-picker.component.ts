import { Component, computed, inject, model } from '@angular/core';
import { I18nService, TranslatePipe } from '../core/i18n';
import { Months } from '../core/ui.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-month-picker',
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="month-picker">
      <button class="icon-btn" (click)="month.set(shift(-1))" [attr.aria-label]="'web.month.prev' | t"><app-icon [name]="rtl() ? 'chevron-right' : 'chevron-left'" [size]="16" /></button>
      <span class="month-label">{{ label() }}</span>
      <button class="icon-btn" (click)="month.set(shift(1))" [disabled]="isCurrent()" [attr.aria-label]="'web.month.next' | t"><app-icon [name]="rtl() ? 'chevron-left' : 'chevron-right'" [size]="16" /></button>
      @if (!isCurrent()) {
        <button class="btn btn-ghost btn-sm" (click)="month.set(current)">{{ 'common.today' | t }}</button>
      }
    </div>
  `,
  styles: [`
    .month-picker { display: inline-flex; align-items: center; gap: 2px; height: 38px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 8px; padding: 0 2px; }
    .month-picker .icon-btn { width: 32px; height: 32px; }
    .month-label { min-width: 124px; text-align: center; font-weight: 500; font-size: 14px; }
  `],
})
export class MonthPickerComponent {
  private i18n = inject(I18nService);
  readonly month = model.required<string>();
  readonly current = Months.current();
  readonly label = computed(() => {
    this.i18n.lang();
    return Months.label(this.month());
  });
  readonly rtl = computed(() => this.i18n.lang() === 'ar');
  readonly isCurrent = computed(() => this.month() >= this.current);

  shift(delta: number) {
    return Months.shift(this.month(), delta);
  }
}
