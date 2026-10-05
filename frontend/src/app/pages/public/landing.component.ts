import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/ui.service';
import { LogoComponent } from '../../shared/fx';
import { CategoryNamePipe, TranslatePipe } from '../../core/i18n';
import { LanguageSelectComponent } from '../../shared/language-select.component';
import { IconComponent, IconName } from '../../shared/icon.component';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, LogoComponent, TranslatePipe, CategoryNamePipe, LanguageSelectComponent, IconComponent],
  template: `
    <header class="nav">
      <div class="nav-inner">
        <a routerLink="/" class="brand"><app-logo [size]="28" /><span>Money Monitor</span></a>
        <nav class="nav-links">
          <button type="button" (click)="scrollTo('features')">{{ 'web.landing.featuresEyebrow' | t }}</button>
          <button type="button" (click)="scrollTo('security')">{{ 'web.landing.securityEyebrow' | t }}</button>
          <button type="button" (click)="scrollTo('faq')">{{ 'web.landing.faqEyebrow' | t }}</button>
        </nav>
        <div class="nav-actions">
          <app-language-select class="hide-sm" />
          <button class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="(theme.theme() === 'light' ? 'web.nav.darkMode' : 'web.nav.lightMode') | t">
            <app-icon [name]="theme.theme() === 'light' ? 'moon' : 'sun'" [size]="17" />
          </button>
          @if (auth.isLoggedIn()) {
            <a [routerLink]="auth.homeRoute()" class="btn btn-primary btn-sm">{{ 'web.landing.openDashboard' | t }}</a>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-sm hide-sm">{{ 'auth.signIn' | t }}</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">{{ 'web.landing.getStarted' | t }}</a>
          }
        </div>
      </div>
    </header>

    <section class="hero">
      <div class="hero-text">
        <span class="pill">{{ 'web.landing.pill' | t }}</span>
        <h1>{{ 'web.landing.h1a' | t }} <span class="accent">{{ 'web.landing.h1b' | t }} {{ 'web.landing.h1c' | t }}</span></h1>
        <p class="lead">{{ 'web.landing.lead' | t }}</p>
        <div class="cta">
          <a routerLink="/register" class="btn btn-primary btn-lg">{{ 'web.landing.launch' | t }}</a>
          @if (auth.isLoggedIn()) {
            <a [routerLink]="auth.homeRoute()" class="btn btn-lg">{{ 'web.landing.openDashboard' | t }}</a>
          } @else {
            <a routerLink="/login" class="btn btn-lg">{{ 'auth.signIn' | t }}</a>
          }
        </div>
        <ul class="trust">
          <li><app-icon name="check" [size]="15" [stroke]="2.25" />{{ 'web.landing.statLangs' | t }}</li>
          <li><app-icon name="check" [size]="15" [stroke]="2.25" />PDF · {{ 'web.landing.statPdf' | t }}</li>
          <li><app-icon name="check" [size]="15" [stroke]="2.25" />{{ 'web.landing.synced' | t }}</li>
        </ul>
      </div>

      <!-- Product preview, drawn like the real dashboard -->
      <div class="hero-visual" aria-hidden="true">
        <div class="window">
          <div class="window-bar"><i></i><i></i><i></i></div>
          <div class="window-body">
            <div class="pv-top">
              <div>
                <div class="pv-label">{{ 'web.landing.mockLabel' | t }}</div>
                <div class="pv-amount">4,003.00 <small>MAD</small></div>
              </div>
              <div class="pv-rate"><b>27.6%</b><span>{{ 'dashboard.saved' | t }}</span></div>
            </div>
            <div class="pv-kpis">
              <div><span><i class="sw income"></i>{{ 'dashboard.income' | t }}</span><b>14,500.00</b></div>
              <div><span><i class="sw spent"></i>{{ 'dashboard.spent' | t }}</span><b>10,497.00</b></div>
            </div>
            <div class="pv-chart">
              @for (b of bars; track $index) {
                <div class="pair"><span class="in" [style.height.%]="b[0]"></span><span class="out" [style.height.%]="b[1]"></span></div>
              }
            </div>
            <div class="pv-list">
              @for (tx of txs; track tx.label) {
                <div class="pv-row">
                  <span class="dot" [style.background]="tx.color + '1f'">{{ tx.icon }}</span>
                  <span class="name">{{ tx.cat ? (tx.label | cat) : tx.label }}</span>
                  <b>{{ tx.amount }}</b>
                </div>
              }
            </div>
            <div class="pv-tip"><app-icon name="lightbulb" [size]="15" /><span>{{ 'web.landing.mockAi' | t }}</span></div>
          </div>
        </div>
        <div class="notice">
          <span class="notice-icon"><app-icon name="bell" [size]="15" /></span>
          <span>{{ 'web.landing.chip1' | t }}</span>
        </div>
      </div>
    </section>

    <section class="section" id="features">
      <div class="section-head">
        <div class="eyebrow">{{ 'web.landing.featuresEyebrow' | t }}</div>
        <h2>{{ 'web.landing.featuresTitle' | t }}</h2>
      </div>
      <div class="features">
        @for (f of features; track f.key) {
          <div class="feature">
            <div class="f-icon"><app-icon [name]="f.icon" [size]="19" /></div>
            <h3>{{ 'web.landing.' + f.key + 't' | t }}</h3>
            <p class="muted">{{ 'web.landing.' + f.key + 'd' | t }}</p>
          </div>
        }
      </div>
    </section>

    <section class="section steps-section">
      <div class="section-head">
        <div class="eyebrow">{{ 'web.landing.stepsEyebrow' | t }}</div>
        <h2>{{ 'web.landing.stepsTitle' | t }}</h2>
      </div>
      <div class="steps">
        @for (s of steps; track s.n) {
          <div class="step">
            <span class="num">{{ s.n }}</span>
            <h3>{{ 'web.landing.' + s.key + 't' | t }}</h3>
            <p class="muted">{{ 'web.landing.' + s.key + 'd' | t }}</p>
          </div>
        }
      </div>
    </section>

    <section class="section" id="security">
      <div class="section-head">
        <div class="eyebrow">{{ 'web.landing.securityEyebrow' | t }}</div>
        <h2>{{ 'web.landing.securityTitle' | t }}</h2>
      </div>
      <div class="security">
        @for (s of security; track s.key) {
          <div class="sec">
            <div class="sec-icon"><app-icon [name]="s.icon" [size]="18" /></div>
            <div>
              <h3>{{ 'web.landing.' + s.key + 't' | t }}</h3>
              <p class="muted">{{ 'web.landing.' + s.key + 'd' | t }}</p>
            </div>
          </div>
        }
      </div>
    </section>

    <section class="section faq" id="faq">
      <div class="section-head">
        <div class="eyebrow">{{ 'web.landing.faqEyebrow' | t }}</div>
        <h2>{{ 'web.landing.faqTitle' | t }}</h2>
      </div>
      <div class="faq-list">
        @for (q of faq; track q) {
          <details>
            <summary>{{ 'web.landing.q' + q | t }}<app-icon class="chev" name="chevron-down" [size]="18" /></summary>
            <p class="muted">{{ 'web.landing.a' + q | t }}</p>
          </details>
        }
      </div>
    </section>

    <section class="final-cta">
      <h2>{{ 'web.landing.finalTitle' | t }}</h2>
      <p>{{ 'web.landing.finalText' | t }}</p>
      <a routerLink="/register" class="btn btn-lg cta-white">{{ 'web.landing.finalCta' | t }}</a>
    </section>

    <footer class="site-footer">
      <div class="f-grid">
        <div class="f-brand">
          <a routerLink="/" class="brand"><app-logo [size]="26" /><span>Money Monitor</span></a>
          <p class="muted small">{{ 'web.landing.footerTagline' | t }}</p>
        </div>
        <div class="f-col">
          <h4>{{ 'web.landing.footerProduct' | t }}</h4>
          <button type="button" (click)="scrollTo('features')">{{ 'web.landing.featuresEyebrow' | t }}</button>
          <button type="button" (click)="scrollTo('security')">{{ 'web.landing.securityEyebrow' | t }}</button>
          <button type="button" (click)="scrollTo('faq')">{{ 'web.landing.faqEyebrow' | t }}</button>
          <a routerLink="/register">{{ 'web.landing.getStarted' | t }}</a>
        </div>
        <div class="f-col">
          <h4>{{ 'web.landing.footerLegal' | t }}</h4>
          <a routerLink="/privacy">{{ 'web.landing.privacy' | t }}</a>
          <a routerLink="/terms">{{ 'web.landing.terms' | t }}</a>
        </div>
      </div>
      <div class="f-bottom dim small">{{ 'web.landing.rights' | t: { year: year } }}</div>
    </footer>
  `,
  styles: [`
    :host { display: block; overflow-x: hidden; }

    /* Navigation */
    .nav { position: sticky; top: 0; z-index: 10; background: color-mix(in srgb, var(--bg) 92%, transparent); border-bottom: 1px solid var(--border);
      padding-top: var(--safe-top); }
    .nav-inner { max-width: 1180px; margin: 0 auto; height: 60px; padding: 0 24px; display: flex; align-items: center; gap: 24px; }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--text); white-space: nowrap; }
    .brand:hover { text-decoration: none; }
    .nav-links { display: flex; gap: 2px; }
    .nav-links button { background: none; border: 0; font: inherit; font-size: 14px; font-weight: 500; color: var(--text-muted); padding: 6px 10px; border-radius: 7px; cursor: pointer; }
    .nav-links button:hover { color: var(--text); background: var(--surface-2); }
    .nav-actions { margin-inline-start: auto; display: flex; gap: 6px; align-items: center; }

    /* Hero */
    .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 56px; align-items: center; padding: 72px 24px 80px; max-width: 1180px; margin: 0 auto; }
    .pill { display: inline-block; font-size: 13px; font-weight: 500; color: var(--primary-text); background: var(--primary-soft); padding: 4px 10px; border-radius: 999px; }
    .hero h1 { font-size: clamp(36px, 4.6vw, 54px); font-weight: 600; letter-spacing: -.035em; line-height: 1.08; margin: 18px 0 18px; }
    .hero h1 .accent { color: var(--primary-text); }
    .lead { font-size: 17.5px; color: var(--text-muted); max-width: 540px; line-height: 1.65; }
    .cta { display: flex; gap: 10px; margin: 30px 0 26px; flex-wrap: wrap; }
    .trust { list-style: none; padding: 0; margin: 0; display: flex; gap: 8px 20px; flex-wrap: wrap; }
    .trust li { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--text-muted); }
    .trust app-icon { color: var(--primary-text); }

    .hero-visual { position: relative; padding: 0 0 28px; }
    .window { border-radius: 14px; background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-lg); overflow: hidden; }
    .window-bar { display: flex; gap: 6px; padding: 11px 14px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
    .window-bar i { width: 9px; height: 9px; border-radius: 50%; background: var(--border-strong); }
    .window-body { padding: 20px 22px 22px; display: grid; gap: 16px; }
    .pv-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .pv-label { font-size: 12.5px; color: var(--text-muted); font-weight: 500; }
    .pv-amount { font-size: 30px; font-weight: 600; letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
    .pv-amount small { font-size: 13px; color: var(--text-muted); font-weight: 500; }
    .pv-rate { text-align: end; display: grid; }
    .pv-rate b { font-size: 18px; font-weight: 600; color: var(--primary-text); }
    .pv-rate span { font-size: 12px; color: var(--text-muted); }
    .pv-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .pv-kpis div { display: grid; gap: 2px; padding: 10px 12px; border-radius: 9px; border: 1px solid var(--border); }
    .pv-kpis span { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
    .pv-kpis b { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .sw { width: 8px; height: 8px; border-radius: 2px; } .sw.income { background: var(--chart-1); } .sw.spent { background: var(--border-strong); }
    .pv-chart { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; height: 96px; padding: 0 2px; border-bottom: 1px solid var(--border); }
    .pair { flex: 1; display: flex; align-items: flex-end; gap: 3px; height: 100%; }
    .pair span { flex: 1; border-radius: 3px 3px 0 0; }
    .pair .in { background: var(--chart-1); } .pair .out { background: var(--border-strong); }
    .pv-list { display: grid; }
    .pv-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13.5px; border-bottom: 1px solid var(--border); }
    .pv-row:last-child { border-bottom: none; }
    .pv-row .dot { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; font-size: 14px; }
    .pv-row .name { flex: 1; }
    .pv-row b { font-weight: 600; font-variant-numeric: tabular-nums; }
    .pv-tip { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; padding: 10px 12px; border-radius: 9px; background: var(--primary-soft); color: var(--text); }
    .pv-tip app-icon { color: var(--primary-text); margin-top: 1px; }
    .notice { position: absolute; inset-inline-start: -24px; bottom: 0; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px;
      background: var(--surface-solid); border: 1px solid var(--border); box-shadow: var(--shadow-lg); font-size: 13.5px; font-weight: 500; }
    .notice-icon { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; background: var(--warning-soft); color: var(--warning); }

    /* Sections */
    .section { padding: 88px 24px 8px; max-width: 1180px; margin: 0 auto; }
    .section-head { max-width: 640px; margin-bottom: 40px; }
    .section-head h2 { font-size: clamp(26px, 3.2vw, 36px); font-weight: 600; letter-spacing: -.03em; margin-top: 8px; }
    .features { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--surface); }
    .feature { padding: 26px; border-inline-end: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .feature:nth-child(3n) { border-inline-end: none; }
    .feature:nth-last-child(-n + 3) { border-bottom: none; }
    .f-icon { width: 38px; height: 38px; border-radius: 9px; display: grid; place-items: center; margin-bottom: 16px; background: var(--primary-soft); color: var(--primary-text); }
    .feature h3, .step h3, .sec h3 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .feature p, .step p, .sec p { line-height: 1.6; font-size: 14.5px; }

    .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
    .step { border-top: 2px solid var(--border); padding-top: 20px; }
    .step .num { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; font-size: 13px; font-weight: 600; margin-bottom: 14px;
      background: var(--primary); color: var(--on-primary); }

    .security { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .sec { display: flex; gap: 14px; align-items: flex-start; padding: 22px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); }
    .sec-icon { flex: none; width: 38px; height: 38px; border-radius: 9px; display: grid; place-items: center; background: var(--surface-2); color: var(--text); }

    .faq .section-head { margin-inline: auto; text-align: center; }
    .faq-list { max-width: 760px; margin: 0 auto; border-top: 1px solid var(--border); }
    .faq details { border-bottom: 1px solid var(--border); }
    .faq summary { list-style: none; cursor: pointer; padding: 20px 4px; font-weight: 500; font-size: 16px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .faq summary::-webkit-details-marker { display: none; }
    .faq summary .chev { color: var(--text-muted); transition: transform .2s; }
    .faq details[open] summary .chev { transform: rotate(180deg); }
    .faq details p { padding: 0 4px 20px; line-height: 1.65; max-width: 680px; }

    .final-cta { margin: 96px auto 64px; max-width: 1132px; padding: 56px 32px; border-radius: 16px; text-align: center; background: #0d4a37; color: #fff; }
    .final-cta h2 { font-size: clamp(26px, 3.2vw, 34px); font-weight: 600; letter-spacing: -.025em; margin-bottom: 10px; }
    .final-cta p { color: rgba(255,255,255,.75); margin-bottom: 26px; font-size: 16.5px; }
    .cta-white { background: #fff; color: #0d4a37; border-color: #fff; }
    .cta-white:hover:not(:disabled) { background: #eef5f1; }

    .site-footer { border-top: 1px solid var(--border); padding: 48px 24px calc(28px + var(--safe-bottom)); }
    .f-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; max-width: 1180px; margin: 0 auto; }
    .f-brand p { margin-top: 12px; max-width: 340px; line-height: 1.6; }
    .f-col { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .f-col h4 { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .f-col a, .f-col button { background: none; border: 0; padding: 0; font: inherit; font-size: 14px; color: var(--text-muted); cursor: pointer; }
    .f-col a:hover, .f-col button:hover { color: var(--text); text-decoration: none; }
    .f-bottom { max-width: 1180px; margin: 36px auto 0; padding-top: 20px; border-top: 1px solid var(--border); }

    @media (max-width: 1000px) {
      .nav-links { display: none; }
      .hero { grid-template-columns: 1fr; gap: 48px; padding-top: 48px; }
      .notice { inset-inline-start: 12px; }
      .features { grid-template-columns: 1fr 1fr; }
      .feature:nth-child(3n) { border-inline-end: 1px solid var(--border); }
      .feature:nth-child(2n) { border-inline-end: none; }
      .feature:nth-last-child(-n + 3) { border-bottom: 1px solid var(--border); }
      .feature:nth-last-child(-n + 2) { border-bottom: none; }
      .steps, .security { grid-template-columns: 1fr; gap: 16px; }
    }
    @media (max-width: 600px) {
      .nav-inner { padding: 0 16px; gap: 12px; }
      .hide-sm { display: none; }
      .hero { padding: 36px 16px 56px; }
      .section { padding: 64px 16px 8px; }
      .features { grid-template-columns: 1fr; }
      .feature, .feature:nth-child(n) { border-inline-end: none; border-bottom: 1px solid var(--border); }
      .feature:last-child { border-bottom: none; }
      .final-cta { margin: 64px 16px 40px; padding: 40px 20px; }
      .f-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
      .f-brand { grid-column: 1 / -1; }
      .site-footer { padding-inline: 16px; }
    }
  `],
})
export class LandingComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly year = new Date().getFullYear();
  /** Income / expense bar heights (%) for the preview chart. */
  readonly bars = [[62, 48], [70, 55], [58, 61], [75, 50], [68, 57], [82, 60]];
  readonly txs = [
    { icon: '🛒', color: '#10b981', label: 'Groceries', cat: true, amount: '−201.00' },
    { icon: '🍔', color: '#f97316', label: 'Restaurants & Cafés', cat: true, amount: '−62.00' },
    { icon: '🚗', color: '#f59e0b', label: 'Transport', cat: true, amount: '−145.50' },
  ];
  // Titles and texts are web.landing.<key>t / <key>d translation keys.
  readonly features: { icon: IconName; key: string }[] = [
    { icon: 'refresh-cw', key: 'f1' },
    { icon: 'gauge', key: 'f2' },
    { icon: 'lightbulb', key: 'f3' },
    { icon: 'target', key: 'f4' },
    { icon: 'file-text', key: 'f5' },
    { icon: 'globe', key: 'f6' },
  ];
  readonly steps = [
    { n: '1', key: 's1' },
    { n: '2', key: 's2' },
    { n: '3', key: 's3' },
  ];
  readonly security: { icon: IconName; key: string }[] = [
    { icon: 'lock', key: 'sec1' },
    { icon: 'landmark', key: 'sec2' },
    { icon: 'trash', key: 'sec3' },
  ];
  readonly faq = [1, 2, 3, 4, 5];

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
