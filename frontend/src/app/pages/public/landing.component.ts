import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/ui.service';
import { LogoComponent } from '../../shared/fx';
import { CategoryNamePipe, TranslatePipe } from '../../core/i18n';
import { LanguageSelectComponent } from '../../shared/language-select.component';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, LogoComponent, TranslatePipe, CategoryNamePipe, LanguageSelectComponent],
  template: `
    <header class="nav">
      <a routerLink="/" class="brand"><app-logo [size]="38" /><span>Money<b class="gradient-text">Monitor</b></span></a>
      <nav class="nav-links">
        <button type="button" (click)="scrollTo('features')">{{ 'web.landing.featuresEyebrow' | t }}</button>
        <button type="button" (click)="scrollTo('security')">{{ 'web.landing.securityEyebrow' | t }}</button>
        <button type="button" (click)="scrollTo('faq')">{{ 'web.landing.faqEyebrow' | t }}</button>
      </nav>
      <div class="nav-actions">
        <app-language-select />
        <button class="icon-btn" (click)="theme.toggle()">{{ theme.theme() === 'light' ? '🌙' : '☀️' }}</button>
        @if (auth.isLoggedIn()) {
          <a [routerLink]="auth.homeRoute()" class="btn btn-primary btn-sm">{{ 'web.landing.openDashboard' | t }}</a>
        } @else {
          <a routerLink="/login" class="btn btn-ghost btn-sm">{{ 'auth.signIn' | t }}</a>
          <a routerLink="/register" class="btn btn-primary btn-sm">{{ 'web.landing.getStarted' | t }}</a>
        }
      </div>
    </header>

    <section class="hero">
      <div class="hero-text">
        <span class="pill"><i></i> {{ 'web.landing.pill' | t }}</span>
        <h1>{{ 'web.landing.h1a' | t }}<br /><span class="gradient-text">{{ 'web.landing.h1b' | t }}<br />{{ 'web.landing.h1c' | t }}</span></h1>
        <p>{{ 'web.landing.lead' | t }}</p>
        <div class="cta">
          <a routerLink="/register" class="btn btn-primary btn-lg">{{ 'web.landing.launch' | t }}</a>
          @if (auth.isLoggedIn()) {
            <a [routerLink]="auth.homeRoute()" class="btn btn-ghost btn-lg">{{ 'web.landing.openDashboard' | t }}</a>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-lg">{{ 'auth.signIn' | t }}</a>
          }
        </div>
        <div class="stats">
          <div><b class="gradient-text">⚡ 0s</b><span>{{ 'web.landing.statSync' | t }}</span></div>
          <div><b class="gradient-text">✦ AI</b><span>Groq · Gemini · Ollama</span></div>
          <div><b class="gradient-text">⤓ PDF</b><span>{{ 'web.landing.statPdf' | t }}</span></div>
          <div><b class="gradient-text">🌐 5</b><span>{{ 'web.landing.statLangs' | t }}</span></div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="orbit o1"></div><div class="orbit o2"></div>
        <div class="phone">
          <div class="notch"></div>
          <div class="screen">
            <div class="s-top"><span>9:41</span><span class="s-live">● LIVE</span></div>
            <div class="s-label">{{ 'web.landing.mockLabel' | t }}</div>
            <div class="s-amount">4,003<small>.00 MAD</small></div>
            <div class="s-bars">
              @for (h of bars; track $index) { <span [style.height.%]="h"></span> }
            </div>
            <div class="s-row"><span class="s-dot" style="--c:#10b981">🛒</span><span>{{ 'Groceries' | cat }}</span><b>-201.00</b></div>
            <div class="s-row"><span class="s-dot" style="--c:#f97316">🍔</span><span>Burger</span><b>-62.00</b></div>
            <div class="s-ai">{{ 'web.landing.mockAi' | t }}</div>
            <div class="s-tab"><i></i><i></i><b>＋</b><i></i><i></i></div>
          </div>
        </div>
        <div class="chip c1">{{ 'web.landing.chip1' | t }}</div>
        <div class="chip c2">{{ 'web.landing.chip2' | t }}</div>
      </div>
    </section>

    <section class="platforms">
      <span>{{ 'web.landing.availableOn' | t }}</span><b>🌐 Web</b><b>📱 iOS</b><b>🤖 Android</b><span class="muted">{{ 'web.landing.synced' | t }}</span>
    </section>

    <section class="features" id="features">
      <div class="eyebrow center">{{ 'web.landing.featuresEyebrow' | t }}</div>
      <h2>{{ 'web.landing.featuresTitle' | t }}</h2>
      <div class="grid grid-3">
        @for (f of features; track f.key) {
          <div class="card feature interactive">
            <div class="f-icon">{{ f.icon }}</div>
            <h3>{{ 'web.landing.' + f.key + 't' | t }}</h3>
            <p class="muted">{{ 'web.landing.' + f.key + 'd' | t }}</p>
          </div>
        }
      </div>
    </section>

    <section class="steps">
      <div class="eyebrow center">{{ 'web.landing.stepsEyebrow' | t }}</div>
      <h2>{{ 'web.landing.stepsTitle' | t }}</h2>
      <div class="grid grid-3">
        @for (s of steps; track s.n) {
          <div class="step card"><span class="num">{{ s.n }}</span><h3>{{ 'web.landing.' + s.key + 't' | t }}</h3><p class="muted">{{ 'web.landing.' + s.key + 'd' | t }}</p></div>
        }
      </div>
    </section>

    <section class="security" id="security">
      <div class="eyebrow center">{{ 'web.landing.securityEyebrow' | t }}</div>
      <h2>{{ 'web.landing.securityTitle' | t }}</h2>
      <div class="grid grid-3">
        @for (s of security; track s.key) {
          <div class="card sec">
            <div class="sec-icon">{{ s.icon }}</div>
            <div>
              <h3>{{ 'web.landing.' + s.key + 't' | t }}</h3>
              <p class="muted">{{ 'web.landing.' + s.key + 'd' | t }}</p>
            </div>
          </div>
        }
      </div>
    </section>

    <section class="faq" id="faq">
      <div class="eyebrow center">{{ 'web.landing.faqEyebrow' | t }}</div>
      <h2>{{ 'web.landing.faqTitle' | t }}</h2>
      <div class="faq-list">
        @for (q of faq; track q) {
          <details class="card">
            <summary>{{ 'web.landing.q' + q | t }}</summary>
            <p class="muted">{{ 'web.landing.a' + q | t }}</p>
          </details>
        }
      </div>
    </section>

    <section class="final-cta">
      <div class="final-glow"></div>
      <h2>{{ 'web.landing.finalTitle' | t }}</h2>
      <p>{{ 'web.landing.finalText' | t }}</p>
      <a routerLink="/register" class="btn btn-lg cta-white">{{ 'web.landing.finalCta' | t }}</a>
    </section>

    <footer class="site-footer">
      <div class="f-grid">
        <div class="f-brand">
          <a routerLink="/" class="brand"><app-logo [size]="32" /><span>Money<b class="gradient-text">Monitor</b></span></a>
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
    .nav { display: flex; justify-content: space-between; align-items: center; padding: calc(16px + var(--safe-top)) 6vw 16px; position: sticky; top: 0; z-index: 10;
      background: color-mix(in srgb, var(--bg) 55%, transparent); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); border-bottom: 1px solid var(--border); }
    .brand { display: flex; align-items: center; gap: 11px; font-family: var(--font-display); font-size: 20px; color: var(--text); }
    .brand:hover { text-decoration: none; }
    .nav-actions { display: flex; gap: 10px; align-items: center; }

    .hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 50px; align-items: center; padding: 70px 6vw 80px; max-width: 1400px; margin: 0 auto; }
    .pill { display: inline-flex; align-items: center; gap: 10px; background: var(--surface-2); border: 1px solid var(--border-strong); font-size: 13px; font-weight: 600; padding: 7px 15px; border-radius: 999px; }
    .pill i { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 10px var(--success); }
    .hero h1 { font-size: clamp(48px, 7vw, 92px); font-weight: 700; letter-spacing: -.055em; margin: 24px 0; line-height: .98; }
    .hero p { font-size: 18px; color: var(--text-muted); max-width: 560px; line-height: 1.65; }
    .cta { display: flex; gap: 12px; margin: 34px 0 40px; flex-wrap: wrap; }
    .stats { display: flex; gap: 36px; flex-wrap: wrap; }
    .stats div { display: flex; flex-direction: column; gap: 2px; }
    .stats b { font-family: var(--font-display); font-size: 22px; }
    .stats span { font-size: 13px; color: var(--text-muted); }

    .hero-visual { position: relative; height: 600px; display: grid; place-items: center; perspective: 1400px; }
    .orbit { position: absolute; border-radius: 50%; border: 1px solid var(--border-strong); }
    .o1 { width: 520px; height: 520px; animation: spin 40s linear infinite; }
    .o2 { width: 380px; height: 380px; border-style: dashed; animation: spin 26s linear infinite reverse; }
    .o1::after { content: ''; position: absolute; top: 50%; left: -5px; width: 10px; height: 10px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 16px var(--cyan); }
    .phone { position: relative; width: 290px; height: 590px; border-radius: 48px; padding: 12px; background: linear-gradient(145deg, #2a2f4a, #0b0d1c);
      box-shadow: 0 0 0 2px rgba(255,255,255,.08), 0 60px 120px -30px rgba(0,0,0,.9), 0 0 90px rgba(139,92,246,.4);
      transform: rotateY(-16deg) rotateX(6deg); animation: float 8s ease-in-out infinite; }
    @keyframes float { 50% { transform: rotateY(-8deg) rotateX(3deg) translateY(-14px); } }
    .notch { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); width: 92px; height: 26px; border-radius: 20px; background: #000; z-index: 2; }
    .screen { height: 100%; border-radius: 38px; overflow: hidden; padding: 50px 18px 16px; color: #eef1ff; position: relative;
      background: radial-gradient(80% 50% at 20% 10%, rgba(34,211,238,.35), transparent 70%), radial-gradient(70% 50% at 90% 60%, rgba(232,121,249,.3), transparent 70%), #05060f; }
    .s-top { position: absolute; top: 18px; left: 26px; right: 26px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; }
    .s-live { color: #34f5b5; font-size: 10px; letter-spacing: .1em; }
    .s-label { font-size: 9.5px; letter-spacing: .18em; color: #8b93b8; margin-top: 8px; }
    .s-amount { font-family: var(--font-display); font-size: 40px; font-weight: 700; letter-spacing: -.04em; background: linear-gradient(120deg, #fff, #b9f5ff 60%, #e2c8ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .s-amount small { font-size: 14px; -webkit-text-fill-color: #8b93b8; }
    .s-bars { display: flex; align-items: flex-end; gap: 5px; height: 110px; margin: 14px 0 18px; }
    .s-bars span { flex: 1; border-radius: 5px 5px 2px 2px; background: linear-gradient(180deg, #8b5cf6, rgba(34,211,238,.15)); box-shadow: 0 0 10px rgba(139,92,246,.5); }
    .s-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.07); margin-bottom: 8px; font-size: 13px; }
    .s-row span:nth-child(2) { flex: 1; } .s-row b { font-family: var(--font-display); }
    .s-dot { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 25%, transparent); }
    .s-ai { margin-top: 12px; font-size: 12px; padding: 10px 12px; border-radius: 14px; background: linear-gradient(120deg, rgba(34,211,238,.18), rgba(139,92,246,.22), rgba(232,121,249,.18)); border: 1px solid rgba(255,255,255,.12); }
    .s-tab { position: absolute; left: 12px; right: 12px; bottom: 12px; height: 52px; border-radius: 20px; background: rgba(20,22,40,.85); border: 1px solid rgba(255,255,255,.1); display: flex; align-items: center; justify-content: space-around; }
    .s-tab i { width: 18px; height: 4px; border-radius: 4px; background: #5d6488; }
    .s-tab b { width: 42px; height: 42px; margin-top: -24px; border-radius: 15px; display: grid; place-items: center; background: var(--gradient); box-shadow: 0 0 20px rgba(139,92,246,.8); font-weight: 400; }
    .chip { position: absolute; padding: 11px 16px; border-radius: 16px; font-size: 13px; font-weight: 600; background: var(--surface-solid); border: 1px solid var(--border-strong); box-shadow: var(--shadow-lg); animation: bob 6s ease-in-out infinite; white-space: nowrap; }
    .c1 { bottom: 34%; left: -2%; } .c2 { bottom: 14%; right: 0; animation-delay: -3s; }
    @keyframes bob { 50% { transform: translateY(-12px); } }

    .platforms { display: flex; justify-content: center; align-items: center; gap: 22px; flex-wrap: wrap; padding: 22px 6vw; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
      font-family: var(--font-display); background: var(--surface); }
    .platforms b { font-size: 17px; } .platforms span { color: var(--text-muted); font-size: 13px; letter-spacing: .1em; text-transform: uppercase; }

    section h2 { font-size: clamp(30px, 4vw, 46px); letter-spacing: -.04em; text-align: center; margin: 10px 0 44px; }
    .center { text-align: center; }
    .features, .steps { padding: 90px 6vw 20px; max-width: 1300px; margin: 0 auto; }
    .f-icon { width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; font-size: 24px; margin-bottom: 18px; background: var(--gradient-soft); border: 1px solid var(--border-strong); box-shadow: 0 0 24px rgba(139,92,246,.25); }
    .feature h3 { font-size: 18px; margin-bottom: 8px; }
    .step { text-align: start; }
    .step .num { display: inline-block; font-size: 44px; font-weight: 700; background: var(--gradient); -webkit-background-clip: text; background-clip: text; color: transparent; line-height: 1; margin-bottom: 14px; }
    .step h3 { margin-bottom: 8px; }

    .final-cta { position: relative; overflow: hidden; margin: 90px 6vw 50px; padding: 80px 30px; border-radius: 36px; text-align: center; border: 1px solid var(--border-strong); background: var(--surface); }
    .final-glow { position: absolute; inset: 0; background: radial-gradient(50% 80% at 20% 0%, rgba(34,211,238,.35), transparent 70%), radial-gradient(50% 80% at 80% 100%, rgba(232,121,249,.35), transparent 70%), radial-gradient(40% 60% at 50% 50%, rgba(139,92,246,.3), transparent 70%); }
    .final-cta > *:not(.final-glow) { position: relative; }
    .final-cta h2 { margin-bottom: 12px; }
    .final-cta p { color: var(--text-muted); margin-bottom: 30px; font-size: 17px; }
    .cta-white { background: #fff; color: #1e1b4b; border: none; box-shadow: 0 0 40px rgba(255,255,255,.35); }

    .nav-links { display: flex; gap: 4px; }
    .nav-links button { background: none; border: 0; font: inherit; font-size: 14px; font-weight: 500; color: var(--text-muted); padding: 8px 12px; border-radius: 10px; cursor: pointer; }
    .nav-links button:hover { color: var(--text); background: var(--surface-2); }

    .security, .faq { padding: 90px 6vw 20px; max-width: 1300px; margin: 0 auto; }
    .sec { display: flex; gap: 16px; align-items: flex-start; }
    .sec-icon { flex: none; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-size: 21px; background: var(--success-soft); border: 1px solid var(--border-strong); }
    .sec h3 { font-size: 17px; margin-bottom: 6px; }
    .faq-list { max-width: 820px; margin: 0 auto; display: grid; gap: 12px; }
    .faq details { padding: 0; }
    .faq summary { list-style: none; cursor: pointer; padding: 20px 24px; font-weight: 600; font-size: 16px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .faq summary::-webkit-details-marker { display: none; }
    .faq summary::after { content: '+'; font-size: 22px; font-weight: 400; color: var(--primary-text); transition: transform .2s; }
    .faq details[open] summary::after { transform: rotate(45deg); }
    .faq details p { padding: 0 24px 20px; line-height: 1.65; }

    .site-footer { border-top: 1px solid var(--border); background: var(--surface); padding: 50px 6vw calc(30px + var(--safe-bottom)); }
    .f-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; max-width: 1300px; margin: 0 auto; }
    .f-brand p { margin-top: 14px; max-width: 340px; line-height: 1.6; }
    .f-col { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .f-col h4 { font-size: 13px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-muted); margin-bottom: 4px; }
    .f-col a, .f-col button { background: none; border: 0; padding: 0; font: inherit; font-size: 14px; color: var(--text); cursor: pointer; }
    .f-col a:hover, .f-col button:hover { color: var(--primary-text); text-decoration: none; }
    .f-bottom { max-width: 1300px; margin: 36px auto 0; padding-top: 22px; border-top: 1px solid var(--border); text-align: center; }

    @media (max-width: 1000px) {
      .nav-links { display: none; }
      .hero { grid-template-columns: 1fr; padding-top: 40px; }
      .hero-visual { height: 560px; }
    }
    @media (max-width: 560px) {
      .nav { padding-inline: 16px; }
      .hero { padding: 30px 16px 40px; }
      .hero-visual { height: 520px; transform: scale(.85); }
      .o1 { width: 380px; height: 380px; } .o2 { width: 300px; height: 300px; }
      .chip { display: none; }
      .features, .steps, .security, .faq { padding: 60px 16px 10px; }
      .f-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
      .f-brand { grid-column: 1 / -1; }
      .site-footer { padding-inline: 16px; }
      .final-cta { margin: 60px 16px 40px; padding: 50px 20px; }
    }
  `],
})
export class LandingComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly year = new Date().getFullYear();
  readonly bars = [40, 62, 48, 80, 55, 92, 66, 45, 74, 58];
  // Titles and texts are web.landing.<key>t / <key>d translation keys.
  readonly features = [
    { icon: '⚡', key: 'f1' },
    { icon: '📊', key: 'f2' },
    { icon: '✦', key: 'f3' },
    { icon: '🎯', key: 'f4' },
    { icon: '⤓', key: 'f5' },
    { icon: '🌐', key: 'f6' },
  ];
  readonly steps = [
    { n: '01', key: 's1' },
    { n: '02', key: 's2' },
    { n: '03', key: 's3' },
  ];
  readonly security = [
    { icon: '🔒', key: 'sec1' },
    { icon: '🏦', key: 'sec2' },
    { icon: '🗑️', key: 'sec3' },
  ];
  readonly faq = [1, 2, 3, 4, 5];

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
