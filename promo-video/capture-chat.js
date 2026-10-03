// Re-captures only the AI chat screens (desktop + phone).
const puppeteer = require('puppeteer-core');
const BASE = 'http://localhost:4200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
  await p.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('mm_theme', 'dark'); });
  await p.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await p.type('#email', 'demo@moneymonitor.local'); await p.type('#password', 'Demo@123');
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle0' }), p.click('button[type=submit]')]);
  await p.goto(BASE + '/app/advisor', { waitUntil: 'networkidle0' });
  await p.$$eval('.tabs button', (x) => x[1].click());
  await sleep(2500);
  await p.$$eval('.chip', (c) => c[0].click()); await sleep(2500);
  await p.type('.composer .input', 'How can I save 20% of my income?'); await p.click('.composer .btn');
  await sleep(3000); await p.screenshot({ path: __dirname + '/shots/advisor-chat.png' });
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await p.goto(BASE + '/app/advisor', { waitUntil: 'networkidle0' });
  await p.$$eval('.chip', (c) => c[0].click()); await sleep(2500);
  await p.evaluate(() => document.querySelector('.chat')?.scrollIntoView()); await sleep(1500);
  await p.screenshot({ path: __dirname + '/shots/m-chat.png' });
  console.log('chat screens captured'); await b.close();
})();
