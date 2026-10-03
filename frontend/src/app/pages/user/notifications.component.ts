import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AppNotification } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { TimeAgoPipe } from '../../shared/pipes';
import { TranslatePipe } from '../../core/i18n';

@Component({
  selector: 'app-notifications',
  imports: [TimeAgoPipe, TranslatePipe],
  template: `
    <div class="page narrow">
      <div class="page-header">
        <div>
          <h1>{{ 'notifications.title' | t }}</h1>
          <p>{{ 'web.notifications.subtitle' | t }}</p>
        </div>
        @if (unread() > 0) { <button class="btn btn-ghost" (click)="markAll()">{{ 'web.notifications.markAll' | t }}</button> }
      </div>
      <div class="card list">
        @for (n of items(); track n.id) {
          <div class="item" [class.unread]="!n.read">
            <span class="ico" [class]="'ico ' + n.type.toLowerCase()">{{ icon(n) }}</span>
            <div class="body" (click)="open(n)">
              <b>{{ n.title }}</b>
              <p class="muted">{{ n.message }}</p>
              <span class="small muted">{{ n.createdAt | timeAgo }}</span>
            </div>
            <button class="icon-btn danger" [title]="'common.delete' | t" (click)="remove(n)">✕</button>
          </div>
        } @empty {
          <div class="empty-state"><div class="emoji">🔕</div><h4>{{ 'notifications.none' | t }}</h4><p>{{ 'web.notifications.noneHint' | t }}</p></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .narrow { max-width: 860px; }
    .list { padding: 6px; }
    .item { display: flex; gap: 14px; align-items: flex-start; padding: 14px; border-radius: 12px; }
    .item + .item { border-top: 1px solid var(--border); }
    .item.unread { background: var(--primary-soft); }
    .body { flex: 1; cursor: pointer; }
    .body p { margin: 2px 0 4px; font-size: 13.5px; }
    .ico { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; background: var(--surface-2); }
    .ico.warning { background: var(--warning-soft); } .ico.success { background: var(--success-soft); }
    .ico.report { background: var(--primary-soft); } .ico.info { background: var(--info-soft); }
  `],
})
export class NotificationsComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly items = signal<AppNotification[]>([]);
  readonly unread = computed(() => this.items().filter((n) => !n.read).length);

  constructor() {
    this.load();
    inject(RealtimeService).on('NOTIFICATION').pipe(takeUntilDestroyed()).subscribe((e) => this.items.update((l) => [e.payload, ...l]));
  }

  load() {
    this.api.notifications().subscribe((n) => this.items.set(n));
  }

  icon(n: AppNotification) {
    return { INFO: '💡', WARNING: '⚠️', SUCCESS: '🎉', REPORT: '📄' }[n.type];
  }

  open(n: AppNotification) {
    if (!n.read) {
      this.api.markRead(n.id).subscribe();
      this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markAll() {
    this.api.markAllRead().subscribe(() => this.items.update((l) => l.map((x) => ({ ...x, read: true }))));
  }

  remove(n: AppNotification) {
    this.api.deleteNotification(n.id).subscribe(() => this.items.update((l) => l.filter((x) => x.id !== n.id)));
  }
}
