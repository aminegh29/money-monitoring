import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { CategoryNamePipe, t, TranslatePipe } from '../../core/i18n';
import { Category } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { ToastService } from '../../core/ui.service';
import { ConfirmComponent, ModalComponent } from '../../shared/modal.component';

const ICONS = ['🏷️', '🐶', '🎮', '⚽', '🎵', '🍷', '☕', '👶', '🚌', '⛽', '🏋️', '💻', '🧴', '🎓', '🏥', '🧾', '💼', '🪴', '🛠️', '🎨'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

@Component({
  selector: 'app-categories',
  imports: [ReactiveFormsModule, ModalComponent, ConfirmComponent, TranslatePipe, CategoryNamePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'categories.title' | t }}</h1>
          <p>{{ 'categories.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary" (click)="open(null)">＋ {{ 'categories.new' | t }}</button>
      </div>

      @if (custom().length) {
        <h3 class="section-title">{{ 'categories.yours' | t }}</h3>
        <div class="cat-grid">
          @for (c of custom(); track c.id) {
            <div class="card cat">
              <span class="cat-dot big" [style.background]="c.color + '22'">{{ c.icon }}</span>
              <div class="info"><b>{{ c.name }}</b><span class="badge" [class.badge-primary]="c.essential">{{ (c.essential ? 'categories.essential' : 'categories.nonEssential') | t }}</span></div>
              <div class="acts">
                <button class="icon-btn" [title]="'common.edit' | t" (click)="open(c)">✏️</button>
                <button class="icon-btn danger" [title]="'common.delete' | t" (click)="toDelete.set(c)">🗑️</button>
              </div>
            </div>
          }
        </div>
      }

      <h3 class="section-title">{{ 'categories.defaults' | t }}</h3>
      <div class="cat-grid">
        @for (c of defaults(); track c.id) {
          <div class="card cat">
            <span class="cat-dot big" [style.background]="c.color + '22'">{{ c.icon }}</span>
            <div class="info"><b>{{ c.name | cat }}</b><span class="badge" [class.badge-primary]="c.essential">{{ (c.essential ? 'categories.essential' : 'categories.nonEssential') | t }}</span></div>
          </div>
        }
      </div>
      <p class="muted small mt">{{ 'categories.hint' | t }}</p>
    </div>

    @if (formOpen()) {
      <app-modal [title]="(editing() ? 'categories.editTitle' : 'categories.new') | t" (closed)="formOpen.set(false)">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-field">
            <label>{{ 'categories.name' | t }}</label>
            <input class="input" formControlName="name" [placeholder]="'categories.namePlaceholder' | t" maxlength="50" />
          </div>
          <div class="form-field">
            <label>{{ 'categories.icon' | t }}</label>
            <div class="picker">
              @for (i of icons; track i) {
                <button type="button" class="pick" [class.sel]="form.value.icon === i" (click)="form.patchValue({ icon: i })">{{ i }}</button>
              }
            </div>
          </div>
          <div class="form-field">
            <label>{{ 'categories.color' | t }}</label>
            <div class="picker">
              @for (c of colors; track c) {
                <button type="button" class="swatch" [style.background]="c" [class.sel]="form.value.color === c" (click)="form.patchValue({ color: c })"></button>
              }
            </div>
          </div>
          <label class="checkbox"><input type="checkbox" formControlName="essential" /> {{ 'categories.essentialToggle' | t }}</label>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="formOpen.set(false)">{{ 'common.cancel' | t }}</button>
            <button class="btn btn-primary" [disabled]="form.invalid">{{ 'common.save' | t }}</button>
          </div>
        </form>
      </app-modal>
    }
    @if (toDelete(); as c) {
      <app-confirm [title]="'categories.deleteTitle' | t" [message]="'categories.deleteMsg' | t: { name: c.name }" [confirmLabel]="'common.delete' | t"
                   (confirm)="remove(c)" (cancel)="toDelete.set(null)" />
    }
  `,
  styles: [`
    .section-title { font-size: 15px; margin: 8px 0 14px; color: var(--text-muted); font-weight: 600; }
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; margin-bottom: 26px; }
    .cat { display: flex; align-items: center; gap: 14px; padding: 16px; }
    .cat-dot.big { width: 44px; height: 44px; font-size: 21px; border-radius: 13px; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 5px; align-items: flex-start; min-width: 0; }
    .acts { display: flex; }
    .picker { display: flex; flex-wrap: wrap; gap: 7px; }
    .pick { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: 18px; cursor: pointer; }
    .pick.sel { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
    .swatch { width: 30px; height: 30px; border-radius: 50%; border: 3px solid var(--surface); cursor: pointer; box-shadow: 0 0 0 1px var(--border); }
    .swatch.sel { box-shadow: 0 0 0 2px var(--text); }
  `],
})
export class CategoriesComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly icons = ICONS;
  readonly colors = COLORS;
  readonly categories = signal<Category[]>([]);
  readonly custom = computed(() => this.categories().filter((c) => c.custom));
  readonly defaults = computed(() => this.categories().filter((c) => !c.custom));
  readonly formOpen = signal(false);
  readonly editing = signal<Category | null>(null);
  readonly toDelete = signal<Category | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    icon: [ICONS[0]],
    color: [COLORS[0]],
    essential: [false],
  });

  constructor() {
    this.load();
    inject(RealtimeService).on('CATEGORIES_CHANGED').pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  load() {
    this.api.categories().subscribe((c) => this.categories.set(c));
  }

  open(c: Category | null) {
    this.editing.set(c);
    this.form.reset(c ? { name: c.name, icon: c.icon, color: c.color, essential: c.essential } : { name: '', icon: ICONS[0], color: COLORS[0], essential: false });
    this.formOpen.set(true);
  }

  save() {
    const body = this.form.getRawValue();
    const c = this.editing();
    (c ? this.api.updateCategory(c.id, body) : this.api.createCategory(body)).subscribe({
      next: () => {
        this.toast.success(t(c ? 'categories.updated' : 'categories.created'));
        this.formOpen.set(false);
        this.load();
      },
      error: (err) => this.toast.error(t('common.couldNotSave'), errorMessage(err)),
    });
  }

  remove(c: Category) {
    this.toDelete.set(null);
    this.api.deleteCategory(c.id).subscribe({
      next: () => {
        this.toast.success(t('categories.deleted'));
        this.load();
      },
      error: (err) => this.toast.error(t('common.couldNotDelete'), errorMessage(err)),
    });
  }
}
