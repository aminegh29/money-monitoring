// Smoke test against a running backend: the API calls and the live-update socket the app relies on.
// Usage: node scripts/smoke-test.mjs [http://localhost:8080]
import { Client } from '@stomp/stompjs';

const server = process.argv[2] ?? 'http://localhost:8080';
const api = `${server}/api`;
let token = '';

async function call(method, path, body) {
  const res = await fetch(api + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : undefined;
}

function check(label, ok) {
  console.log(`${ok ? '✔' : '✘'} ${label}`);
  if (!ok) process.exitCode = 1;
}

const month = new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);

const login = await call('POST', '/auth/login', { email: 'demo@moneymonitor.local', password: 'Demo@123' });
token = login.token;
check(`login as ${login.user.email} (${login.user.currency})`, !!token);

const dash = await call('GET', `/dashboard?month=${month}`);
check(`dashboard: ${dash.byCategory.length} categories, ${dash.trend.length} trend months, ${dash.recent.length} recent`, Array.isArray(dash.trend));

const cats = await call('GET', '/categories');
check(`categories: ${cats.length}`, cats.length > 0);

const status = await call('GET', '/ai/status');
check(`ai status: ${status.provider} configured=${status.configured}`, typeof status.configured === 'boolean');

const unread = await call('GET', '/notifications/unread-count');
check(`unread notifications: ${unread.count}`, typeof unread.count === 'number');

// Live updates: same client options as src/realtime/RealtimeProvider.tsx.
const events = [];
const client = new Client({
  brokerURL: server.replace(/^http/, 'ws') + '/ws',
  connectHeaders: { Authorization: `Bearer ${token}` },
  forceBinaryWSFrames: true,
  appendMissingNULLonIncoming: true,
  reconnectDelay: 0,
  debug: () => {},
});
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('STOMP connect timeout')), 8000);
  client.onConnect = () => {
    clearTimeout(timer);
    client.subscribe('/user/queue/events', (m) => events.push(JSON.parse(m.body).type));
    resolve();
  };
  client.onStompError = (f) => reject(new Error(f.headers.message));
  client.activate();
});
check('websocket connected', true);

const created = await call('POST', '/expenses', {
  amount: 12.34, description: 'Smoke test (mobile)', date: today, paymentMethod: 'CARD', categoryId: cats[0].id,
});
check(`expense created #${created.id}`, created.description === 'Smoke test (mobile)');
await new Promise((r) => setTimeout(r, 1500));
check(`live event received: ${events.join(', ') || 'none'}`, events.includes('EXPENSES_CHANGED'));

await call('DELETE', `/expenses/${created.id}`);
check('expense deleted', true);

const pdf = await fetch(`${api}/reports/monthly?month=${month}`, { headers: { Authorization: `Bearer ${token}` } });
const bytes = new Uint8Array(await pdf.arrayBuffer());
check(`monthly PDF: HTTP ${pdf.status}, ${bytes.length} bytes, starts with %PDF`, pdf.ok && String.fromCharCode(...bytes.slice(0, 4)) === '%PDF');

// Languages: the AI answers in the user's language; the demo account is put back to its language afterwards.
const originalLang = login.user.language ?? 'en';
check(`profile language: ${originalLang}`, typeof login.user.language === 'string');
const fr = await call('PUT', '/profile/language', { language: 'fr' });
check('switch language to French', fr.language === 'fr');
const savingsFr = await call('GET', '/ai/advice/savings');
check(`savings plan in French (${savingsFr.source}): "${savingsFr.content.split('\n')[0]}"`, /Où vous en êtes|###/.test(savingsFr.content));
const ar = await call('PUT', '/profile/language', { language: 'ar' });
const monthlyAr = await call('GET', `/ai/advice/monthly?month=${month}`);
check(`monthly advice in Arabic: "${monthlyAr.content.split('\n')[0]}"`, ar.language === 'ar' && /[؀-ۿ]/.test(monthlyAr.content));
await call('PUT', '/profile/language', { language: originalLang });

// Goals: create, deposit (switches tracking to MANUAL), AI plan, clean up.
const deadline = new Date(); deadline.setMonth(deadline.getMonth() + 10);
const goal = await call('POST', '/goals', { name: 'Smoke test goal', icon: '🎯', targetAmount: 5000, deadline: deadline.toISOString().slice(0, 10) });
check(`goal created: ${goal.monthsLeft} months left, needs ${goal.requiredPerMonth}/month, ${goal.trackingMode}, ${goal.status}`, goal.monthsLeft === 10 && goal.trackingMode === 'AUTO' && goal.status !== 'COMPLETED');
const afterDeposit = await call('POST', `/goals/${goal.id}/deposits`, { amount: 600, date: today, note: 'first' });
check(`deposit recorded: saved ${afterDeposit.savedAmount} (${afterDeposit.percent}%), ${afterDeposit.trackingMode}`, Number(afterDeposit.savedAmount) === 600 && afterDeposit.trackingMode === 'MANUAL');
const plan = await call('GET', `/ai/goals/${goal.id}/plan`);
check(`goal plan (${plan.source}): ${plan.content.length} chars`, plan.content.includes('###'));
const goals = await call('GET', '/goals');
check(`goals listed: ${goals.length}`, goals.some((g) => g.id === goal.id));
await call('DELETE', `/goals/${goal.id}`);
check('goal deleted', true);

await client.deactivate();
