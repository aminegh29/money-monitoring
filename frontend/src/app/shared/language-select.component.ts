import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { I18nService, isLangCode, LANGUAGES, TranslatePipe } from '../core/i18n';

/** Compact language picker. When signed in, the choice is saved on the account (the AI and the mobile app follow). */
@Component({
  selector: 'app-language-select',
  imports: [TranslatePipe],
  template: `
    <label class="lang" [title]="'common.language' | t">
      <span aria-hidden="true">🌐</span>
      <select [value]="i18n.lang()" (change)="change($event)" [attr.aria-label]="'common.language' | t">
        @for (l of languages; track l.code) {
          <option [value]="l.code">{{ l.flag }} {{ l.name }}</option>
        }
      </select>
    </label>
  `,
  styles: [`
    .lang { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding-inline: 10px; border-radius: 12px;
      border: 1px solid var(--border); background: var(--surface-2); color: var(--text); cursor: pointer; }
    select { background: transparent; border: none; color: inherit; font: inherit; font-size: 13px; cursor: pointer; outline: none; }
    option { color: #0b1030; }
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
