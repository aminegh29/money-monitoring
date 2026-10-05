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
    .nf { min-height: 100vh; display: grid; place-content: center; text-align: center; gap: 10px; padding: 24px; }
    .code { font-size: 14px; font-weight: 600; color: var(--primary-text); letter-spacing: .04em; }
    h1 { font-size: 28px; }
    .btn { justify-self: center; margin-top: 8px; }
  `],
})
export class NotFoundComponent {
  readonly auth = inject(AuthService);
}
