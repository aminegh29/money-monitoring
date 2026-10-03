import { Component, computed, inject, model } from '@angular/core';
import { I18nService, TranslatePipe } from '../core/i18n';
import { Months } from '../core/ui.service';

@Component({
  selector: 'app-month-picker',
  imports: [TranslatePipe],
  template: `
    <div class="month-picker">
      <button class="icon-btn" (click)="month.set(shift(-1))" [attr.aria-label]="'web.month.prev' | t">{{ rtl() ? '›' : '‹' }}</button>
      <span class="month-label">{{ label() }}</span>
      <button class="icon-btn" (click)="month.set(shift(1))" [disabled]="isCurrent()" [attr.aria-label]="'web.month.next' | t">{{ rtl() ? '‹' : '›' }}</button>
      @if (!isCurrent()) {
        <button class="btn btn-ghost btn-sm" (click)="month.set(current)">{{ 'common.today' | t }}</button>
      }
    </div>
  `,
  styles: [`
    .month-picker { display: inline-flex; align-items: center; gap: .5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: .25rem .4rem; }
    .month-label { min-width: 130px; text-align: center; font-weight: 600; }
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
