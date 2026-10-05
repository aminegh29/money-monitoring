import { Component, inject, signal } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  imports: [IconComponent, ReactiveFormsModule, RouterLink, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout [title]="'auth.forgotTitle' | t" [subtitle]="'auth.forgotSubtitle' | t">
      @if (sent()) {
        <div class="sent">
          <div class="empty-icon"><app-icon name="mail" [size]="22" /></div>
          <h3>{{ 'web.forgot.checkInbox' | t }}</h3>
          <p class="muted">{{ 'web.forgot.sentTo' | t: { email: form.value.email ?? '' } }}</p>
          <p class="muted small hint">{{ 'auth.spamHint' | t }}</p>
          <button class="btn btn-ghost btn-block" (click)="sent.set(false)">{{ 'web.forgot.another' | t }}</button>
        </div>
      } @else {
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-field">
            <label for="email">{{ 'common.email' | t }}</label>
            <input id="email" class="input" type="email" formControlName="email" placeholder="you@example.com" autocomplete="email" />
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="form.invalid || loading()">
            @if (loading()) { <span class="spinner"></span> } {{ 'auth.sendLink' | t }}
          </button>
        </form>
      }
      <p class="muted back"><a routerLink="/login">{{ 'auth.backToSignIn' | t }}</a></p>
    </app-auth-layout>
  `,
  styles: [`
    .back { text-align: center; margin-top: 22px; }
    .sent { text-align: center; display: grid; gap: 10px; }
    .sent .empty-icon { margin: 0 auto 4px; background: var(--primary-soft); color: var(--primary-text); }
    .hint { background: var(--surface-2); border-radius: 10px; padding: 8px 12px; margin-bottom: 8px; }
  `],
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
