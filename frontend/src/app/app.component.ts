import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Native } from './core/native';
import { I18nService } from './core/i18n';
import { ThemeService, ToastService } from './core/ui.service';
import { IconComponent, IconName } from './shared/icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IconComponent],
  template: `
    <router-outlet />
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div [class]="'toast toast-' + t.kind" (click)="toast.dismiss(t.id)" role="status">
          <app-icon class="toast-icon" [name]="icons[t.kind]" [size]="18" />
          <div>
            <strong>{{ t.title }}</strong>
            @if (t.message) { <p>{{ t.message }}</p> }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toasts { position: fixed; inset-inline-end: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 2000; width: min(380px, calc(100vw - 32px)); }
    .toast { --c: var(--info); display: flex; gap: 10px; align-items: flex-start;
      background: var(--surface-solid); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;
      box-shadow: var(--shadow-lg); cursor: pointer; animation: slide .2s ease-out; }
    .toast strong { font-size: 14px; font-weight: 600; display: block; }
    .toast p { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .toast-icon { color: var(--c); margin-top: 1px; }
    .toast-success { --c: var(--success); }
    .toast-error { --c: var(--danger); }
    .toast-warning { --c: var(--warning); }
    .toast-info { --c: var(--info); }
    @keyframes slide { from { opacity: 0; transform: translateY(8px); } }
    @media (max-width: 960px) {
      .toasts { top: calc(12px + var(--safe-top)); bottom: auto; left: 16px; right: 16px; width: auto; }
      @keyframes slide { from { opacity: 0; transform: translateY(-8px); } }
    }
  `],
})
export class AppComponent {
  readonly toast = inject(ToastService);
  readonly icons: Record<string, IconName> = { success: 'circle-check', error: 'circle-x', warning: 'triangle-alert', info: 'info' };

  constructor() {
    inject(ThemeService); // applies the saved theme on startup
    inject(I18nService); // applies the saved language and text direction
    Native.init();
  }
}
