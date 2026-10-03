import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { CategoryNamePipe, t, TranslatePipe } from '../core/i18n';
import { Category, Expense, PAYMENT_METHODS } from '../core/models';
import { Months, ToastService } from '../core/ui.service';
import { ModalComponent } from './modal.component';
import { Native } from '../core/native';

@Component({
  selector: 'app-expense-form',
  imports: [ReactiveFormsModule, ModalComponent, TranslatePipe, CategoryNamePipe],
  template: `
    <app-modal [title]="(expense() ? 'expenses.editTitle' : 'expenses.newTitle') | t" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

        <div class="form-field">
          <label for="amount">{{ 'common.amountIn' | t: { cur: auth.currency() } }}</label>
          <input id="amount" class="input amount-input" type="number" step="0.01" min="0.01" formControlName="amount" placeholder="0.00" autofocus
                 [class.invalid]="invalid('amount')" />
          @if (invalid('amount')) { <span class="field-error">{{ 'expenses.amountError' | t }}</span> }
        </div>

        <div class="form-field">
          <label>{{ 'common.category' | t }}</label>
          <div class="cat-grid">
            @for (c of categories(); track c.id) {
              <button type="button" class="cat-option" [class.selected]="form.value.categoryId === c.id"
                      [style.--c]="c.color" (click)="form.patchValue({ categoryId: c.id })">
                <span>{{ c.icon }}</span>{{ c.name | cat }}
              </button>
            }
          </div>
          @if (invalid('categoryId')) { <span class="field-error">{{ 'expenses.categoryError' | t }}</span> }
        </div>

        <div class="form-field">
          <label for="description">{{ 'common.description' | t }}</label>
          <input id="description" class="input" formControlName="description" [placeholder]="'expenses.descPlaceholder' | t" maxlength="200"
                 [class.invalid]="invalid('description')" />
          @if (invalid('description')) { <span class="field-error">{{ 'expenses.descriptionError' | t }}</span> }
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="date">{{ 'common.date' | t }}</label>
            <input id="date" class="input" type="date" formControlName="date" [max]="today" />
          </div>
          <div class="form-field">
            <label for="method">{{ 'expenses.paymentMethod' | t }}</label>
            <select id="method" class="input" formControlName="paymentMethod">
              @for (m of methods; track m.value) { <option [value]="m.value">{{ m.icon }} {{ 'pm.' + m.value | t }}</option> }
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | t }}</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner"></span> } {{ (expense() ? 'expenses.saveChanges' : 'expenses.add') | t }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    .amount-input { height: 64px; font-family: var(--font-display); font-size: 30px; font-weight: 700; text-align: center; letter-spacing: -.02em; }
    .cat-grid { display: flex; flex-wrap: wrap; gap: 7px; max-height: 170px; overflow-y: auto; padding: 2px; }
    .cat-option { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text);
      border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; transition: all .12s; }
    .cat-option:hover { border-color: var(--c); }
    .cat-option.selected { border-color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); font-weight: 600; box-shadow: 0 0 0 1px var(--c), 0 0 16px color-mix(in srgb, var(--c) 50%, transparent); }
  `],
})
export class ExpenseFormComponent implements OnInit {
  readonly expense = input<Expense | null>(null);
  readonly month = input<string>(Months.current());
  readonly closed = output<void>();
  readonly saved = output<Expense>();

  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly methods = PAYMENT_METHODS;
  readonly today = Months.today();
  readonly categories = signal<Category[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');
  submitted = false;

  readonly form = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    categoryId: [null as number | null, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    date: [Months.today(), Validators.required],
    paymentMethod: ['CARD', Validators.required],
  });

  ngOnInit() {
    this.api.categories().subscribe((c) => this.categories.set(c));
    const e = this.expense();
    if (e) {
      this.form.patchValue({ amount: e.amount, categoryId: e.category.id, description: e.description, date: e.date, paymentMethod: e.paymentMethod });
    } else {
      this.form.patchValue({ date: Months.defaultDate(this.month()) });
    }
  }

  invalid(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  submit() {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const body = { amount: Number(v.amount), categoryId: v.categoryId!, description: v.description, date: v.date, paymentMethod: v.paymentMethod as any };
    const e = this.expense();
    const req = e ? this.api.updateExpense(e.id, body) : this.api.createExpense(body);
    req.subscribe({
      next: (saved) => {
        this.toast.success(t(e ? 'expenses.updated' : 'expenses.added'), `${saved.category.icon} ${saved.description}`);
        Native.success();
        this.saved.emit(saved);
        this.closed.emit();
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
