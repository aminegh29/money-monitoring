import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { ApiService, downloadBlob } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { Category, Expense } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { Months, ToastService } from '../../core/ui.service';
import { ExpenseFormComponent } from '../../shared/expense-form.component';
import { ConfirmComponent } from '../../shared/modal.component';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { LocalDatePipe, MoneyPipe } from '../../shared/pipes';
import { catName, CategoryNamePipe, I18nService, t, tList, TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-expenses',
  imports: [IconComponent, FormsModule, MonthPickerComponent, MoneyPipe, ExpenseFormComponent, ConfirmComponent, TranslatePipe, CategoryNamePipe, LocalDatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'expenses.title' | t }}</h1>
          <p>{{ 'expenses.subtitle' | t }}</p>
        </div>
        <div class="header-actions">
          <app-month-picker [(month)]="month" />
          <button class="btn btn-ghost" (click)="exportCsv()" [disabled]="!expenses().length"><app-icon name="download" [size]="16" />CSV</button>
          <button class="btn btn-primary hide-mobile" (click)="openForm(null)"><app-icon name="plus" [size]="16" />{{ 'expenses.newTitle' | t }}</button>
        </div>
      </div>

      <div class="card">
        <div class="total-strip">
          <div><span class="muted small">{{ 'expenses.spentIn' | t: { month: monthLabel() } }}</span><div class="total num">{{ total() | money: auth.currency() }}</div></div>
          <span class="badge">{{ 'common.transactions' | t: { n: expenses().length } }}</span>
        </div>
        <div class="filters">
          <div class="search">
            <app-icon name="search" [size]="16" />
            <input class="input" [placeholder]="'expenses.search' | t" [ngModel]="search()" (ngModelChange)="search$.next($event)" />
          </div>
          <select class="input cat-filter" [ngModel]="categoryId()" (ngModelChange)="categoryId.set($event)">
            <option [ngValue]="null">{{ 'expenses.allCategories' | t }}</option>
            @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.icon }} {{ c.name | cat }}</option> }
          </select>
        </div>

        @if (loading()) {
          <div class="loading-box"><span class="spinner lg"></span></div>
        } @else if (expenses().length) {
          <div class="table-wrap">
            <table class="table table-cards">
              <thead>
                <tr><th>{{ 'web.table.expense' | t }}</th><th>{{ 'common.category' | t }}</th><th>{{ 'common.date' | t }}</th><th class="hide-mobile">{{ 'web.table.method' | t }}</th><th class="text-right">{{ 'web.table.amount' | t }}</th><th></th></tr>
              </thead>
              <tbody>
                @for (e of expenses(); track e.id) {
                  <tr [class.flash]="flashId() === e.id">
                    <td class="cell-main"><b>{{ e.description }}</b></td>
                    <td class="cell-meta"><span class="cat-chip"><span class="cat-dot" [style.background]="e.category.color + '1f'">{{ e.category.icon }}</span>{{ e.category.name | cat }}</span></td>
                    <td class="nowrap muted cell-meta">{{ e.date | date2: 'weekday' }}</td>
                    <td class="hide-mobile"><span class="muted">{{ 'pm.' + e.paymentMethod | t }}</span></td>
                    <td class="text-right nowrap num cell-amount"><b>{{ e.amount | money: auth.currency() }}</b></td>
                    <td class="actions">
                      <button class="icon-btn" [title]="'common.edit' | t" (click)="openForm(e)"><app-icon name="pencil" [size]="16" /></button>
                      <button class="icon-btn danger" [title]="'common.delete' | t" (click)="toDelete.set(e)"><app-icon name="trash" [size]="16" /></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">
            <div class="empty-icon"><app-icon name="receipt" [size]="22" /></div>
            <h4>{{ 'expenses.noneFound' | t }}</h4>
            <p>{{ (search() || categoryId() ? 'expenses.tryFilter' : 'expenses.addFirst') | t }}</p>
          </div>
        }
      </div>
    </div>

    @if (formOpen()) {
      <app-expense-form [expense]="editing()" [month]="month()" (closed)="formOpen.set(false)" (saved)="flash($event.id)" />
    }
    @if (toDelete(); as e) {
      <app-confirm [title]="'expenses.deleteTitle' | t" [message]="'expenses.deleteMsg' | t: { name: e.description }" [confirmLabel]="'common.delete' | t"
                   (confirm)="remove(e)" (cancel)="toDelete.set(null)" />
    }
  `,
  styles: [`
    .total-strip { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .total { font-size: 26px; font-weight: 600; letter-spacing: -.02em; margin-top: 2px; }
    @media (max-width: 760px) { .cat-filter { width: 100%; } .header-actions { width: 100%; } }
    .filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .search { flex: 1; min-width: 220px; position: relative; }
    .search app-icon { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim); }
    .search .input { padding-inline-start: 36px; }
    .cat-filter { width: 230px; }
    tr.flash { animation: flash 1.6s ease; }
    @keyframes flash { 0%, 40% { background: var(--primary-soft); } }
  `],
})
export class ExpensesComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private realtime = inject(RealtimeService);
  readonly auth = inject(AuthService);

  readonly month = signal(Months.current());
  readonly search = signal('');
  readonly search$ = new Subject<string>();
  readonly categoryId = signal<number | null>(null);
  readonly expenses = signal<Expense[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly editing = signal<Expense | null>(null);
  readonly toDelete = signal<Expense | null>(null);
  readonly flashId = signal<number | null>(null);

  readonly total = computed(() => this.expenses().reduce((s, e) => s + e.amount, 0));
  private i18n = inject(I18nService);
  readonly monthLabel = computed(() => {
    this.i18n.lang();
    return Months.label(this.month());
  });

  constructor() {
    this.api.categories().subscribe((c) => this.categories.set(c));
    this.search$.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((q) => this.search.set(q));

    effect(() => {
      this.month();
      this.search();
      this.categoryId();
      untracked(() => this.load(true));
    });

    this.realtime.on('EXPENSES_CHANGED', 'CATEGORIES_CHANGED').pipe(debounceTime(200), takeUntilDestroyed()).subscribe((e) => {
      this.load(false);
      if (e.type === 'CATEGORIES_CHANGED') this.api.categories().subscribe((c) => this.categories.set(c));
      if (e.payload?.id) this.flash(e.payload.id);
    });
  }

  load(showSpinner: boolean) {
    if (showSpinner) this.loading.set(true);
    this.api.expenses(this.month(), this.categoryId(), this.search()).subscribe({
      next: (list) => {
        this.expenses.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(e: Expense | null) {
    this.editing.set(e);
    this.formOpen.set(true);
  }

  flash(id: number) {
    this.flashId.set(id);
    setTimeout(() => this.flashId.set(null), 1600);
  }

  remove(e: Expense) {
    this.toDelete.set(null);
    this.api.deleteExpense(e.id).subscribe({
      next: () => {
        this.expenses.update((l) => l.filter((x) => x.id !== e.id));
        this.toast.success(t('expenses.deleted'));
      },
      error: (err) => this.toast.error(t('common.couldNotDelete'), errorMessage(err)),
    });
  }


  exportCsv() {
    const rows = [tList('expenses.csvHeaders')];
    for (const e of this.expenses()) {
      rows.push([e.date, e.description, catName(e.category.name), t(`pm.${e.paymentMethod}`), e.amount.toFixed(2), this.auth.currency()]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `expenses-${this.month()}.csv`);
  }
}
