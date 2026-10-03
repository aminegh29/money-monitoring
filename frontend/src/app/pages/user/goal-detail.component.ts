import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { I18nService, t, TranslatePipe } from '../../core/i18n';
import { Advice, Deposit, Goal } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { Months, ToastService } from '../../core/ui.service';
import { RingComponent } from '../../shared/fx';
import { GoalFormComponent } from '../../shared/goal-form.component';
import { goalTone } from '../../shared/goals';
import { ConfirmComponent, ModalComponent } from '../../shared/modal.component';
import { LocalDatePipe, MarkdownPipe, MoneyPipe, TimeAgoPipe } from '../../shared/pipes';

@Component({
  selector: 'app-goal-detail',
  imports: [ReactiveFormsModule, RouterLink, RingComponent, GoalFormComponent, ModalComponent, ConfirmComponent,
    MoneyPipe, LocalDatePipe, MarkdownPipe, TimeAgoPipe, DecimalPipe, TranslatePipe],
  template: `
    <div class="page">
      <a routerLink="/app/goals" class="small back">{{ rtl() ? '→' : '←' }} {{ 'goals.title' | t }}</a>

      @if (goal(); as g) {
        <div class="page-header">
          <div>
            <h1>{{ g.icon }} {{ g.name }}</h1>
            <span [class]="'badge badge-' + tone()">{{ 'goals.status.' + g.status | t }}</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-ghost" (click)="editOpen.set(true)">✏️ {{ 'common.edit' | t }}</button>
            <button class="btn btn-ghost danger" (click)="confirmDelete.set(true)">🗑️ {{ 'common.delete' | t }}</button>
            <button class="btn btn-primary" (click)="depositOpen.set(true)">＋ {{ 'goals.addDeposit' | t }}</button>
          </div>
        </div>

        <div class="grid grid-3">
          <section class="card hero span-2">
            <app-ring [value]="g.percent" [size]="150">
              <div class="ring-value num">{{ g.percent | number: '1.0-0' }}%</div>
            </app-ring>
            <div class="hero-text">
              <div class="big num">{{ g.savedAmount | money: cur() }}</div>
              <div class="muted">{{ 'budgets.of' | t: { amount: (g.targetAmount | money: cur()) } }}</div>
              <div class="dim small">{{ 'goals.by' | t: { date: (g.deadline | date2) } }}</div>
              <div class="stats">
                <div><span class="muted small">{{ 'goals.remaining' | t }}</span><b class="num">{{ g.remaining | money: cur() }}</b></div>
                <div><span class="muted small">{{ 'goals.monthsLeft' | t: { n: g.monthsLeft } }}</span><b class="num">{{ g.deadline | date2 }}</b></div>
                <div><span class="muted small">{{ 'goals.required' | t }}</span><b class="num accent">{{ g.requiredPerMonth | money: cur() }}</b></div>
                <div><span class="muted small">{{ 'goals.average' | t }}</span>
                  <b class="num" [class.text-success]="g.averageMonthlySavings >= g.requiredPerMonth" [class.text-warning]="g.averageMonthlySavings < g.requiredPerMonth">
                    {{ g.averageMonthlySavings | money: cur() }}</b></div>
                <div><span class="muted small">{{ 'goals.projected' | t }}</span><b class="num">{{ g.projectedAmount | money: cur() }}</b></div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-header"><h3>{{ 'web.goals.tracking' | t }}</h3></div>
            <p class="muted small">
              {{ g.trackingMode === 'MANUAL'
                ? ('goals.trackingManual' | t: { n: g.depositsCount })
                : ('goals.trackingAuto' | t: { date: (g.startDate | date2) }) }}
            </p>
            <div class="card-header mt"><h3>{{ 'goals.deposits' | t }}</h3></div>
            @for (d of deposits(); track d.id) {
              <div class="deposit">
                <div><b class="text-success num">+{{ d.amount | money: cur() }}</b>
                  <div class="dim small">{{ d.date | date2 }}{{ d.note ? ' · ' + d.note : '' }}</div></div>
                <button class="icon-btn danger" [title]="'common.delete' | t" (click)="depositToDelete.set(d)">🗑️</button>
              </div>
            } @empty {
              <p class="muted small">{{ 'goals.noDeposits' | t }}</p>
            }
          </section>
        </div>

        <section class="card ai mt">
          <div class="card-header">
            <h3><span class="gradient-text">{{ 'goals.aiPlan' | t }}</span></h3>
            <button class="btn btn-ghost btn-sm" (click)="loadPlan(true)" [disabled]="planLoading()">↻ {{ 'common.regenerate' | t }}</button>
          </div>
          @if (planLoading()) {
            <div class="thinking"><div class="orb"></div><p><b>{{ 'advisor.analysing' | t }}</b></p></div>
          } @else if (plan()) {
            <div class="markdown" [innerHTML]="plan()!.content | markdown"></div>
            <div class="meta muted small">
              {{ 'advisor.generated' | t: { when: (plan()!.createdAt | timeAgo), source: plan()!.source === 'rules' ? ('advisor.builtIn' | t) : plan()!.source } }}
            </div>
          } @else if (planError()) {
            <div class="alert alert-error">{{ planError() }}</div>
          }
        </section>
      } @else if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      } @else {
        <div class="loading-box"><span class="spinner lg"></span></div>
      }
    </div>

    @if (editOpen()) {
      <app-goal-form [goal]="goal()" (closed)="editOpen.set(false)" (saved)="onSaved($event)" />
    }

    @if (depositOpen()) {
      <app-modal [title]="'goals.addDeposit' | t" (closed)="depositOpen.set(false)">
        <form [formGroup]="depositForm" (ngSubmit)="addDeposit()">
          <div class="form-row">
            <div class="form-field">
              <label>{{ 'common.amountIn' | t: { cur: cur() } }}</label>
              <input class="input" type="number" min="0.01" step="0.01" formControlName="amount" placeholder="0.00" autofocus />
            </div>
            <div class="form-field">
              <label>{{ 'common.date' | t }}</label>
              <input class="input" type="date" formControlName="date" [max]="today" />
            </div>
          </div>
          <div class="form-field">
            <label>{{ 'goals.note' | t }}</label>
            <input class="input" formControlName="note" maxlength="120" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="depositOpen.set(false)">{{ 'common.cancel' | t }}</button>
            <button class="btn btn-primary" [disabled]="depositForm.invalid || saving()">{{ 'common.save' | t }}</button>
          </div>
        </form>
      </app-modal>
    }

    @if (confirmDelete()) {
      <app-confirm [title]="'goals.deleteTitle' | t" [message]="'goals.deleteMsg' | t: { name: goal()?.name ?? '' }"
                   [confirmLabel]="'common.delete' | t" (confirm)="remove()" (cancel)="confirmDelete.set(false)" />
    }
    @if (depositToDelete(); as d) {
      <app-confirm [title]="'goals.depositDeleteTitle' | t" [message]="'goals.depositDeleteMsg' | t: { amount: (d.amount | money: cur()), date: (d.date | date2) }"
                   [confirmLabel]="'common.delete' | t" (confirm)="removeDeposit(d)" (cancel)="depositToDelete.set(null)" />
    }
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; }
    .page-header h1 { margin-bottom: 6px; }
    .hero { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; background-image: var(--gradient-soft); }
    .ring-value { font-size: 28px; font-weight: 700; }
    .hero-text { flex: 1; min-width: 240px; display: grid; gap: 4px; }
    .big { font-family: var(--font-display); font-size: 34px; font-weight: 700; letter-spacing: -.03em; }
    .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; margin-top: 14px; }
    .stats div { display: grid; gap: 2px; }
    .accent { color: var(--primary-text); }
    .deposit { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid var(--border); }
    .ai { border-color: color-mix(in srgb, var(--violet) 30%, var(--border)); }
    .meta { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); }
    .thinking { text-align: center; padding: 40px 10px; display: grid; gap: 6px; justify-items: center; }
    .orb { width: 54px; height: 54px; border-radius: 50%; background: var(--gradient); animation: breathe 1.4s ease-in-out infinite; }
    @keyframes breathe { 50% { transform: scale(.82); opacity: .7; } }
    .danger { color: var(--danger); }
  `],
})
export class GoalDetailComponent {
  /** Route parameter (/app/goals/:id). */
  readonly id = input.required<string>();

  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private i18n = inject(I18nService);
  readonly cur = inject(AuthService).currency;

