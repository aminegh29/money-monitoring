import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AppNotification } from '../core/models';
import { RealtimeService } from '../core/realtime.service';
import { ThemeService, ToastService } from '../core/ui.service';
import { t, TranslatePipe } from '../core/i18n';
import { ExpenseFormComponent } from '../shared/expense-form.component';
import { LanguageSelectComponent } from '../shared/language-select.component';
import { LogoComponent } from '../shared/fx';
import { TimeAgoPipe } from '../shared/pipes';
import { Native } from '../core/native';

interface NavItem {
  path: string;
  /** Translation key. */
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TimeAgoPipe, ExpenseFormComponent, LogoComponent, TranslatePipe, LanguageSelectComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly realtime = inject(RealtimeService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly moreOpen = signal(false);
  readonly bellOpen = signal(false);
  readonly quickAdd = signal(false);
  readonly notifications = signal<AppNotification[]>([]);
  readonly unread = computed(() => this.notifications().filter((n) => !n.read).length);
  readonly initials = computed(() =>
    (this.auth.user()?.fullName ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
  );

  readonly financeNav: NavItem[] = [
    { path: '/app/dashboard', label: 'web.nav.dashboard', icon: '📊' },
    { path: '/app/expenses', label: 'expenses.title', icon: '💸' },
    { path: '/app/income', label: 'income.title', icon: '💰' },
    { path: '/app/budgets', label: 'budgets.title', icon: '📊' },
    { path: '/app/goals', label: 'goals.title', icon: '🎯' },
    { path: '/app/categories', label: 'categories.title', icon: '🏷️' },
  ];
  readonly insightsNav: NavItem[] = [
    { path: '/app/advisor', label: 'web.nav.advisor', icon: '✨' },
    { path: '/app/reports', label: 'web.nav.reports', icon: '📄' },
  ];
  readonly adminNav: NavItem[] = [
    { path: '/admin', label: 'web.nav.overview', icon: '🛡️', exact: true },
    { path: '/admin/users', label: 'web.nav.users', icon: '👥' },
  ];

  /** Everything that doesn't fit in the mobile tab bar. */
  readonly moreNav = computed<NavItem[]>(() => [
    { path: '/app/goals', label: 'goals.title', icon: '🎯' },
    { path: '/app/income', label: 'income.title', icon: '💰' },
    { path: '/app/budgets', label: 'budgets.title', icon: '📊' },
    { path: '/app/categories', label: 'categories.title', icon: '🏷️' },
    { path: '/app/reports', label: 'web.nav.reportsShort', icon: '📄' },
    { path: '/app/notifications', label: 'web.nav.alerts', icon: '🔔' },
    { path: '/app/profile', label: 'web.nav.profileShort', icon: '⚙️' },
    ...(this.auth.isAdmin() ? this.adminNav : []),
  ]);

  constructor() {
    this.loadNotifications();

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.moreOpen.set(false);
        this.bellOpen.set(false);
        this.loadNotifications(); // keeps the bell in sync with the notifications page
      });

    // Global real-time handling: live notifications, profile sync across tabs, forced sign-out.
    this.realtime.on('NOTIFICATION').pipe(takeUntilDestroyed()).subscribe((e) => {
      const n = e.payload as AppNotification;
      this.notifications.update((list) => [n, ...list].slice(0, 30));
      const kind = n.type === 'WARNING' ? 'warning' : n.type === 'SUCCESS' ? 'success' : 'info';
      this.toast.show(kind, n.title, n.message);
      if (n.type === 'WARNING') Native.warning();
    });
    this.realtime.on('PROFILE_CHANGED').pipe(takeUntilDestroyed()).subscribe((e) => this.auth.setUser(e.payload));
    this.realtime.on('ACCOUNT_DISABLED').pipe(takeUntilDestroyed()).subscribe(() => this.auth.logout('disabled'));
    this.realtime.on('ADMIN_ACTIVITY').pipe(takeUntilDestroyed()).subscribe((e) => this.toast.info(t('web.nav.liveActivity'), e.payload));
  }

  loadNotifications() {
    this.api.notifications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((n) => this.notifications.set(n));
  }

  openNotification(n: AppNotification) {
    if (!n.read) {
      this.api.markRead(n.id).subscribe();
      this.notifications.update((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    this.bellOpen.set(false);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markAllRead() {
    this.api.markAllRead().subscribe(() => this.notifications.update((list) => list.map((x) => ({ ...x, read: true }))));
  }

  notificationIcon(n: AppNotification) {
    return { INFO: '💡', WARNING: '⚠️', SUCCESS: '🎉', REPORT: '📄' }[n.type];
  }

  openQuickAdd() {
    Native.tap();
    this.quickAdd.set(true);
  }

  toggleTheme() {
    Native.tap();
    this.theme.toggle();
  }

  tap() {
    Native.tap();
  }

  logout() {
    this.moreOpen.set(false);
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  closeBell(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.bell-wrap')) this.bellOpen.set(false);
  }
}
