import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { defaultServerUrl, isNative, serverUrl, setServerUrl } from '../../core/config';
import { ThemeService, ToastService } from '../../core/ui.service';
import { LogoComponent } from '../../shared/fx';
import { ModalComponent } from '../../shared/modal.component';
import { t, TranslatePipe } from '../../core/i18n';
import { LanguageSelectComponent } from '../../shared/language-select.component';
import { IconComponent } from '../../shared/icon.component';

/** Split-screen layout shared by login, register, forgot and reset password pages. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, FormsModule, LogoComponent, ModalComponent, TranslatePipe, LanguageSelectComponent, IconComponent],
  template: `
    <div class="auth">
      <section class="visual">
        <a routerLink="/" class="brand"><app-logo [size]="30" /><span>Money Monitor</span></a>

        <div class="pitch">
          <h2>{{ 'web.authLayout.pitchA' | t }} <span>{{ 'web.authLayout.pitchB' | t }}</span></h2>
          <p>{{ 'web.authLayout.pitchText' | t }}</p>
          <ul class="points">
            <li><app-icon name="check" [size]="16" [stroke]="2.25" />{{ 'web.authLayout.liveSync' | t }}</li>
            <li><app-icon name="check" [size]="16" [stroke]="2.25" />{{ 'web.authLayout.aiTip' | t }}</li>
            <li><app-icon name="check" [size]="16" [stroke]="2.25" />{{ 'web.authLayout.budgetChip' | t }}</li>
          </ul>
        </div>

        <div class="preview" aria-hidden="true">
          <div class="pv-label">{{ 'web.authLayout.netBalance' | t }}</div>
          <div class="pv-amount">4,003.00 <small>MAD</small></div>
          <div class="pv-bars">
            @for (h of bars; track $index) { <span [style.height.%]="h" [class.now]="$last"></span> }
          </div>
          <div class="pv-foot"><span>{{ 'web.authLayout.savingsRate' | t }}</span><b>27.6%</b></div>
        </div>
      </section>

      <section class="form-panel">
        <div class="top-actions">
          <app-language-select />
          @if (native) { <button class="btn btn-ghost btn-sm" (click)="openServer()"><app-icon name="settings" [size]="15" />{{ 'auth.server' | t }}</button> }
          <button class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="(theme.theme() === 'light' ? 'web.nav.darkMode' : 'web.nav.lightMode') | t">
            <app-icon [name]="theme.theme() === 'light' ? 'moon' : 'sun'" [size]="17" />
          </button>
        </div>
        <div class="form-card">
          <a routerLink="/" class="mobile-logo"><app-logo [size]="40" /></a>
          <h1>{{ title() }}</h1>
          <p class="muted subtitle">{{ subtitle() }}</p>
          <ng-content />
        </div>
      </section>
    </div>

    @if (serverOpen()) {
      <app-modal [title]="'web.authLayout.serverTitle' | t" (closed)="serverOpen.set(false)">
        <p class="muted small">{{ 'web.authLayout.serverHelp' | t }}</p>
        <div class="form-field mt">
          <label>{{ 'web.authLayout.backendUrl' | t }}</label>
          <input class="input" [(ngModel)]="server" placeholder="http://192.168.1.20:8080" autocapitalize="off" autocorrect="off" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" (click)="resetServer()">{{ 'web.authLayout.reset' | t }}</button>
          <button class="btn btn-primary" (click)="saveServer()">{{ 'common.save' | t }}</button>
        </div>
      </app-modal>
    }
  `,
  styles: [`
    .auth { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 100vh; }
    .visual { position: relative; padding: 36px 56px; display: flex; flex-direction: column; gap: 40px; justify-content: space-between; overflow: hidden;
      background: #0d4a37; color: #fff; }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 600; color: #fff; }
    .brand:hover { text-decoration: none; }
    .brand app-logo { border-radius: 8px; box-shadow: 0 0 0 1.5px rgba(255,255,255,.35); }
    .pitch { max-width: 460px; }
    .pitch h2 { font-size: 34px; font-weight: 600; letter-spacing: -.025em; line-height: 1.15; margin-bottom: 14px; }
    .pitch h2 span { color: #9fd9bf; }
    .pitch p { color: rgba(255,255,255,.75); font-size: 16px; line-height: 1.6; }
    .points { list-style: none; padding: 0; margin: 24px 0 0; display: grid; gap: 12px; }
    .points li { display: flex; align-items: center; gap: 10px; font-size: 15px; color: rgba(255,255,255,.9); }
    .points app-icon { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.12); color: #9fd9bf; }

    .preview { width: min(360px, 100%); padding: 20px; border-radius: 14px; background: #fff; color: #16201b; box-shadow: 0 24px 50px -16px rgba(0,0,0,.4); }
    .pv-label { font-size: 12.5px; color: #5a6660; font-weight: 500; }
    .pv-amount { font-size: 28px; font-weight: 600; letter-spacing: -.02em; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .pv-amount small { font-size: 13px; color: #5a6660; font-weight: 500; }
    .pv-bars { display: flex; align-items: flex-end; gap: 6px; height: 64px; margin: 16px 0 12px; }
    .pv-bars span { flex: 1; border-radius: 3px; background: #dfe7e2; }
    .pv-bars span.now { background: #0f6e4f; }
    .pv-foot { display: flex; justify-content: space-between; font-size: 13px; color: #5a6660; padding-top: 10px; border-top: 1px solid #e3e6e2; }
    .pv-foot b { color: #0f6e4f; font-weight: 600; }

    .form-panel { display: grid; place-items: center; padding: calc(40px + var(--safe-top)) 22px calc(40px + var(--safe-bottom)); position: relative; background: var(--bg); }
    .top-actions { position: absolute; top: calc(16px + var(--safe-top)); inset-inline-end: 16px; display: flex; gap: 6px; align-items: center; }
    .form-card { width: 100%; max-width: 400px; }
    .form-card h1 { font-size: 26px; letter-spacing: -.02em; }
    .subtitle { margin: 6px 0 26px; }
    .mobile-logo { display: none; margin-bottom: 20px; width: fit-content; }
    code { font-size: 12px; background: var(--surface-2); padding: 1px 5px; border-radius: 5px; }
    @media (max-width: 960px) {
      .auth { grid-template-columns: 1fr; }
      .visual { display: none; }
      .mobile-logo { display: block; }
      .form-panel { place-items: start center; padding-top: calc(70px + var(--safe-top)); }
    }
  `],
})
export class AuthLayoutComponent {
  readonly title = input('');
  readonly subtitle = input('');
  readonly theme = inject(ThemeService);
  private toast = inject(ToastService);

  readonly native = isNative;
  readonly bars = [38, 52, 44, 61, 49, 70, 58, 82];
  readonly serverOpen = signal(false);
  server = '';

  openServer() {
    this.server = serverUrl();
    this.serverOpen.set(true);
  }

  saveServer() {
    if (!/^https?:\/\/.+/.test(this.server.trim())) {
      this.toast.error(t('web.authLayout.invalidAddress'), t('web.authLayout.invalidAddressMsg'));
      return;
    }
    setServerUrl(this.server.trim());
    this.serverOpen.set(false);
    this.toast.success(t('web.authLayout.serverSaved'), serverUrl());
  }

  resetServer() {
    setServerUrl(null);
    this.server = defaultServerUrl();
    this.toast.info(t('web.authLayout.serverReset'), this.server);
  }
}
