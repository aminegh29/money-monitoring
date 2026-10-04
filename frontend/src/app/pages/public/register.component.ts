import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { I18nService, t, tList, TranslatePipe } from '../../core/i18n';
import { CURRENCIES } from '../../core/models';
import { ToastService } from '../../core/ui.service';
import { AuthLayoutComponent } from './auth-layout.component';

export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const c = group.get('confirm')?.value;
  return p && c && p !== c ? { mismatch: true } : null;
}

/** 0-4 score used by the strength meter. */
export function passwordScore(p: string): number {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score++;
  return score;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout [title]="'auth.createTitle' | t" [subtitle]="'auth.createSubtitle' | t">
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-field">
          <label for="name">{{ 'common.fullName' | t }}</label>
          <input id="name" class="input" formControlName="fullName" [placeholder]="'auth.yourName' | t" autocomplete="name" [class.invalid]="invalid('fullName')" />
          @if (invalid('fullName')) { <span class="field-error">{{ 'auth.nameRequired' | t }}</span> }
        </div>
        <div class="form-field">
          <label for="email">{{ 'common.email' | t }}</label>
          <input id="email" class="input" type="email" formControlName="email" placeholder="you@example.com" autocomplete="email" [class.invalid]="invalid('email')" />
          @if (invalid('email')) { <span class="field-error">{{ 'auth.validEmail' | t }}</span> }
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="password">{{ 'common.password' | t }}</label>
            <input id="password" class="input" type="password" formControlName="password" [placeholder]="'auth.minChars' | t" autocomplete="new-password" [class.invalid]="invalid('password')" />
          </div>
          <div class="form-field">
            <label for="confirm">{{ 'common.confirmPassword' | t }}</label>
            <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" [class.invalid]="submitted && form.hasError('mismatch')" />
          </div>
        </div>
        @if (password()) {
          <div class="strength">
            @for (i of [1, 2, 3, 4]; track i) { <span [class]="i <= score() ? 'on s' + score() : ''"></span> }
            <small class="muted">{{ strengthLabel() }}</small>
          </div>
        }
        @if (invalid('password')) { <p class="field-error">{{ 'auth.passwordMin' | t }}</p> }
        @if (submitted && form.hasError('mismatch')) { <p class="field-error">{{ 'auth.mismatch' | t }}</p> }

        <div class="form-field">
          <label for="currency">{{ 'common.currency' | t }}</label>
          <select id="currency" class="input" formControlName="currency">
            @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>

        <label class="checkbox terms">
          <input type="checkbox" formControlName="terms" />
          <span>{{ 'auth.terms' | t }} <a routerLink="/terms" target="_blank">{{ 'web.landing.terms' | t }}</a> · <a routerLink="/privacy" target="_blank">{{ 'web.landing.privacy' | t }}</a></span>
        </label>
        @if (submitted && !form.value.terms) { <p class="field-error">{{ 'auth.acceptTerms' | t }}</p> }

        <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="loading()">
          @if (loading()) { <span class="spinner"></span> } {{ 'auth.createBtn' | t }}
        </button>
      </form>
      <p class="muted switch">{{ 'auth.haveAccount' | t }} <a routerLink="/login">{{ 'auth.signIn' | t }}</a></p>
    </app-auth-layout>
  `,
  styles: [`
    .switch { text-align: center; margin-top: 22px; }
    .terms { margin: 4px 0 20px; font-size: 13px; color: var(--text-muted); }
    .strength { display: flex; gap: 6px; align-items: center; margin: -6px 0 14px; }
    .strength span { flex: 1; height: 5px; border-radius: 9px; background: var(--border); }
    .strength .on.s1 { background: var(--danger); } .strength .on.s2 { background: var(--warning); }
    .strength .on.s3 { background: #84cc16; } .strength .on.s4 { background: var(--success); }
    .strength small { width: 70px; text-align: end; }
  `],
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  private fb = inject(FormBuilder);

  readonly currencies = CURRENCIES;
  readonly loading = signal(false);
  readonly error = signal('');
  submitted = false;

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
      currency: ['MAD'],
      terms: [false],
    },
    { validators: passwordsMatch },
  );

  readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly score = computed(() => passwordScore(this.password()));
  readonly strengthLabel = computed(() => {
    this.i18n.lang();
    return tList('auth.strength')[this.score()];
  });

  invalid(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  submit() {
    this.submitted = true;
    if (this.form.invalid || !this.form.value.terms) return;
    this.loading.set(true);
    this.error.set('');
    const { fullName, email, password, currency } = this.form.getRawValue();
    this.auth.register({ fullName: fullName.trim(), email: email.trim(), password, currency }).subscribe({
      next: (r) => {
        if (!r.token) {
          this.router.navigate(['/verify-email'], { queryParams: { email: email.trim() } });
          return;
        }
        this.toast.success(t('auth.welcomeToast'), t('auth.welcomeToastMsg'));
        this.router.navigateByUrl('/app/dashboard');
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
