import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AdminStats, AdminUser } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { Months } from '../../core/ui.service';
import { I18nService, t, TranslatePipe } from '../../core/i18n';
import { ChartComponent } from '../../shared/chart.component';
import { IconComponent } from '../../shared/icon.component';
import { MoneyPipe, TimeAgoPipe } from '../../shared/pipes';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, ChartComponent, MoneyPipe, TimeAgoPipe, TranslatePipe, IconComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'web.admin.overviewTitle' | t }}</h1>
          <p>{{ 'web.admin.overviewSub' | t }}</p>
        </div>
        <a routerLink="/admin/users" class="btn btn-primary">{{ 'web.admin.manageUsers' | t }}</a>
      </div>

      @if (stats(); as s) {
        <div class="grid grid-4">
          <div class="card kpi"><div class="kpi-label"><span class="kpi-icon primary"><app-icon name="users" [size]="16" /></span>{{ 'web.admin.totalUsers' | t }}</div><div class="kpi-value">{{ s.totalUsers }}</div><div class="kpi-sub">{{ 'web.admin.admins' | t: { n: s.admins } }}</div></div>
          <div class="card kpi"><div class="kpi-label"><span class="kpi-icon success"><app-icon name="badge-check" [size]="16" /></span>{{ 'web.admin.activeAccounts' | t }}</div><div class="kpi-value">{{ s.activeUsers }}</div><div class="kpi-sub">{{ 'web.admin.disabledCount' | t: { n: s.totalUsers - s.activeUsers } }}</div></div>
          <div class="card kpi"><div class="kpi-label"><span class="kpi-icon warning"><app-icon name="user-plus" [size]="16" /></span>{{ 'web.admin.newThisMonth' | t }}</div><div class="kpi-value">{{ s.newUsersThisMonth }}</div><div class="kpi-sub">{{ 'web.admin.registrations' | t }}</div></div>
          <div class="card kpi"><div class="kpi-label"><span class="kpi-icon"><app-icon name="receipt" [size]="16" /></span>{{ 'web.admin.expensesMonth' | t }}</div><div class="kpi-value">{{ s.expensesThisMonth }}</div><div class="kpi-sub">{{ 'web.admin.transactionsRecorded' | t }}</div></div>
        </div>

        <div class="grid grid-3 mt">
          <div class="card span-2">
            <div class="card-header"><h3>{{ 'web.admin.registrationsTitle' | t }}</h3><span class="muted small">{{ 'dashboard.last6' | t }}</span></div>
            <app-chart [config]="chart()" [height]="260" />
          </div>
          <div class="card">
            <div class="card-header"><h3>{{ 'web.admin.system' | t }}</h3></div>
            <div class="sys">
              <div class="row-between"><span class="muted">{{ 'web.admin.aiProvider' | t }}</span><b>{{ s.aiProvider }}</b></div>
              <div class="row-between"><span class="muted">{{ 'web.admin.aiStatus' | t }}</span>
                <span class="badge" [class.badge-success]="s.aiConfigured" [class.badge-warning]="!s.aiConfigured">{{ (s.aiConfigured ? 'web.admin.connected' : 'web.admin.fallback') | t }}</span>
              </div>
              <div class="row-between"><span class="muted">{{ 'web.admin.realtimeChannel' | t }}</span>
                <span class="badge" [class.badge-success]="realtime.connected()">{{ (realtime.connected() ? 'common.live' : 'common.offline') | t }}</span>
              </div>
              <div class="row-between"><span class="muted">{{ 'web.admin.volume' | t }}</span><b>{{ s.expensesAmountThisMonth | money: 'MAD' }}</b></div>
            </div>
            @if (!s.aiConfigured) {
              <div class="alert alert-info mt small">{{ 'web.admin.aiHint' | t }}</div>
            }
          </div>
        </div>

        <div class="card mt">
          <div class="card-header"><h3>{{ 'web.admin.latestUsers' | t }}</h3><a routerLink="/admin/users" class="small">{{ 'web.admin.seeAll' | t }}</a></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>{{ 'web.admin.user' | t }}</th><th>{{ 'web.admin.role' | t }}</th><th>{{ 'web.admin.status' | t }}</th><th>{{ 'web.admin.joined' | t }}</th><th>{{ 'web.admin.lastLogin' | t }}</th></tr></thead>
              <tbody>
                @for (u of users().slice(0, 6); track u.id) {
                  <tr>
                    <td><b>{{ u.fullName }}</b><div class="muted small">{{ u.email }}</div></td>
                    <td><span class="badge" [class.badge-primary]="u.role === 'ADMIN'">{{ u.role }}</span></td>
                    <td><span class="badge" [class.badge-success]="u.enabled" [class.badge-danger]="!u.enabled">{{ (u.enabled ? 'web.admin.active' : 'web.admin.disabled') | t }}</span></td>
                    <td class="muted">{{ u.createdAt | timeAgo }}</td>
                    <td class="muted">{{ u.lastLoginAt | timeAgo }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="loading-box"><span class="spinner lg"></span></div>
      }
    </div>
  `,
  styles: [`.sys { display: grid; gap: 14px; } code { font-size: 12px; }`],
})
export class AdminDashboardComponent {
  private api = inject(ApiService);
  readonly realtime = inject(RealtimeService);
  private i18n = inject(I18nService);
  readonly stats = signal<AdminStats | null>(null);
  readonly users = signal<AdminUser[]>([]);

  readonly chart = computed<ChartConfiguration>(() => {
    const regs = this.stats()?.registrations ?? [];
    this.i18n.lang();
    return {
      type: 'bar',
      data: {
        labels: regs.map((r) => Months.label(r.period, 'short')),
        datasets: [{ label: t('web.admin.newUsers'), data: regs.map((r) => r.count), backgroundColor: 'var(--chart-1)', borderRadius: 4, maxBarThickness: 32 }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, border: { display: false }, grid: { color: 'var(--border)' }, ticks: { precision: 0 } } },
      },
    };
  });

  constructor() {
    this.load();
    this.realtime.on('ADMIN_ACTIVITY').pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.load());
  }

  load() {
    this.api.adminStats().subscribe((s) => this.stats.set(s));
    this.api.adminUsers().subscribe((u) => this.users.set(u));
  }
}
