import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { I18nService, isLangCode, LANGUAGES, TranslatePipe } from '../core/i18n';
import { IconComponent } from './icon.component';

/** Compact language picker. When signed in, the choice is saved on the account (the AI and the mobile app follow). */
@Component({
  selector: 'app-language-select',
  imports: [TranslatePipe, IconComponent],
  template: `
    <label class="lang" [title]="'common.language' | t">
      <app-icon name="globe" [size]="16" />
      <select [value]="i18n.lang()" (change)="change($event)" [attr.aria-label]="'common.language' | t">
        @for (l of languages; track l.code) {
          <option [value]="l.code">{{ l.name }}</option>
        }
      </select>
    </label>
  `,
  styles: [`
    .lang { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding-inline: 10px; border-radius: 8px;
      border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-muted); cursor: pointer; }
    .lang:hover { background: var(--surface-2); }
    select { background: transparent; border: none; color: var(--text); font: inherit; font-size: 13px; cursor: pointer; outline: none; }
    option { color: #16201b; background: #fff; }
  `],
})
export class LanguageSelectComponent {
  readonly i18n = inject(I18nService);
  private auth = inject(AuthService);
  readonly languages = LANGUAGES;

  change(event: Event) {
    const code = (event.target as HTMLSelectElement).value;
    if (isLangCode(code)) this.auth.changeLanguage(code);
  }
}
