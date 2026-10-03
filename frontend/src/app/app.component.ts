import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Native } from './core/native';
import { I18nService } from './core/i18n';
import { ThemeService, ToastService } from './core/ui.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div [class]="'toast toast-' + t.kind" (click)="toast.dismiss(t.id)">
          <span class="toast-icon">{{ icons[t.kind] }}</span>
          <div>
            <strong>{{ t.title }}</strong>
            @if (t.message) { <p>{{ t.message }}</p> }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toasts { position: fixed; inset-inline-end: 22px; bottom: 22px; display: flex; flex-direction: column; gap: 10px; z-index: 2000; width: min(390px, calc(100vw - 32px)); }
    .toast { --c: var(--primary); position: relative; display: flex; gap: 12px; align-items: flex-start; overflow: hidden;
      background: var(--surface-solid); background-image: var(--gradient-soft); border: 1px solid var(--border-strong);
      border-radius: 18px; padding: 14px 16px; box-shadow: var(--shadow-lg), 0 0 30px -10px var(--c); cursor: pointer; animation: slide .35s cubic-bezier(.2, .8, .2, 1); }
    .toast::before { content: ''; position: absolute; inset-inline-start: 0; top: 0; bottom: 0; width: 3px; background: var(--c); box-shadow: 0 0 14px var(--c); }
    .toast strong { font-size: 14px; display: block; font-family: var(--font-display); }
    .toast p { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .toast-icon { font-size: 18px; line-height: 1.25; }
    .toast-success { --c: var(--success); }
    .toast-error { --c: var(--danger); }
    .toast-warning { --c: var(--warning); }
    .toast-info { --c: var(--cyan); }
    @keyframes slide { from { opacity: 0; transform: translateY(14px) scale(.96); } }
    @media (max-width: 960px) {
      .toasts { top: calc(12px + var(--safe-top)); bottom: auto; left: 16px; right: 16px; width: auto; }
      @keyframes slide { from { opacity: 0; transform: translateY(-14px) scale(.96); } }
    }
  `],
})
export class AppComponent {
  readonly toast = inject(ToastService);
  readonly icons = { success: '✅', error: '⛔', warning: '⚠️', info: '⚡' };

  constructor() {
    inject(ThemeService); // applies the saved theme on startup
    inject(I18nService); // applies the saved language and text direction
    Native.init();
  }
}
