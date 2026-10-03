import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { t, TranslatePipe } from '../core/i18n';
import { Goal } from '../core/models';
import { Months, ToastService } from '../core/ui.service';
import { GOAL_ICONS } from './goals';
import { ModalComponent } from './modal.component';

const QUICK_MONTHS = [3, 6, 10, 12, 24];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Create / edit form for a goal, in a modal. */
@Component({
  selector: 'app-goal-form',
  imports: [ReactiveFormsModule, ModalComponent, TranslatePipe],
  template: `
    <app-modal [title]="(goal() ? 'goals.editTitle' : 'goals.newTitle') | t" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="save()">
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <div class="form-field">
          <label>{{ 'goals.name' | t }}</label>
          <input class="input" formControlName="name" [placeholder]="'goals.namePlaceholder' | t" maxlength="80" />
          @if (invalid('name')) { <span class="field-error">{{ 'goals.nameError' | t }}</span> }
        </div>
        <div class="form-field">
          <label>{{ 'goals.icon' | t }}</label>
          <div class="picker">
            @for (i of icons; track i) {
              <button type="button" class="pick" [class.sel]="form.value.icon === i" (click)="form.patchValue({ icon: i })">{{ i }}</button>
            }
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>{{ 'goals.target' | t: { cur: cur() } }}</label>
            <input class="input" type="number" min="1" step="0.01" formControlName="targetAmount" placeholder="5000" />
            @if (invalid('targetAmount')) { <span class="field-error">{{ 'goals.targetError' | t }}</span> }
          </div>
          <div class="form-field">
            <label>{{ 'goals.initial' | t: { cur: cur() } }}</label>
            <input class="input" type="number" min="0" step="0.01" formControlName="initialAmount" placeholder="0" />
          </div>
        </div>
        <div class="form-field">
          <label>{{ 'goals.deadline' | t }}</label>
          <div class="quick">
            @for (n of quick; track n) {
              <button type="button" class="chip" [class.sel]="form.value.deadline === inMonths(n)" (click)="form.patchValue({ deadline: inMonths(n) })">
                {{ 'goals.inMonths' | t: { n } }}
              </button>
            }
          </div>
          <input class="input" type="date" formControlName="deadline" [min]="tomorrow" />
          @if (deadlinePast()) { <span class="field-error">{{ 'goals.deadlineError' | t }}</span> }
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">{{ 'common.cancel' | t }}</button>
          <button class="btn btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner"></span> } {{ 'common.save' | t }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    .picker, .quick { display: flex; flex-wrap: wrap; gap: 7px; }
    .quick { margin-bottom: 10px; }
    .pick { width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 18px; cursor: pointer; }
    .pick.sel { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
    .chip { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; }
    .chip.sel { border-color: var(--primary); background: var(--primary-soft); font-weight: 600; }
  `],
})
export class GoalFormComponent {
  readonly goal = input<Goal | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Goal>();

  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  readonly cur = inject(AuthService).currency;

  readonly icons = GOAL_ICONS;
  readonly quick = QUICK_MONTHS;
  readonly tomorrow = tomorrow();
  readonly saving = signal(false);
  readonly error = signal('');
  submitted = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    icon: [GOAL_ICONS[0]],
    targetAmount: [null as number | null, [Validators.required, Validators.min(1)]],
    initialAmount: [null as number | null, Validators.min(0)],
    deadline: [Months.addMonths(10), Validators.required],
  });

  constructor() {
    effect(() => {
      const g = this.goal();
      if (g) {
        this.form.reset({ name: g.name, icon: g.icon, targetAmount: g.targetAmount, initialAmount: g.initialAmount || null, deadline: g.deadline });
      }
    });
  }

  inMonths(n: number) {
    return Months.addMonths(n);
  }

  invalid(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  deadlinePast() {
    return this.submitted && this.form.value.deadline! <= Months.today();
  }

  save() {
    this.submitted = true;
    if (this.form.invalid || this.deadlinePast()) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const body = { name: v.name.trim(), icon: v.icon, targetAmount: Number(v.targetAmount), initialAmount: Number(v.initialAmount ?? 0), deadline: v.deadline };
    const g = this.goal();
    (g ? this.api.updateGoal(g.id, body) : this.api.createGoal(body)).subscribe({
      next: (saved) => {
        this.toast.success(t(g ? 'goals.updated' : 'goals.created'), `${saved.icon} ${saved.name}`);
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
