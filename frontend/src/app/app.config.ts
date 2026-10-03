import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, Injectable, provideZoneChangeDetection } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { provideRouter, RouterStateSnapshot, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { t } from './core/i18n';

/** Route titles are translation keys; the tab shows "<translated title> · Money Monitor". */
@Injectable()
class TranslatedTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot) {
    const key = this.buildTitle(snapshot);
    this.title.setTitle(key ? `${t(key)} · Money Monitor` : 'Money Monitor');
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
  ],
};
