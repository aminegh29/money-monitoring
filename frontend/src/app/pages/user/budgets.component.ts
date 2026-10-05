import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { Budget, Category } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { Months, ToastService } from '../../core/ui.service';
import { ConfirmComponent, ModalComponent } from '../../shared/modal.component';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { MoneyPipe } from '../../shared/pipes';
import { CategoryNamePipe, I18nService, t, TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-budgets',
  imports: [IconComponent, ReactiveFormsModule, MonthPickerComponent, MoneyPipe, ModalComponent, ConfirmComponent, TranslatePipe, CategoryNamePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'budgets.title' | t }}</h1>
          <p>{{ 'budgets.subtitle' | t }}</p>
        </div>
        <div class="header-actions">
          <app-month-picker [(month)]="month" />
          <button class="btn" (click)="copyPrevious()"><app-icon name="copy" [size]="16" />{{ 'budgets.copy' | t }}</button>
          <button class="btn btn-primary" (click)="open(null)"><app-icon name="plus" [size]="16" />{{ 'budgets.new' | t }}</button>
        </div>
      </div>

      @if (overall(); as o) {
        <div class="card overall">
          <div class="row-between">
            <div>
              <div class="muted small">{{ 'budgets.overallTitle' | t }}</div>
              <div class="big">{{ o.spent | money: cur() }} <span class="muted">/ {{ o.limitAmount | money: cur() }}</span></div>
            </div>
            <div class="ring" [style.--p]="o.percent > 100 ? 100 : o.percent" [style.--c]="color(o.percent)"><span>{{ o.percent }}%</span></div>
          </div>
          <div class="progress lg"><div [style.width.%]="o.percent > 100 ? 100 : o.percent" [style.background]="color(o.percent)"></div></div>
          <div class="row-between small">
            <span [class]="o.remaining < 0 ? 'text-danger' : 'muted'">{{ (o.remaining < 0 ? 'budgets.overBy' : 'budgets.remaining') | t: { amount: (abs(o.remaining) | money: cur()) } }}</span>
            <span>
              <button class="icon-btn" [title]="'common.edit' | t" (click)="open(o)"><app-icon name="pencil" [size]="16" /></button>
              <button class="icon-btn danger" [title]="'common.delete' | t" (click)="toDelete.set(o)"><app-icon name="trash" [size]="16" /></button>
            </span>
          </div>
        </div>
      }

      <div class="grid grid-3 mt">
        @for (b of categoryBudgets(); track b.id) {
          <div class="card budget" [class.over]="b.percent >= 100">
            <div class="row-between">
              <span class="cat-chip"><span class="cat-dot" [style.background]="b.category!.color + '22'">{{ b.category!.icon }}</span><b>{{ b.category!.name | cat }}</b></span>
              <span class="badge" [class.badge-danger]="b.percent >= 100" [class.badge-warning]="b.percent >= 80 && b.percent < 100" [class.badge-success]="b.percent < 80">{{ b.percent }}%</span>
            </div>
            <div class="amounts"><b>{{ b.spent | money: cur() }}</b> <span class="muted">{{ 'budgets.of' | t: { amount: (b.limitAmount | money: cur()) } }}</span></div>
            <div class="progress"><div [style.width.%]="b.percent > 100 ? 100 : b.percent" [style.background]="color(b.percent)"></div></div>
            <div class="row-between small foot">
              <span [class]="b.remaining < 0 ? 'text-danger' : 'muted'">{{ (b.remaining < 0 ? 'budgets.overBy' : 'budgets.left') | t: { amount: (abs(b.remaining) | money: cur()) } }}</span>
              <span>
                <button class="icon-btn" [title]="'common.edit' | t" (click)="open(b)"><app-icon name="pencil" [size]="16" /></button>
                <button class="icon-btn danger" [title]="'common.delete' | t" (click)="toDelete.set(b)"><app-icon name="trash" [size]="16" /></button>
              </span>
            </div>
          </div>
        }
      </div>

      @if (!budgets().length) {
        <div class="card empty-state">
          <div class="empty-icon"><app-icon name="gauge" [size]="22" /></div>
          <h4>{{ 'budgets.none' | t: { month: monthLabel() } }}</h4>
          <p>{{ 'budgets.noneHint' | t }}</p>
          <button class="btn btn-primary mt" (click)="open(null)">{{ 'budgets.create' | t }}</button>
        </div>
      }
    </div>

    @if (formOpen()) {
      <app-modal [title]="(editing() ? 'budgets.editTitle' : 'budgets.new') | t" (closed)="formOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-field">
            <label>{{ 'common.category' | t }}</label>
            <select class="input" formControlName="categoryId">
              <option [ngValue]="null">{{ 'budgets.overallChip' | t }}</option>
              @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.icon }} {{ c.name | cat }}</option> }
            </select>
          </div>
          <div class="form-field">
            <label>{{ 'budgets.limit' | t: { cur: cur() } }}</label>
            <input class="input" type="number" step="0.01" formControlName="limitAmount" [placeholder]="'budgets.limitPlaceholder' | t" />
          </div>
          <p class="muted small">{{ 'budgets.appliesTo' | t: { month: monthLabel() } }}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="formOpen.set(false)">{{ 'common.cancel' | t }}</button>
            <button class="btn btn-primary" [disabled]="form.invalid">{{ 'budgets.saveBtn' | t }}</button>
          </div>
        </form>
      </app-modal>
    }
    @if (toDelete(); as b) {
      <app-confirm [title]="'budgets.deleteTitle' | t" [message]="'budgets.deleteMsg' | t: { name: b.category ? (b.category.name | cat) : ('budgets.overallName' | t) }" [confirmLabel]="'common.delete' | t"
                   (confirm)="remove(b)" (cancel)="toDelete.set(null)" />
    }
  `,
  styles: [`
    .overall { display: grid; gap: 14px; }
    .big { font-size: 26px; font-weight: 600; letter-spacing: -.02em; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .big .muted { font-size: 15px; font-weight: 500; }
    .progress.lg { height: 8px; }
    .ring { --p: 0; width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center;
      background: conic-gradient(var(--c) calc(var(--p) * 1%), var(--surface-3) 0); }
    .ring span { width: 60px; height: 60px; border-radius: 50%; background: var(--surface-solid); display: grid; place-items: center; font-weight: 600; font-size: 13px; }
    .budget { display: grid; gap: 10px; }
    .budget.over { border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); }
    .amounts { font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .amounts .muted { font-size: 14px; margin-inline-start: 6px; }
    .big .muted { margin-inline-start: 6px; }
    .foot { margin-top: -4px; }
  `],
})
export class BudgetsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly month = signal(Months.current());
  readonly budgets = signal<Budget[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly formOpen = signal(false);
  readonly editing = signal<Budget | null>(null);
  readonly toDelete = signal<Budget | null>(null);

  readonly cur = this.auth.currency;
  readonly overall = computed(() => this.budgets().find((b) => !b.category) ?? null);
  readonly categoryBudgets = computed(() => this.budgets().filter((b) => !!b.category));
  private i18n = inject(I18nService);
  readonly monthLabel = computed(() => {
    this.i18n.lang();
    return Months.label(this.month());
  });

  readonly form = this.fb.group({
    categoryId: [null as number | null],
    limitAmount: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.api.categories().subscribe((c) => this.categories.set(c));
    effect(() => {
      this.month();
      untracked(() => this.load());
    });
    inject(RealtimeService).on('BUDGETS_CHANGED', 'EXPENSES_CHANGED').pipe(debounceTime(200), takeUntilDestroyed()).subscribe(() => this.load());
  }

  load() {
    this.api.budgets(this.month()).subscribe((b) => this.budgets.set(b));
  }

  open(b: Budget | null) {
    this.editing.set(b);
    this.form.reset({ categoryId: b?.category?.id ?? null, limitAmount: b?.limitAmount ?? null });
    if (b) this.form.controls.categoryId.disable();
    else this.form.controls.categoryId.enable();
    this.formOpen.set(true);
  }

  save() {
    const v = this.form.getRawValue();
    this.api.saveBudget({ categoryId: v.categoryId, period: this.month(), limitAmount: Number(v.limitAmount) }).subscribe({
      next: () => {
        this.toast.success(t('budgets.saved'));
        this.formOpen.set(false);
        this.load();
      },
      error: (err) => this.toast.error(t('common.couldNotSave'), errorMessage(err)),
    });
  }

  copyPrevious() {
    this.api.copyBudgets(this.month()).subscribe((b) => {
      this.budgets.set(b);
      this.toast.info(t(b.length ? 'budgets.copied' : 'budgets.noneLast'));
    });
  }

  remove(b: Budget) {
    this.toDelete.set(null);
    this.api.deleteBudget(b.id).subscribe(() => {
      this.toast.success(t('budgets.deleted'));
      this.load();
    });
  }

  color(p: number) {
    return p >= 100 ? 'var(--danger)' : p >= 80 ? 'var(--warning)' : 'var(--success)';
  }

  abs(n: number) {
    return Math.abs(n);
  }
}
