import { effect, inject, Injectable, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { filter, Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { wsUrl } from './config';
import { RealtimeEvent, RealtimeEventType } from './models';

/**
 * Keeps a STOMP-over-WebSocket connection open while the user is signed in and exposes
 * server events (data changes, notifications, admin activity) as an observable.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private client: Client | null = null;
  private events$ = new Subject<RealtimeEvent>();

  readonly connected = signal(false);

  constructor() {
    effect(() => {
      const token = this.auth.token();
      const admin = this.auth.isAdmin();
      this.disconnect();
      if (token) this.connect(token, admin);
    });
  }

  /** Events of the given types (all events when no type is given). */
  on(...types: RealtimeEventType[]): Observable<RealtimeEvent> {
    return this.events$.pipe(filter((e) => types.length === 0 || types.includes(e.type)));
  }

  private connect(token: string, admin: boolean) {
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });
    client.onConnect = () => {
      this.connected.set(true);
      client.subscribe('/user/queue/events', (msg) => this.emit(msg.body));
      if (admin) client.subscribe('/topic/admin', (msg) => this.emit(msg.body));
    };
    client.onWebSocketClose = () => this.connected.set(false);
    client.onStompError = () => this.connected.set(false);
    client.activate();
    this.client = client;
  }

  private emit(body: string) {
    try {
      this.events$.next(JSON.parse(body));
    } catch {}
  }

  private disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.connected.set(false);
  }
}