  readonly goal = signal<Goal | null>(null);
  readonly deposits = signal<Deposit[]>([]);
  readonly plan = signal<Advice | null>(null);
  readonly planLoading = signal(false);
  readonly planError = signal('');
  readonly error = signal('');
  readonly editOpen = signal(false);
  readonly depositOpen = signal(false);
  readonly confirmDelete = signal(false);
  readonly depositToDelete = signal<Deposit | null>(null);
  readonly saving = signal(false);
  readonly today = Months.today();
  readonly tone = computed(() => goalTone(this.goal()?.status ?? 'ON_TRACK'));
  readonly rtl = computed(() => this.i18n.lang() === 'ar');

  readonly depositForm = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    date: [Months.today(), Validators.required],
    note: [''],
  });

  constructor() {
    effect(() => {
      this.id();
      untracked(() => this.load());
    });
    // The plan is generated in the account language: reload it when the language changes.
    effect(() => {
      this.i18n.lang();
      this.id();
      untracked(() => this.loadPlan(false));
    });
    inject(RealtimeService)
      .on('GOALS_CHANGED', 'EXPENSES_CHANGED', 'INCOMES_CHANGED')
      .pipe(debounceTime(400), takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  private get goalId() {
    return Number(this.id());
  }

  load() {
    this.api.goal(this.goalId).subscribe({
      next: (g) => this.goal.set(g),
      error: (err) => this.error.set(errorMessage(err)),
    });
    this.api.deposits(this.goalId).subscribe((d) => this.deposits.set(d));
  }

  loadPlan(refresh: boolean) {
    this.planLoading.set(true);
    this.planError.set('');
    this.api.goalPlan(this.goalId, refresh).subscribe({
      next: (p) => {
        this.plan.set(p);
        this.planLoading.set(false);
      },
      error: (err) => {
        this.planError.set(errorMessage(err));
        this.planLoading.set(false);
      },
    });
  }

  onSaved(g: Goal) {
    this.goal.set(g);
    this.loadPlan(false);
  }

  addDeposit() {
    const v = this.depositForm.getRawValue();
    this.saving.set(true);
    this.api.addDeposit(this.goalId, { amount: Number(v.amount), date: v.date, note: v.note.trim() }).subscribe({
      next: (g) => {
        this.goal.set(g);
        this.toast.success(t('goals.depositAdded'), `${g.icon} ${g.name}: ${Math.round(g.percent)}%`);
        this.depositOpen.set(false);
        this.saving.set(false);
        this.depositForm.reset({ amount: null, date: Months.today(), note: '' });
        this.api.deposits(this.goalId).subscribe((d) => this.deposits.set(d));
        this.loadPlan(false);
      },
      error: (err) => {
        this.toast.error(t('common.couldNotSave'), errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  removeDeposit(d: Deposit) {
    this.depositToDelete.set(null);
    this.api.deleteDeposit(this.goalId, d.id).subscribe({
      next: (g) => {
        this.goal.set(g);
        this.deposits.update((l) => l.filter((x) => x.id !== d.id));
        this.loadPlan(false);
      },
      error: (err) => this.toast.error(t('common.couldNotDelete'), errorMessage(err)),
    });
  }

  remove() {
    this.confirmDelete.set(false);
    this.api.deleteGoal(this.goalId).subscribe({
      next: () => {
        this.toast.success(t('goals.deleted'));
        this.router.navigateByUrl('/app/goals');
      },
      error: (err) => this.toast.error(t('common.couldNotDelete'), errorMessage(err)),
    });
  }
}
