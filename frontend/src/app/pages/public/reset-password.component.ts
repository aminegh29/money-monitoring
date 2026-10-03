import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { tList, TranslatePipe } from '../../core/i18n';
import { AuthLayoutComponent } from './auth-layout.component';
import { passwordScore, passwordsMatch } from './register.component';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout [title]="'auth.resetTitle' | t" [subtitle]="'web.reset.subtitle' | t">
      @if (checking()) {
        <div class="loading-box"><span class="spinner lg"></span></div>
      } @else if (!valid()) {
        <div class="alert alert-error">{{ 'web.reset.invalid' | t }}</div>
        <a routerLink="/forgot-password" class="btn btn-primary btn-block">{{ 'web.reset.requestNew' | t }}</a>
      } @else {
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-field">
            <label for="password">{{ 'auth.newPassword' | t }}</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" />
            <span class="muted small">{{ 'web.reset.strength' | t: { s: strengthLabel() } }}</span>
          </div>
          <div class="form-field">
            <label for="confirm">{{ 'profile.confirmNew' | t }}</label>
            <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
            @if (form.hasError('mismatch') && form.controls.confirm.touched) { <span class="field-error">{{ 'auth.mismatch' | t }}</span> }
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="form.invalid || loading()">
            @if (loading()) { <span class="spinner"></span> } {{ 'web.reset.resetBtn' | t }}
          </button>
        </form>
      }
      <p class="muted back"><a routerLink="/login">{{ 'auth.backToSignIn' | t }}</a></p>
    </app-auth-layout>
  `,
  styles: [`.back { text-align: center; margin-top: 22px; }`],
})
export class ResetPasswordComponent implements OnInit {
  readonly token = input<string>('');
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  readonly checking = signal(true);
  readonly valid = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group(
    { password: ['', [Validators.required, Validators.minLength(8)]], confirm: ['', Validators.required] },
    { validators: passwordsMatch },
  );
  private password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly score = computed(() => passwordScore(this.password()));
  strengthLabel() {
    return tList('auth.strength')[this.score()];
  }

  ngOnInit() {
    if (!this.token()) {
      this.checking.set(false);
      return;
    }
    this.auth.validateResetToken(this.token()).subscribe({
      next: (r) => {
        this.valid.set(r.valid);
        this.checking.set(false);
      },
      error: () => this.checking.set(false),
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.resetPassword(this.token(), this.form.getRawValue().password).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { reason: 'reset' } }),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
