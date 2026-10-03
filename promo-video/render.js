// Renders compose.html frame-by-frame and encodes the final MP4 with the soundtrack.
//   node render.js                    -> MoneyMonitor-Promo.mp4 (1920x1080, 30 fps, 120 s)
//   node render.js --preview 3,14,30  -> preview-<t>.png stills for quick checks
const puppeteer = require('puppeteer-core');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TL = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8'));
const FPS = TL.fps, DURATION = TL.duration;
const FFMPEG = execSync('python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();

(async () => {
  const previewArg = process.argv.indexOf('--preview');
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('file:///' + path.join(__dirname, 'compose.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => window.ready);

  if (previewArg > -1) {
    for (const t of process.argv[previewArg + 1].split(',').map(Number)) {
      await page.evaluate((x) => window.render(x), t);
      await page.screenshot({ path: path.join(__dirname, `preview-${t}.png`) });
      console.log('preview', t);
    }
    await browser.close();
    return;
  }

  const out = path.join(__dirname, 'MoneyMonitor-Promo.mp4');
  const ff = spawn(FFMPEG, [
    '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'mjpeg', '-i', '-',
    '-i', path.join(__dirname, 'music.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-profile:v', 'high', '-color_range', 'tv', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '256k', '-t', String(DURATION), out,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', (d) => (ffErr = (ffErr + d).slice(-4000)));

  const total = FPS * DURATION;
  const started = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((x) => window.render(x), f / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 92, optimizeForSpeed: true });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) {
      const el = (Date.now() - started) / 1000;
      console.log(`frame ${f}/${total}  ${(f / FPS).toFixed(1)}s  elapsed ${el.toFixed(0)}s  eta ${f ? ((el / f) * (total - f)).toFixed(0) : '?'}s`);
    }
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  await browser.close();
  if (code !== 0) { console.error(ffErr); process.exit(1); }
  console.log('done ->', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB in', ((Date.now() - started) / 1000).toFixed(0), 's');
})().catch((e) => { console.error(e); process.exit(1); });
