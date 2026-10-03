// Captures every screen of Money Monitor (desktop + phone) for the promo video.
// Requires the backend on :8080 and the frontend on :4200.
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE = 'http://localhost:4200';
const API = 'http://localhost:8080/api';
const OUT = __dirname + '/shots';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const shot = async (name, wait = 1500) => {
    await sleep(wait);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('captured', name);
  };
  const go = (path) => page.goto(BASE + path, { waitUntil: 'networkidle0' });
  const desktop = () => page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
  const phone = () => page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const login = async (email, pw) => {
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mm_theme', 'dark'); });
    await go('/login');
    await page.type('#email', email, { delay: 10 });
    await page.type('#password', pw, { delay: 10 });
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type=submit]')]);
  };
  const prevMonth = async () => {
    await page.click('.month-picker .icon-btn');
    await sleep(1200);
  };
  const clickText = async (selector, text) => {
    await page.$$eval(selector, (els, t) => els.find((e) => e.textContent.includes(t))?.click(), text);
  };

  // ------------------------------------------------ Public pages (desktop)
  await desktop();
  await go('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mm_theme', 'dark'); });
  await go('/');
  await shot('landing', 2500);
  await page.evaluate(() => window.scrollTo(0, 900));
  await shot('landing-features', 1200);
  await go('/register');
  await page.type('#name', 'Amine Gharbaoui', { delay: 5 });
  await page.type('#email', 'amine@example.com', { delay: 5 });
  await page.type('#password', 'Str0ng!Pass2026', { delay: 5 });
  await shot('register', 800);
  await go('/login');
  await page.type('#email', 'demo@moneymonitor.local');
  await page.type('#password', 'Demo@123');
  await shot('login', 600);
  await go('/forgot-password');
  await page.type('#email', 'demo@moneymonitor.local');
  await page.click('button[type=submit]');
  await shot('forgot-sent', 1500);
  // Real reset link: request one and read the token from the backend console output.
  const log = fs.readFileSync(process.argv[2], 'utf8');
  const token = [...log.matchAll(/reset-password\?token=([\w-]+)/g)].pop()?.[1];
  await go('/reset-password?token=' + token);
  await page.type('#password', 'N3wPassw0rd!');
  await page.type('#confirm', 'N3wPassw0rd!');
  await shot('reset', 900);

  // ------------------------------------------------ User app (desktop)
  await login('demo@moneymonitor.local', 'Demo@123');
  await shot('dashboard', 3000);
  await page.evaluate(() => window.scrollTo(0, 560));
  await shot('dashboard-charts', 1500);
  await page.evaluate(() => window.scrollTo(0, 99999));
  await shot('dashboard-bottom', 2500);
  await page.evaluate(() => window.scrollTo(0, 0));

  // Add expense modal, filled in
  await page.click('.topbar .btn-primary');
  await sleep(700);
  await page.type('#amount', '1250');
  await clickText('.cat-option', 'Shopping');
  await page.type('#description', 'New sneakers');
  await shot('add-expense', 800);
  // Submit → real-time budget alert toast + live sync badge on the dashboard
  await page.click('.modal button[type=submit]');
  await shot('realtime-alert', 1300);

  // Notifications dropdown
  await page.click('.bell');
  await shot('bell', 900);
  await page.click('.bell');

  await go('/app/expenses');
  await prevMonth();
  await shot('expenses', 1200);
  await page.type('.search .input', 'sushi');
  await shot('expenses-search', 1400);

  await go('/app/income');
  await prevMonth();
  await shot('income', 1000);

  await go('/app/budgets');
  await shot('budgets', 1500);

  await go('/app/categories');
  await shot('categories', 1200);

  await go('/app/advisor');
  await prevMonth();
  await shot('advisor', 3500);
  await page.$$eval('.tabs button', (b) => b[1].click());
  await shot('advisor-year', 3500);
  await page.$$eval('.chip', (c) => c[0].click());
  await sleep(2500);
  await page.type('.composer .input', 'How can I save 20% of my income?');
  await page.click('.composer .btn');
  await shot('advisor-chat', 3000);

  await go('/app/reports');
  await shot('reports', 1200);

  await go('/app/notifications');
  await shot('notifications', 1200);

  await go('/app/profile');
  await shot('profile', 1200);

  // Light theme
  await page.evaluate(() => localStorage.setItem('mm_theme', 'light'));
  await go('/app/dashboard');
  await shot('dashboard-light', 3000);
  await page.evaluate(() => localStorage.setItem('mm_theme', 'dark'));

  // ------------------------------------------------ Phone screens
  await phone();
  await go('/app/dashboard');
  await shot('m-dashboard', 3000);
  await page.evaluate(() => window.scrollTo(0, 1250));
  await shot('m-dashboard-charts', 1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await go('/app/expenses');
  await prevMonth();
  await shot('m-expenses', 1500);
  await page.click('.fab');
  await sleep(600);
  await page.type('#amount', '86');
  await clickText('.cat-option', 'Restaurants');
  await page.type('#description', 'Brunch with friends');
  await shot('m-add', 800);
  await page.keyboard.press('Escape');
  await sleep(500);
  await page.click('.tabbar .tab:last-child');
  await shot('m-more', 900);
  await go('/app/advisor');
  await page.$$eval('.chip', (c) => c[0].click());
  await sleep(2000);
  await page.evaluate(() => document.querySelector('.chat')?.scrollIntoView());
  await shot('m-chat', 2000);
  await go('/app/budgets');
  await shot('m-budgets', 1500);
  await go('/app/reports');
  await shot('m-reports', 1200);

  // Phone sign-in screen
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mm_theme', 'dark'); });
  await go('/login');
  await shot('m-login', 1500);

  // ------------------------------------------------ Admin (desktop)
  await desktop();
  await login('admin@moneymonitor.local', 'Admin@123');
  await shot('admin', 2500);
  await go('/admin/users');
  await shot('admin-users', 1500);

  // ------------------------------------------------ PDF reports
  const token2 = await (await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@moneymonitor.local', password: 'Demo@123' }),
  })).json().then((r) => r.token).catch(() => null);
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const m = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  for (const [file, url] of [['report-month.pdf', `/reports/monthly?month=${m}`], ['report-year.pdf', `/reports/yearly?year=${now.getFullYear()}`]]) {
    const res = await fetch(API + url, { headers: { Authorization: 'Bearer ' + token2 } });
    fs.writeFileSync(`${OUT}/${file}`, Buffer.from(await res.arrayBuffer()));
    console.log('saved', file, res.status);
  }

  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
