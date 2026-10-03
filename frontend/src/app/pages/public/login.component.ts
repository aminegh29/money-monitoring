import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { t, TranslatePipe } from '../../core/i18n';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout [title]="'auth.welcomeBack' | t" [subtitle]="'auth.signInSubtitle' | t">
      @if (reason() === 'expired') { <div class="alert alert-info">{{ 'auth.expired' | t }}</div> }
      @if (reason() === 'disabled') { <div class="alert alert-warning">{{ 'auth.disabled' | t }}</div> }
      @if (reason() === 'reset') { <div class="alert alert-success">{{ 'auth.resetDone' | t }}</div> }
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-field">
          <label for="email">{{ 'common.email' | t }}</label>
          <input id="email" class="input" type="email" formControlName="email" placeholder="you@example.com" autocomplete="email" />
        </div>
        <div class="form-field">
          <div class="row-between">
            <label for="password">{{ 'common.password' | t }}</label>
            <a routerLink="/forgot-password" class="small">{{ 'auth.forgot' | t }}</a>
          </div>
          <div class="input-group">
            <input id="password" class="input" [type]="show() ? 'text' : 'password'" formControlName="password" placeholder="••••••••" autocomplete="current-password" />
            <button type="button" class="icon-btn addon" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">{{ show() ? '🙈' : '👁️' }}</button>
          </div>
        </div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="form.invalid || loading()">
          @if (loading()) { <span class="spinner"></span> } {{ 'auth.signIn' | t }}
        </button>
      </form>

      <p class="muted switch">{{ 'auth.noAccount' | t }} <a routerLink="/register">{{ 'auth.createFree' | t }}</a></p>

      <div class="demo">
        <span class="muted small">{{ 'auth.tryInstantly' | t }}</span>
        <button class="btn btn-ghost btn-sm" (click)="fill('demo@moneymonitor.local', 'Demo@123')">👤 {{ 'auth.demoUser' | t }}</button>
        <button class="btn btn-ghost btn-sm" (click)="fill('admin@moneymonitor.local', 'Admin@123')">🛡️ {{ 'auth.admin' | t }}</button>
      </div>
    </app-auth-layout>
  `,
  styles: [`
    .switch { text-align: center; margin-top: 22px; }
    .demo { display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap; margin-top: 28px; padding-top: 20px; border-top: 1px dashed var(--border); }
  `],
})
export class LoginComponent {
  readonly reason = input<string>();
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly show = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  fill(email: string, password: string) {
    this.form.setValue({ email, password });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(this.auth.homeRoute()),
      error: (err) => {
        this.error.set(errorMessage(err, t('errors.invalidLogin')));
        this.loading.set(false);
      },
    });
  }
}
