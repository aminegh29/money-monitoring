# 🎬 Money Monitor promo video

`MoneyMonitor-Promo.mp4` is a 2-minute, 1920×1080, 30 fps motion-graphics promo built from real screens of the app,
with an **original synthwave soundtrack** generated from scratch by `music.py`. You own it, so there are no
copyright claims when you post it on YouTube, Instagram, TikTok or LinkedIn.

## Storyboard (synced to the music at 120 BPM)

| Time | Scene | Music |
|---|---|---|
| 0:00 | Neon logo draws itself, "Money Monitor", tagline | Atmospheric intro + riser |
| 0:06 | Hook: "Where did your money go?" → "Find out. In real time." | Build-up + snare roll |
| 0:12 | **Meet Money Monitor**: landing page on a 3D laptop + phone | 💥 Drop |
| 0:18 | Join in seconds: register, sign in, forgot / reset password (coverflow) | |
| 0:26 | Live dashboard: net balance, savings rate, projections, cash flow, categories, AI insight | |
| 0:36 | Add an expense in 2 taps → real-time budget alert + live sync on phone | |
| 0:44 | Expenses: search · filter · CSV export | |
| 0:50 | Income & smart budgets | |
| 0:56 | Custom categories & live notifications | |
| 1:00 | **Meet Penny**, the AI money coach | Breakdown |
| 1:04 | Personal monthly AI review | Build-up |
| 1:08 | AI chat: "Ask anything" (desktop + phone) | 💥 Drop 2 |
| 1:14 | Year in review | |
| 1:18 | 100% free AI: Groq · Gemini · Ollama | |
| 1:20 | Beautiful PDF reports: monthly & annual | |
| 1:30 | Dark / light theme wipe | |
| 1:36 | Profile, goals & notifications | |
| 1:42 | Built-in admin panel | |
| 1:48 | "In your pocket": iOS & Android phone carousel | |
| 1:56 | Outro: logo, "Track. Save. Grow.", call to action | 💥 Final hit |

## Re-render

Needs Node, Python, Microsoft Edge (already on Windows) and `pip install imageio-ffmpeg scipy numpy pymupdf`.

```bash
cd promo-video
npm install                 # puppeteer-core
# 1. (optional) re-capture app screens: backend on :8080 + frontend on :4200 running
node capture.js ../path/to/backend-console.log   # the log is used to read a real password-reset link
# 2. soundtrack
python music.py             # -> music.wav
# 3. video
node render.js --preview 15,40,70    # quick stills to check
node render.js                       # -> MoneyMonitor-Promo.mp4 (about 10-15 min)
```

- **Change texts, timings or animations:** edit `compose.html`. Every scene is a function of time, so a frame always looks the same.
- **Change the cut points or the drops:** edit `timeline.json`, then run `music.py` again so the music follows.
- **AI screens:** they were recorded with `mock_ai.py`, a stand-in for the AI provider that writes advice from the real
  numbers in the app. To record with a real model instead, set `AI_PROVIDER` and `AI_API_KEY` on the backend and run `capture.js` again.

## Formats for social media

```bash
# Vertical 9:16 (TikTok / Reels / Shorts), blurred background fill
ffmpeg -i MoneyMonitor-Promo.mp4 -filter_complex "[0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30[bg];[0]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:a copy promo-vertical.mp4
# Square 1:1 (Instagram feed)
ffmpeg -i MoneyMonitor-Promo.mp4 -vf "crop=1080:1080" -c:a copy promo-square.mp4
```
