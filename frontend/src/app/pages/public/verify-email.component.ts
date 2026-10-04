import { Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { t, TranslatePipe } from '../../core/i18n';
import { ToastService } from '../../core/ui.service';
import { AuthLayoutComponent } from './auth-layout.component';

const RESEND_SECONDS = 60;

/** Enter the 6-digit code emailed at sign-up (or after signing in with an unconfirmed email). */
@Component({
  selector: 'app-verify-email',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout [title]="'auth.verifyTitle' | t" [subtitle]="'auth.verifySubtitle' | t: { email: email() ?? '' }">
      @if (info()) { <div class="alert alert-info">{{ info() }}</div> }
      @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

      <form (ngSubmit)="submit()">
        <div class="form-field">
          <label for="code">{{ 'auth.codeLabel' | t }}</label>
          <input
            id="code"
            class="input code"
            [class.invalid]="!!error()"
            name="code"
            [ngModel]="code()"
            (ngModelChange)="onChange($event)"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="••••••"
            autofocus
          />
        </div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="code().length !== 6 || loading()">
          @if (loading()) { <span class="spinner"></span> } {{ 'auth.verifyBtn' | t }}
        </button>
      </form>

      <div class="links">
        <button type="button" class="link-btn" (click)="resend()" [disabled]="wait() > 0">
          {{ wait() > 0 ? ('auth.resendIn' | t: { s: wait() }) : ('auth.resend' | t) }}
        </button>
        <p class="muted small">{{ 'auth.spamHint' | t }}</p>
        <a routerLink="/register" class="small">{{ 'auth.wrongEmail' | t }}</a>
      </div>
    </app-auth-layout>
  `,
  styles: [`
    .code { height: 64px; font-family: var(--font-display); font-size: 30px; letter-spacing: 12px; text-align: center; }
    .links { display: grid; gap: 12px; justify-items: center; text-align: center; margin-top: 22px; }
    .link-btn { background: none; border: 0; padding: 0; font: inherit; font-weight: 600; color: var(--primary-text); cursor: pointer; }
    .link-btn:disabled { color: var(--text-muted); cursor: default; }
  `],
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  readonly email = input<string>();
  readonly notice = input<string>();
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly code = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly info = signal('');
  readonly wait = signal(RESEND_SECONDS);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    if (!this.email()) {
      this.router.navigateByUrl('/register');
      return;
    }
    if (this.notice() === 'notVerified') this.info.set(t('auth.notVerified'));
    this.startCountdown();
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  onChange(value: string) {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 6);
    this.code.set(digits);
    if (digits.length === 6) this.submit();
  }

  submit() {
    if (this.code().length !== 6 || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyEmail(this.email()!, this.code()).subscribe({
      next: () => {
        this.toast.success(t('auth.verified'), t('auth.welcomeToastMsg'));
        this.router.navigateByUrl(this.auth.homeRoute());
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.code.set('');
        this.loading.set(false);
      },
    });
  }

  resend() {
    this.error.set('');
    this.auth.resendVerification(this.email()!).subscribe({
      next: () => {
        this.info.set(t('auth.resent'));
        this.startCountdown();
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  private startCountdown() {
    clearInterval(this.timer);
    this.wait.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      this.wait.update((w) => w - 1);
      if (this.wait() <= 0) clearInterval(this.timer);
    }, 1000);
  }
}
