import { Client } from '@stomp/stompjs';
import { QueryKey, useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { RealtimeEvent, RealtimeEventType } from '@/api/models';
import { useAuth } from '@/auth/AuthContext';
import { wsUrl } from '@/config/server';

/** Which cached queries each server event makes stale. */
const INVALIDATES: Partial<Record<RealtimeEventType, QueryKey[]>> = {
  EXPENSES_CHANGED: [['dashboard'], ['expenses'], ['budgets'], ['goals']],
  INCOMES_CHANGED: [['dashboard'], ['incomes'], ['goals']],
  BUDGETS_CHANGED: [['dashboard'], ['budgets']],
  CATEGORIES_CHANGED: [['dashboard'], ['expenses'], ['categories'], ['budgets']],
  PROFILE_CHANGED: [['dashboard'], ['goals'], ['advice', 'savings']],
  GOALS_CHANGED: [['goals'], ['advice', 'goal']],
  NOTIFICATION: [['notifications'], ['unread']],
};

const DATA_EVENTS: RealtimeEventType[] = ['EXPENSES_CHANGED', 'INCOMES_CHANGED', 'BUDGETS_CHANGED', 'CATEGORIES_CHANGED', 'PROFILE_CHANGED', 'GOALS_CHANGED'];

interface RealtimeValue {
  connected: boolean;
  /** Timestamp of the last data change pushed by the server, for the "Synced live" badge. */
  lastSync: number;
}

const RealtimeContext = createContext<RealtimeValue>({ connected: false, lastSync: 0 });

/**
 * Keeps a STOMP-over-WebSocket connection open while the user is signed in (like core/realtime.service.ts)
 * and turns server events into React Query invalidations.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, logout, refreshMe } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const adviceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    const handle = (event: RealtimeEvent) => {
      for (const key of INVALIDATES[event.type] ?? []) queryClient.invalidateQueries({ queryKey: key });
      if (event.type === 'PROFILE_CHANGED') refreshMe();
      if (event.type === 'ACCOUNT_DISABLED') logout('disabled');
      if (DATA_EVENTS.includes(event.type)) setLastSync(Date.now());
      // The AI insight is regenerated less eagerly, to stay within the free AI providers' rate limits.
      if (event.type === 'EXPENSES_CHANGED' || event.type === 'INCOMES_CHANGED') {
        if (adviceTimer.current) clearTimeout(adviceTimer.current);
        adviceTimer.current = setTimeout(() => {
          for (const kind of ['monthly', 'savings', 'goal']) queryClient.invalidateQueries({ queryKey: ['advice', kind] });
        }, 4000);
      }
    };

    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // React Native's WebSocket drops the trailing NULL of text frames; these two options work around it.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      debug: () => {},
    });
    client.onConnect = () => {
      setConnected(true);
      client.subscribe('/user/queue/events', (msg) => {
        try {
          handle(JSON.parse(msg.body));
        } catch {}
      });
    };
    client.onWebSocketClose = () => setConnected(false);
    client.onStompError = () => setConnected(false);
    client.activate();

    return () => {
      if (adviceTimer.current) clearTimeout(adviceTimer.current);
      client.deactivate();
      setConnected(false);
    };
  }, [token, queryClient, logout, refreshMe]);

  return <RealtimeContext.Provider value={{ connected, lastSync }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
