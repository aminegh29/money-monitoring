import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { defaultServerUrl, isNative, serverUrl, setServerUrl } from '../../core/config';
import { ThemeService, ToastService } from '../../core/ui.service';
import { LogoComponent } from '../../shared/fx';
import { ModalComponent } from '../../shared/modal.component';
import { t, TranslatePipe } from '../../core/i18n';
import { LanguageSelectComponent } from '../../shared/language-select.component';

/** Split-screen layout shared by login, register, forgot and reset password pages. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, FormsModule, LogoComponent, ModalComponent, TranslatePipe, LanguageSelectComponent],
  template: `
    <div class="auth">
      <section class="visual">
        <a routerLink="/" class="brand"><app-logo [size]="40" /> <span>Money<b class="gradient-text">Monitor</b></span></a>

        <div class="stage">
          <div class="holo-card">
            <div class="chip"></div>
            <div class="eyebrow">{{ 'web.authLayout.netBalance' | t }}</div>
            <div class="amount">+4,003.00 <small>MAD</small></div>
            <div class="spark">
              <svg viewBox="0 0 300 70" preserveAspectRatio="none">
                <defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".6" stop-color="#8b5cf6"/><stop offset="1" stop-color="#e879f9"/></linearGradient></defs>
                <path d="M0 55 C40 50 50 30 90 34 S150 60 190 30 S250 8 300 14" fill="none" stroke="url(#sg)" stroke-width="3.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="holo-foot"><span>{{ 'web.authLayout.savingsRate' | t }}</span><b>27.6%</b></div>
          </div>
          <div class="float f1">{{ 'web.authLayout.liveSync' | t }}</div>
          <div class="float f2">{{ 'web.authLayout.aiTip' | t }}</div>
          <div class="float f3">{{ 'web.authLayout.budgetChip' | t }}</div>
        </div>

        <div class="pitch">
          <h2>{{ 'web.authLayout.pitchA' | t }}<br /><span class="gradient-text">{{ 'web.authLayout.pitchB' | t }}</span></h2>
          <p>{{ 'web.authLayout.pitchText' | t }}</p>
        </div>
      </section>

      <section class="form-panel">
        <div class="top-actions">
          <app-language-select />
          @if (native) { <button class="btn btn-ghost btn-sm" (click)="openServer()">🛰 {{ 'auth.server' | t }}</button> }
          <button class="icon-btn" (click)="theme.toggle()">{{ theme.theme() === 'light' ? '🌙' : '☀️' }}</button>
        </div>
        <div class="form-card">
          <div class="mobile-logo"><app-logo [size]="56" /></div>
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
    .auth { display: grid; grid-template-columns: 1.1fr 1fr; min-height: 100vh; }
    .visual { position: relative; padding: 40px 56px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; border-inline-end: 1px solid var(--border);
      background: radial-gradient(70% 60% at 30% 40%, rgba(139,92,246,.22), transparent 70%), radial-gradient(50% 50% at 80% 80%, rgba(34,211,238,.15), transparent 70%); }
    .brand { display: flex; align-items: center; gap: 12px; font-family: var(--font-display); font-size: 21px; color: var(--text); z-index: 2; }
    .brand:hover { text-decoration: none; }
    .stage { position: relative; height: 340px; display: grid; place-items: center; perspective: 1000px; }
    .holo-card { width: min(400px, 90%); aspect-ratio: 1.6; border-radius: 26px; padding: 26px; position: relative; overflow: hidden;
      background: linear-gradient(135deg, rgba(34,211,238,.25), rgba(139,92,246,.3) 50%, rgba(232,121,249,.25)), rgba(10,12,30,.6);
      border: 1px solid rgba(255,255,255,.18); box-shadow: 0 40px 80px -20px rgba(0,0,0,.8), 0 0 60px rgba(139,92,246,.35);
      backdrop-filter: blur(20px); transform: rotateX(14deg) rotateY(-18deg) rotateZ(3deg); animation: hover 7s ease-in-out infinite; color: #fff; }
    .holo-card::after { content: ''; position: absolute; inset: -60%; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.18) 50%, transparent 60%); animation: sweep 5s ease-in-out infinite; }
    @keyframes hover { 50% { transform: rotateX(8deg) rotateY(-10deg) rotateZ(1deg) translateY(-12px); } }
    @keyframes sweep { 0% { transform: translateX(-40%); } 70%, 100% { transform: translateX(40%); } }
    .chip { position: absolute; right: 26px; top: 26px; width: 42px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #fde68a, #f59e0b); opacity: .85; }
    .holo-card .eyebrow { color: rgba(255,255,255,.7); }
    .amount { font-family: var(--font-display); font-size: 36px; font-weight: 700; letter-spacing: -.04em; margin-top: 6px; }
    .amount small { font-size: 15px; opacity: .7; }
    .spark { height: 60px; margin-top: 8px; } .spark svg { width: 100%; height: 100%; filter: drop-shadow(0 0 8px rgba(139,92,246,.9)); }
    .holo-foot { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,.75); margin-top: 6px; } .holo-foot b { color: #6ff7cf; }
    .float { position: absolute; padding: 9px 14px; border-radius: 14px; font-size: 13px; font-weight: 600; background: var(--surface-solid); border: 1px solid var(--border-strong);
      box-shadow: var(--shadow-lg); animation: bob 5s ease-in-out infinite; white-space: nowrap; }
    .f1 { top: 18px; left: 6%; color: var(--success); } .f2 { bottom: 18px; right: 2%; animation-delay: -1.6s; } .f3 { top: 42%; right: -2%; animation-delay: -3s; }
    @keyframes bob { 50% { transform: translateY(-10px); } }
    .pitch { z-index: 2; max-width: 480px; }
    .pitch h2 { font-size: 40px; font-weight: 700; letter-spacing: -.04em; line-height: 1.08; margin-bottom: 14px; }
    .pitch p { color: var(--text-muted); font-size: 16px; line-height: 1.6; }

    .form-panel { display: grid; place-items: center; padding: calc(40px + var(--safe-top)) 22px calc(40px + var(--safe-bottom)); position: relative; }
    .top-actions { position: absolute; top: calc(18px + var(--safe-top)); inset-inline-end: 18px; display: flex; gap: 8px; align-items: center; }
    .form-card { width: 100%; max-width: 420px; }
    .form-card h1 { font-size: 32px; letter-spacing: -.04em; }
    .subtitle { margin: 8px 0 28px; }
    .mobile-logo { display: none; margin-bottom: 18px; }
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
