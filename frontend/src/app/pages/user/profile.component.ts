import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { CURRENCIES } from '../../core/models';
import { I18nService, LANGUAGES, t, TranslatePipe } from '../../core/i18n';
import { ThemeService, ToastService } from '../../core/ui.service';
import { ConfirmComponent } from '../../shared/modal.component';
import { passwordsMatch } from '../public/register.component';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, TranslatePipe, ConfirmComponent],
  template: `
    <div class="page narrow">
      <div class="page-header">
        <div>
          <h1>{{ 'web.profile.title' | t }}</h1>
          <p>{{ 'web.profile.subtitle' | t }}</p>
        </div>
      </div>

      <div class="card profile-head">
        <div class="avatar">{{ initials() }}</div>
        <div>
          <h3>{{ auth.user()?.fullName }}</h3>
          <p class="muted">{{ auth.user()?.email }}</p>
        </div>
        <span class="badge" [class.badge-primary]="auth.isAdmin()">{{ (auth.isAdmin() ? 'web.profile.administrator' : 'web.profile.user') | t }}</span>
      </div>

      <div class="grid grid-2 mt">
        <div class="card">
          <div class="card-header"><h3>{{ 'web.profile.info' | t }}</h3></div>
          <form [formGroup]="profile" (ngSubmit)="saveProfile()">
            <div class="form-field">
              <label>{{ 'common.fullName' | t }}</label>
              <input class="input" formControlName="fullName" />
            </div>
            <div class="form-field">
              <label>{{ 'common.currency' | t }}</label>
              <select class="input" formControlName="currency">
                @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>{{ 'profile.expectedIncome' | t: { cur: profile.value.currency ?? '' } }}</label>
                <input class="input" type="number" min="0" step="0.01" formControlName="monthlyIncome" />
              </div>
              <div class="form-field">
                <label>{{ 'profile.savingsGoal' | t: { cur: profile.value.currency ?? '' } }}</label>
                <input class="input" type="number" min="0" step="0.01" formControlName="savingsGoal" />
              </div>
            </div>
            <label class="checkbox notif">
              <input type="checkbox" formControlName="emailNotifications" />
              <span><b>{{ 'profile.emailNotifs' | t }}</b><br /><small class="muted">{{ 'profile.emailNotifsHint' | t: { email: auth.user()?.email ?? '' } }}</small></span>
            </label>
            <button class="btn btn-primary" [disabled]="profile.invalid || savingProfile()">{{ 'web.profile.saveChanges' | t }}</button>
          </form>
        </div>

        <div class="stack">
          <div class="card">
            <div class="card-header"><h3>{{ 'profile.changePassword' | t }}</h3></div>
            <form [formGroup]="password" (ngSubmit)="changePassword()">
              <div class="form-field">
                <label>{{ 'profile.current' | t }}</label>
                <input class="input" type="password" formControlName="currentPassword" autocomplete="current-password" />
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>{{ 'auth.newPassword' | t }}</label>
                  <input class="input" type="password" formControlName="password" autocomplete="new-password" />
                </div>
                <div class="form-field">
                  <label>{{ 'web.profile.confirm' | t }}</label>
                  <input class="input" type="password" formControlName="confirm" autocomplete="new-password" />
                </div>
              </div>
              @if (password.hasError('mismatch')) { <p class="field-error">{{ 'auth.mismatch' | t }}</p> }
              <button class="btn btn-primary" [disabled]="password.invalid">{{ 'auth.updatePassword' | t }}</button>
            </form>
          </div>

          <div class="card">
            <div class="card-header"><h3>🌐 {{ 'common.language' | t }}</h3></div>
            <p class="muted small">{{ 'profile.languageHint' | t }}</p>
            <div class="langs">
              @for (l of languages; track l.code) {
                <button type="button" class="lang-option" [class.selected]="i18n.lang() === l.code" (click)="auth.changeLanguage(l.code)">
                  <span>{{ l.flag }}</span>{{ l.name }}
                </button>
              }
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>{{ 'profile.appearance' | t }}</h3></div>
            <div class="row-between">
              <span>{{ 'web.profile.darkMode' | t }}</span>
              <button class="toggle" [class.on]="theme.theme() === 'dark'" (click)="theme.toggle()" aria-label="Toggle dark mode"><span></span></button>
            </div>
          </div>
        </div>
      </div>

      @if (!auth.isAdmin()) {
        <div class="card danger-zone mt">
          <div class="card-header"><h3>{{ 'profile.dangerZone' | t }}</h3></div>
          <p class="muted small">{{ 'profile.deleteAccountHint' | t }}</p>
          <div class="danger-row">
            <input class="input" type="password" [value]="deletePassword()" (input)="deletePassword.set($any($event.target).value)"
                   [placeholder]="'profile.current' | t" autocomplete="current-password" />
            <button class="btn btn-danger" [disabled]="!deletePassword() || deleting()" (click)="confirmDelete.set(true)">
              @if (deleting()) { <span class="spinner"></span> } {{ 'profile.deleteAccount' | t }}
            </button>
          </div>
        </div>
      }
    </div>

    @if (confirmDelete()) {
      <app-confirm [title]="'profile.deleteConfirmTitle' | t" [message]="'profile.deleteConfirmMsg' | t" [confirmLabel]="'profile.deleteAccount' | t"
                   (confirm)="deleteAccount()" (cancel)="confirmDelete.set(false)" />
    }
  `,
  styles: [`
    .narrow { max-width: 1060px; }
    .profile-head { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
    .profile-head > div:nth-child(2) { flex: 1; }
    .avatar { width: 64px; height: 64px; border-radius: 20px; background: var(--gradient); color: #fff; display: grid; place-items: center; font-size: 22px; font-weight: 800; }
    .toggle { width: 48px; height: 28px; border-radius: 999px; border: none; background: var(--border); position: relative; cursor: pointer; transition: background .2s; }
    .langs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .lang-option { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--surface-2); color: var(--text); font: inherit; font-size: 14px; cursor: pointer; }
    .lang-option.selected { border-color: var(--primary); background: var(--primary-soft); font-weight: 600; }
    .toggle span { position: absolute; top: 3px; inset-inline-start: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .toggle.on { background: var(--primary); }
    .toggle.on span { transform: translateX(20px); }
    :host-context([dir='rtl']) .toggle.on span { transform: translateX(-20px); }
    .notif { align-items: flex-start; margin: 4px 0 18px; font-size: 14px; }
    .notif small { line-height: 1.5; }
    .danger-zone { border-color: color-mix(in srgb, var(--danger) 45%, transparent); }
    .danger-zone h3 { color: var(--danger); }
    .danger-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
    .danger-row .input { flex: 1; min-width: 200px; }
  `],
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly currencies = CURRENCIES;
  readonly languages = LANGUAGES;
  readonly i18n = inject(I18nService);
  readonly savingProfile = signal(false);

  readonly profile = this.fb.nonNullable.group({
    fullName: [this.auth.user()?.fullName ?? '', Validators.required],
    currency: [this.auth.user()?.currency ?? 'MAD', Validators.required],
    monthlyIncome: [this.auth.user()?.monthlyIncome ?? 0, [Validators.required, Validators.min(0)]],
    savingsGoal: [this.auth.user()?.savingsGoal ?? 0, [Validators.required, Validators.min(0)]],
    emailNotifications: [this.auth.user()?.emailNotifications ?? true],
  });

  readonly deletePassword = signal('');
  readonly deleting = signal(false);
  readonly confirmDelete = signal(false);

  readonly password = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  initials() {
    return (this.auth.user()?.fullName ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  saveProfile() {
    this.savingProfile.set(true);
    const v = this.profile.getRawValue();
    this.api.updateProfile({ ...v, monthlyIncome: Number(v.monthlyIncome), savingsGoal: Number(v.savingsGoal), language: this.i18n.lang() }).subscribe({
      next: (u) => {
        this.auth.setUser(u);
        this.toast.success(t('profile.saved'));
        this.savingProfile.set(false);
      },
      error: (err) => {
        this.toast.error(t('profile.saveError'), errorMessage(err));
        this.savingProfile.set(false);
      },
    });
  }

  deleteAccount() {
    this.confirmDelete.set(false);
    this.deleting.set(true);
    this.api.deleteAccount(this.deletePassword()).subscribe({
      next: () => {
        this.toast.success(t('profile.deleted'));
        this.auth.logout();
      },
      error: (err) => {
        this.toast.error(t('common.couldNotDelete'), errorMessage(err));
        this.deleting.set(false);
      },
    });
  }

  changePassword() {
    const v = this.password.getRawValue();
    this.api.changePassword(v.currentPassword, v.password).subscribe({
      next: () => {
        this.toast.success(t('profile.passwordChanged'));
        this.password.reset();
      },
      error: (err) => this.toast.error(t('profile.passwordError'), errorMessage(err)),
    });
  }
}
