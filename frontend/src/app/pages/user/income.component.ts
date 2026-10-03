import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { Income } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { Months, ToastService } from '../../core/ui.service';
import { ConfirmComponent, ModalComponent } from '../../shared/modal.component';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { LocalDatePipe, MoneyPipe } from '../../shared/pipes';
import { I18nService, t, tList, TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-income',
  imports: [ReactiveFormsModule, RouterLink, MonthPickerComponent, MoneyPipe, ModalComponent, ConfirmComponent, TranslatePipe, LocalDatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'income.title' | t }}</h1>
          <p>{{ 'income.subtitle' | t }}</p>
        </div>
        <div class="header-actions">
          <app-month-picker [(month)]="month" />
          <button class="btn btn-primary" (click)="open(null)">＋ {{ 'income.addTitle' | t }}</button>
        </div>
      </div>

      <div class="grid grid-3">
        <div class="card kpi">
          <div class="kpi-label">{{ 'income.total' | t }}</div>
          <div class="kpi-value text-success">{{ total() | money: auth.currency() }}</div>
          <div class="kpi-sub">{{ 'income.entries' | t: { n: incomes().length, month: monthLabel() } }}</div>
        </div>
        <div class="card kpi span-2 hint">
          <div class="kpi-label">{{ 'income.tipTitle' | t }}</div>
          <p class="mt-s">{{ 'income.tip' | t: { amount: (auth.user()?.monthlyIncome | money: auth.currency()) } }}</p>
          <a routerLink="/app/profile" class="small">{{ 'income.editProfile' | t }}</a>
        </div>
      </div>

      <div class="card mt">
        @if (incomes().length) {
          <div class="table-wrap">
            <table class="table table-cards">
              <thead><tr><th>{{ 'web.table.source' | t }}</th><th>{{ 'common.date' | t }}</th><th class="text-right">{{ 'web.table.amount' | t }}</th><th></th></tr></thead>
              <tbody>
                @for (i of incomes(); track i.id) {
                  <tr>
                    <td class="cell-main"><span class="cat-chip"><span class="cat-dot" style="background: var(--success-soft)">💵</span><b>{{ i.source }}</b></span></td>
                    <td class="muted cell-meta">{{ i.date | date2 }}</td>
                    <td class="text-right num text-success cell-amount"><b>+{{ i.amount | money: auth.currency() }}</b></td>
                    <td class="actions">
                      <button class="icon-btn" [title]="'common.edit' | t" (click)="open(i)">✏️</button>
                      <button class="icon-btn danger" [title]="'common.delete' | t" (click)="toDelete.set(i)">🗑️</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state"><div class="emoji">💵</div><h4>{{ 'income.none' | t }}</h4><p>{{ 'income.noneHint' | t }}</p></div>
        }
      </div>
    </div>

    @if (formOpen()) {
      <app-modal [title]="(editing() ? 'income.editTitle' : 'income.addTitle') | t" (closed)="formOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-field">
            <label>{{ 'common.amountIn' | t: { cur: auth.currency() } }}</label>
            <input class="input" type="number" step="0.01" formControlName="amount" placeholder="0.00" />
          </div>
          <div class="form-field">
            <label>{{ 'income.source' | t }}</label>
            <input class="input" formControlName="source" [placeholder]="'income.sourcePlaceholder' | t" list="sources" />
            <datalist id="sources">@for (s of sources(); track s) { <option [value]="s"></option> }</datalist>
          </div>
          <div class="form-field">
            <label>{{ 'common.date' | t }}</label>
            <input class="input" type="date" formControlName="date" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="formOpen.set(false)">{{ 'common.cancel' | t }}</button>
            <button class="btn btn-primary" [disabled]="form.invalid || saving()">{{ 'common.save' | t }}</button>
          </div>
        </form>
      </app-modal>
    }
    @if (toDelete(); as i) {
      <app-confirm [title]="'income.deleteTitle' | t" [message]="'income.deleteMsg' | t: { name: i.source }" [confirmLabel]="'common.delete' | t" (confirm)="remove(i)" (cancel)="toDelete.set(null)" />
    }
  `,
  styles: [`.hint p { color: var(--text-muted); } .mt-s { margin-top: 10px; }`],
})
export class IncomeComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly month = signal(Months.current());
  readonly incomes = signal<Income[]>([]);
  readonly formOpen = signal(false);
  readonly editing = signal<Income | null>(null);
  readonly toDelete = signal<Income | null>(null);
  readonly saving = signal(false);
  readonly total = computed(() => this.incomes().reduce((s, i) => s + i.amount, 0));
  private i18n = inject(I18nService);
  readonly monthLabel = computed(() => {
    this.i18n.lang();
    return Months.label(this.month());
  });
  readonly sources = computed(() => {
    this.i18n.lang();
    return tList('income.sources');
  });

  readonly form = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    source: ['', Validators.required],
    date: [Months.today(), Validators.required],
  });

  constructor() {
    effect(() => {
      this.month();
      untracked(() => this.load());
    });
    inject(RealtimeService).on('INCOMES_CHANGED').pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  load() {
    this.api.incomes(this.month()).subscribe((l) => this.incomes.set(l));
  }

  open(i: Income | null) {
    this.editing.set(i);
    this.form.reset({ amount: i?.amount ?? null, source: i?.source ?? tList('income.sources')[0], date: i?.date ?? Months.defaultDate(this.month()) });
    this.formOpen.set(true);
  }

  save() {
    const v = this.form.getRawValue();
    const body = { amount: Number(v.amount), source: v.source, date: v.date };
    const e = this.editing();
    this.saving.set(true);
    (e ? this.api.updateIncome(e.id, body) : this.api.createIncome(body)).subscribe({
      next: () => {
        this.toast.success(t(e ? 'income.updated' : 'income.added'));
        this.formOpen.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (err) => {
        this.toast.error(t('common.couldNotSave'), errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  remove(i: Income) {
    this.toDelete.set(null);
    this.api.deleteIncome(i.id).subscribe(() => {
      this.toast.success(t('income.deleted'));
      this.load();
    });
  }
}
