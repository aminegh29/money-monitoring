import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, TranslatePipe } from '../../core/i18n';
import { ThemeService } from '../../core/ui.service';
import { LogoComponent } from '../../shared/fx';
import { LanguageSelectComponent } from '../../shared/language-select.component';
import { IconComponent } from '../../shared/icon.component';

/** Privacy policy and terms of use. The route data picks the page ('privacy' | 'terms'). */
@Component({
  selector: 'app-legal',
  imports: [RouterLink, LogoComponent, TranslatePipe, LanguageSelectComponent, IconComponent],
  template: `
    <header class="nav">
      <a routerLink="/" class="brand"><app-logo [size]="28" /><span>Money Monitor</span></a>
      <div class="nav-actions">
        <app-language-select />
        <button class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="(theme.theme() === 'light' ? 'web.nav.darkMode' : 'web.nav.lightMode') | t">
          <app-icon [name]="theme.theme() === 'light' ? 'moon' : 'sun'" [size]="17" />
        </button>
      </div>
    </header>

    <article class="doc">
      <a routerLink="/" class="back small">{{ 'web.legal.back' | t }}</a>
      <h1>{{ 'web.legal.' + page() + 'Title' | t }}</h1>
      <p class="dim small">{{ 'web.legal.updated' | t: { date: updated() } }}</p>
      <p class="intro">{{ 'web.legal.' + page() + 'Intro' | t }}</p>

      @for (n of sections; track n) {
        <section class="card">
          <h2>{{ 'web.legal.' + prefix() + n + 't' | t }}</h2>
          <p class="muted">{{ 'web.legal.' + prefix() + n + 'd' | t }}</p>
        </section>
      }

      <p class="other small">
        @if (page() === 'privacy') {
          <a routerLink="/terms">{{ 'web.landing.terms' | t }} →</a>
        } @else {
          <a routerLink="/privacy">{{ 'web.landing.privacy' | t }} →</a>
        }
      </p>
    </article>

    <footer class="dim small">{{ 'web.landing.rights' | t: { year: year } }}</footer>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: calc(16px + var(--safe-top)) 6vw 16px; border-bottom: 1px solid var(--border);
      background: var(--bg); position: sticky; top: 0; z-index: 10; }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--text); }
    .brand:hover { text-decoration: none; }
    .nav-actions { display: flex; gap: 10px; align-items: center; }
    .doc { max-width: 780px; margin: 0 auto; padding: 50px 24px 40px; }
    .back { display: inline-block; margin-bottom: 24px; }
    h1 { font-size: clamp(32px, 5vw, 46px); letter-spacing: -.04em; margin-bottom: 8px; }
    .intro { font-size: 17px; color: var(--text-muted); line-height: 1.65; margin: 22px 0 30px; }
    section { margin-bottom: 14px; }
    section h2 { font-size: 18px; margin-bottom: 8px; }
    section p { line-height: 1.7; }
    .other { margin-top: 30px; text-align: center; }
    footer { text-align: center; padding: 10px 16px calc(40px + var(--safe-bottom)); }
    @media (max-width: 560px) { .nav { padding-inline: 16px; } .doc { padding: 32px 16px; } }
  `],
})
export class LegalComponent {
  /** Set by the route's data. */
  readonly page = input<'privacy' | 'terms'>('privacy');
  readonly theme = inject(ThemeService);
  private i18n = inject(I18nService);
  readonly year = new Date().getFullYear();
  readonly sections = [1, 2, 3, 4, 5, 6];
  readonly prefix = computed(() => (this.page() === 'privacy' ? 'p' : 't'));
  readonly updated = computed(() => {
    const lang = this.i18n.lang();
    return new Date(2026, 9, 4).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  });
}
