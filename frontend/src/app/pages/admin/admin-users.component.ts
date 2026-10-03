import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { AdminUser, Role } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { ToastService } from '../../core/ui.service';
import { ConfirmComponent } from '../../shared/modal.component';
import { TimeAgoPipe } from '../../shared/pipes';
import { t, TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, TimeAgoPipe, ConfirmComponent, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'web.admin.usersTitle' | t }}</h1>
          <p>{{ 'web.admin.usersSub' | t: { n: users().length } }}</p>
        </div>
      </div>

      <div class="card">
        <div class="filters">
          <input class="input search" [placeholder]="'web.admin.search' | t" [(ngModel)]="query" />
          <div class="tabs">
            <button [class.active]="filter() === 'all'" (click)="filter.set('all')">{{ 'web.admin.all' | t }}</button>
            <button [class.active]="filter() === 'active'" (click)="filter.set('active')">{{ 'web.admin.active' | t }}</button>
            <button [class.active]="filter() === 'disabled'" (click)="filter.set('disabled')">{{ 'web.admin.disabled' | t }}</button>
            <button [class.active]="filter() === 'admin'" (click)="filter.set('admin')">{{ 'web.admin.admins2' | t }}</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table table-cards">
            <thead><tr><th>{{ 'web.admin.user' | t }}</th><th>{{ 'web.admin.role' | t }}</th><th>{{ 'web.admin.status' | t }}</th><th>{{ 'expenses.title' | t }}</th><th>{{ 'web.admin.joined' | t }}</th><th>{{ 'web.admin.lastLogin' | t }}</th><th></th></tr></thead>
            <tbody>
              @for (u of visible(); track u.id) {
                <tr>
                  <td class="cell-main">
                    <div class="user"><span class="av">{{ u.fullName.charAt(0).toUpperCase() }}</span>
                      <div><b>{{ u.fullName }}</b> @if (u.id === me()) { <span class="badge">{{ 'web.admin.you' | t }}</span> }<div class="muted small">{{ u.email }}</div></div>
                    </div>
                  </td>
                  <td class="cell-meta">
                    <select class="input role" [ngModel]="u.role" (ngModelChange)="setRole(u, $event)" [disabled]="u.id === me()">
                      <option value="USER">{{ 'web.admin.roleUser' | t }}</option><option value="ADMIN">{{ 'web.admin.roleAdmin' | t }}</option>
                    </select>
                  </td>
                  <td class="cell-amount">
                    <button class="toggle" [class.on]="u.enabled" (click)="toggle(u)" [disabled]="u.id === me()" [title]="(u.enabled ? 'web.admin.disable' : 'web.admin.enable') | t"><span></span></button>
                  </td>
                  <td class="num hide-mobile">{{ u.expenseCount }}</td>
                  <td class="muted nowrap hide-mobile">{{ u.createdAt | timeAgo }}</td>
                  <td class="muted nowrap cell-meta">⏱ {{ u.lastLoginAt | timeAgo }}</td>
                  <td class="actions">
                    <button class="icon-btn danger" [title]="'web.admin.deleteUser' | t" (click)="toDelete.set(u)" [disabled]="u.id === me()">🗑️</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7"><div class="empty-state">{{ 'web.admin.noMatch' | t }}</div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    @if (toDelete(); as u) {
      <app-confirm [title]="'web.admin.deleteTitle' | t" [message]="'web.admin.deleteMsg' | t: { name: u.fullName }"
                   [confirmLabel]="'web.admin.deletePermanently' | t" (confirm)="remove(u)" (cancel)="toDelete.set(null)" />
    }
  `,
  styles: [`
    .filters { display: flex; gap: 12px; justify-content: space-between; flex-wrap: wrap; margin-bottom: 18px; }
    .search { max-width: 320px; }
    .user { display: flex; gap: 12px; align-items: center; }
    .av { width: 36px; height: 36px; border-radius: 11px; background: var(--primary-soft); color: var(--primary-text); display: grid; place-items: center; font-weight: 700; }
    .role { width: 110px; height: 34px; }
    .toggle { width: 44px; height: 26px; border-radius: 999px; border: none; background: var(--border); position: relative; cursor: pointer; }
    .toggle:disabled { opacity: .4; cursor: not-allowed; }
    .toggle span { position: absolute; top: 3px; inset-inline-start: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .toggle.on { background: var(--success); }
    .toggle.on span { transform: translateX(18px); }
    :host-context([dir='rtl']) .toggle.on span { transform: translateX(-18px); }
  `],
})
export class AdminUsersComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly users = signal<AdminUser[]>([]);
  readonly filter = signal<'all' | 'active' | 'disabled' | 'admin'>('all');
  readonly toDelete = signal<AdminUser | null>(null);
  readonly me = computed(() => this.auth.user()?.id);
  private q = signal('');

  get query() {
    return this.q();
  }
  set query(v: string) {
    this.q.set(v);
  }

  readonly visible = computed(() => {
    const q = this.q().toLowerCase();
    return this.users().filter((u) => {
      const f = this.filter();
      if (f === 'active' && !u.enabled) return false;
      if (f === 'disabled' && u.enabled) return false;
      if (f === 'admin' && u.role !== 'ADMIN') return false;
      return !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  });

  constructor() {
    this.load();
    inject(RealtimeService).on('ADMIN_ACTIVITY').pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.load());
  }

  load() {
    this.api.adminUsers().subscribe((u) => this.users.set(u));
  }

  toggle(u: AdminUser) {
    this.api.setUserStatus(u.id, !u.enabled).subscribe({
      next: () => {
        this.users.update((l) => l.map((x) => (x.id === u.id ? { ...x, enabled: !u.enabled } : x)));
        this.toast.success(t(u.enabled ? 'web.admin.userDisabled' : 'web.admin.userEnabled'), u.email);
      },
      error: (err) => this.toast.error(t('web.admin.actionFailed'), errorMessage(err)),
    });
  }

  setRole(u: AdminUser, role: Role) {
    this.api.setUserRole(u.id, role).subscribe({
      next: () => {
        this.users.update((l) => l.map((x) => (x.id === u.id ? { ...x, role } : x)));
        this.toast.success(t('web.admin.roleUpdated'), t('web.admin.roleNow', { name: u.fullName, role }));
      },
      error: (err) => {
        this.toast.error(t('web.admin.actionFailed'), errorMessage(err));
        this.load();
      },
    });
  }

  remove(u: AdminUser) {
    this.toDelete.set(null);
    this.api.deleteUser(u.id).subscribe({
      next: () => {
        this.users.update((l) => l.filter((x) => x.id !== u.id));
        this.toast.success(t('web.admin.userDeleted'), u.email);
      },
      error: (err) => this.toast.error(t('web.admin.actionFailed'), errorMessage(err)),
    });
  }
}
