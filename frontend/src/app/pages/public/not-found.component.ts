import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="nf">
      <div class="code">404</div>
      <h1>{{ 'web.notFound.title' | t }}</h1>
      <p class="muted">{{ 'web.notFound.text' | t }}</p>
      <a [routerLink]="auth.isLoggedIn() ? auth.homeRoute() : '/'" class="btn btn-primary">{{ 'web.notFound.home' | t }}</a>
    </div>
  `,
  styles: [`
    .nf { min-height: 100vh; display: grid; place-content: center; text-align: center; gap: 14px; padding: 24px; }
    .code { font-size: 110px; font-weight: 800; letter-spacing: -.05em; background: var(--gradient); -webkit-background-clip: text; background-clip: text; color: transparent; line-height: 1; }
    h1 { font-size: 26px; }
    .btn { justify-self: center; margin-top: 8px; }
  `],
})
export class NotFoundComponent {
  readonly auth = inject(AuthService);
}
