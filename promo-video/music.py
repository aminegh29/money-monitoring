"""
Original synthwave soundtrack for the Money Monitor promo (royalty-free: generated from scratch here).
120 BPM, A minor, progression Am - F - C - G. Sections are aligned with the video timeline (timeline.json).
Output: music.wav (44.1 kHz, 16-bit stereo, 120 s).
"""
import json
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
BPM = 120
BEAT = 60 / BPM          # 0.5 s
BAR = 4 * BEAT           # 2 s
LENGTH = 120.0
N = int(SR * (LENGTH + 0.5))
rng = np.random.default_rng(7)

TL = json.load(open("timeline.json"))
DROP1, BREAK, DROP2, OUTRO = TL["drop1"], TL["breakdown"], TL["drop2"], TL["outro"]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def track():
    return np.zeros((2, N))


def place(buf, sig, t, pan=0.0, gain=1.0):
    """Add a mono signal at time t (seconds) with equal-power pan (-1..1)."""
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(sig)] += sig * l
    buf[1, i:i + len(sig)] += sig * r


def env(n, a=0.005, d=0.1, s=0.7, r=0.1, hold=None):
    """ADSR envelope of n samples."""
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = n - a - d - r if hold is None else int(hold * SR)
    hold = max(hold, 0)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(hold, s), np.linspace(s, 0, max(r, 1))])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def saw(f, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    x = (t * f * (1 + detune) + phase) % 1.0
    return 2 * x - 1


def supersaw(f, n, voices=5, spread=0.012):
    out = np.zeros(n)
    for k in range(voices):
        d = spread * (k - (voices - 1) / 2) / ((voices - 1) / 2)
        out += saw(f, n, d, rng.random())
    return out / voices


def lowpass(x, cutoff, order=2):
    cutoff = min(max(cutoff, 40), SR / 2 - 100)
    return sosfilt(butter(order, cutoff, "low", fs=SR, output="sos"), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def section(t):
    """Name of the musical section at time t."""
    if t < 6: return "intro"
    if t < DROP1: return "build"
    if t < BREAK: return "drop"
    if t < DROP2: return "breakdown"
    if t < OUTRO: return "drop"
    return "outro"


# ---------------------------------------------------------------- harmony
CHORDS = [  # (bass root midi, chord tones midi)
    (45, [57, 60, 64]),  # Am
    (41, [53, 57, 60]),  # F
    (48, [55, 60, 64]),  # C
    (43, [55, 59, 62]),  # G
]


def chord_at(t):
    return CHORDS[int(t // BAR) % 4]


# ---------------------------------------------------------------- instruments
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = highpass(rng.standard_normal(n), 3000) * np.exp(-t * 400) * 0.25
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bandpass(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):  # three quick hits = clap
        i = int(off * SR)
        e[i:] += np.exp(-(t[: n - i]) * (60 if k < 2 else 18))
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.3
    return (noise * e + tone) * 0.6


def snare_hit(vel=1.0):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    return (bandpass(rng.standard_normal(n), 1200, 7000) * np.exp(-t * 28) + np.sin(2 * np.pi * 210 * t) * np.exp(-t * 40) * 0.4) * vel


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 8000, 4) * np.exp(-t * (14 if open_ else 90))


def crash():
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 5000, 2) * np.exp(-t * 1.6) * 0.5


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    blocks = 40
    for b in range(blocks):  # sweep the band upward
        s, e = b * n // blocks, (b + 1) * n // blocks
        c = 300 * (40 ** (b / blocks))
        out[s:e] = bandpass(noise[s:e], c * 0.7, min(c * 1.4, SR / 2 - 200))
    return out * (t / dur) ** 2


def whoosh(dur=0.7):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    blocks = 24
    for b in range(blocks):
        s, e = b * n // blocks, (b + 1) * n // blocks
        x = b / blocks
        c = 400 + 5000 * np.sin(np.pi * x) ** 2
        out[s:e] = bandpass(noise[s:e], c * 0.6, min(c * 1.6, SR / 2 - 200))
    return out * np.sin(np.pi * t / dur) ** 2


def impact():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    return np.tanh(boom * 1.4) + crash()[:n] * 0.4


def pluck(f, dur, cutoff=3500):
    n = int(dur * SR)
    x = supersaw(f, n, 3, 0.006) * 0.6 + saw(f * 2, n) * 0.15
    return lowpass(x, cutoff) * env(n, 0.002, dur * 0.7, 0.15, 0.04)


def pad_note(f, dur):
    n = int(dur * SR)
    x = supersaw(f, n, 7, 0.018)
    return lowpass(x, 1800) * env(n, 0.35, 0.3, 0.8, 0.5)


def bass_note(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = saw(f, n) * 0.7 + np.sin(2 * np.pi * f * t) * 0.6
    return lowpass(x, 700) * env(n, 0.004, 0.08, 0.7, 0.03)


def lead_note(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4, 0, 1)
    x = (saw(f, n) + saw(f * 1.007, n) * 0.7 + np.sign(np.sin(2 * np.pi * f / 2 * np.cumsum(vib) / SR)) * 0.2)
    return lowpass(x, 4200) * env(n, 0.01, 0.15, 0.75, 0.12)


# Lead melody: (step in 8ths within 8 bars, midi, length in 8ths)
LEAD = [
    (0, 76, 2), (2, 76, 1), (3, 74, 1), (4, 72, 2), (6, 69, 2),
    (8, 72, 2), (10, 72, 1), (11, 74, 1), (12, 76, 2), (14, 72, 2),
    (16, 79, 2), (18, 76, 2), (20, 74, 1), (21, 72, 1), (22, 74, 2),
    (24, 74, 2), (26, 71, 2), (28, 67, 2), (30, 71, 1), (31, 74, 1),
    (32, 76, 2), (34, 76, 1), (35, 79, 1), (36, 81, 2), (38, 79, 1), (39, 76, 1),
    (40, 77, 2), (42, 76, 1), (43, 74, 1), (44, 72, 2), (46, 69, 2),
    (48, 72, 1), (49, 74, 1), (50, 76, 2), (52, 79, 2), (54, 76, 2),
    (56, 74, 4), (60, 71, 4),
]


def build():
    drums, bass, pads, arps, leads, fx = track(), track(), track(), track(), track(), track()
    K, C = kick(), clap()
    sixteenth = BEAT / 4

    # ---- drums
    t = 0.0
    while t < LENGTH:
        sec = section(t)
        b = round(t / BEAT)
        if sec == "drop" or (sec == "build" and t >= 8):
            place(drums, K, t, gain=0.8 if sec == "drop" else 0.6)
            if sec == "drop" and b % 2 == 1:
                place(drums, C, t, pan=0.0, gain=0.55)
        if sec == "drop":
            for k in range(4):  # 16th hats with accent on the off-beat
                place(drums, hat(open_=(k == 2)), t + k * sixteenth, pan=0.25 * (-1) ** k, gain=0.22 if k == 2 else 0.1)
        if sec == "breakdown":
            place(drums, hat(), t + BEAT / 2, pan=0.3, gain=0.06)
        t += BEAT

    # snare rolls + risers before each drop, fills before the outro
    for drop in (DROP1, DROP2):
        start = drop - BAR
        steps = 16
        for k in range(steps):
            tt = start + k * (BAR / steps) if k < 8 else start + BAR / 2 + (k - 8) * (BAR / 2 / 8)
            place(drums, snare_hit(0.25 + 0.75 * k / steps), tt, gain=0.5)
        for k in range(8):  # final 32nd burst
            place(drums, snare_hit(1.0), drop - BEAT / 2 + k * BEAT / 16, gain=0.35)
        place(fx, riser(BAR * 2), drop - BAR * 2, gain=0.35)
        place(fx, impact(), drop, gain=0.9)
        place(fx, crash(), drop, pan=0.2, gain=0.6)
    place(fx, riser(6.0), 0.0, gain=0.25)
    place(fx, impact(), OUTRO, gain=1.0)
    place(fx, crash(), OUTRO, gain=0.7)

    # whooshes on every scene change
    for ts in TL["cuts"]:
        place(fx, whoosh(0.6), max(ts - 0.35, 0), pan=float(rng.uniform(-0.5, 0.5)), gain=0.32)

    # ---- harmony
    for bar in range(int(LENGTH / BAR)):
        t0 = bar * BAR
        sec = section(t0)
        root, tones = chord_at(t0)
        # pads (always, except they swell in the intro)
        for m in tones:
            place(pads, pad_note(hz(m), BAR + 0.4), t0, pan=float(rng.uniform(-0.6, 0.6)), gain=0.13)
        place(pads, pad_note(hz(root + 12), BAR + 0.4), t0, gain=0.08)
        # driving 8th-note bass
        if sec in ("drop", "build") and t0 >= 8:
            for k in range(8):
                f = hz(root) * (2 if k in (3, 7) else 1)
                place(bass, bass_note(f, BEAT / 2 - 0.02), t0 + k * BEAT / 2, gain=0.28)
        elif sec == "outro" and t0 == OUTRO:
            place(bass, bass_note(hz(root), 3.5), t0, gain=0.5)
        # 16th arpeggio (filter opens during intro/build)
        if sec != "outro":
            pattern = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1], tones[0] + 12, tones[2]]
            cutoff = {"intro": 600 + 900 * (t0 / 6), "build": 1500 + 2500 * ((t0 - 6) / (DROP1 - 6)), "breakdown": 2200}.get(sec, 3800)
            for k in range(16):
                m = pattern[k % 8] + 12
                place(arps, pluck(hz(m), sixteenth * 1.6, cutoff), t0 + k * sixteenth, pan=0.45 * (-1) ** k, gain=0.15)

    # ---- lead melody in both drops (after the first 8 bars of drop 1)
    for start in (DROP1 + 8 * BAR, DROP2):
        for rep in range(4):
            base = start + rep * 8 * BAR
            for step, m, length in LEAD:
                tt = base + step * BEAT / 2
                if tt >= (BREAK if start < BREAK else OUTRO):
                    continue
                place(leads, lead_note(hz(m), length * BEAT / 2 - 0.03), tt, gain=0.3)

    # ---- sidechain pumping on bass/pads/arps during drops
    t = np.arange(N) / SR
    phase = (t % BEAT) / BEAT
    pump = 1 - 0.65 * np.exp(-phase * BEAT / 0.11)
    active = np.array([section(x) == "drop" or (section(x) == "build" and x >= 8) for x in np.arange(0, N) [::441] / SR])
    active = np.repeat(active, 441)[:N].astype(float)
    sc = 1 - active * (1 - pump)
    for tr in (bass, pads, arps):
        tr *= sc

    # ---- space: shared reverb + stereo delay on the lead
    ir_n = int(2.6 * SR)
    ir_t = np.arange(ir_n) / SR
    ir = np.stack([rng.standard_normal(ir_n), rng.standard_normal(ir_n)]) * np.exp(-ir_t * 2.4)
    ir = np.stack([lowpass(ir[0], 6000), lowpass(ir[1], 6000)])
    send = pads * 0.6 + arps * 0.8 + leads * 0.6 + drums * 0.08
    wet = np.stack([fftconvolve(send[0], ir[0])[:N], fftconvolve(send[1], ir[1])[:N]]) * 0.012
    delay = np.zeros_like(leads)
    d = int(BEAT * 0.75 * SR)
    delay[0, d:] += leads[1, :-d] * 0.35
    delay[1, 2 * d:] += leads[0, :-2 * d] * 0.25

    mix = drums * 1.0 + bass * 1.0 + pads * 0.9 + arps * 0.9 + leads * 1.0 + delay + fx * 0.9 + wet

    # intro fade-in and final fade-out
    fade_in = np.clip(t / 2.0, 0, 1)
    fade_out = np.clip((LENGTH + 0.5 - t) / 3.0, 0, 1)
    mix *= fade_in * fade_out

    # gentle glue + limiter
    mix = np.tanh(mix * 1.25)
    mix = mix / np.max(np.abs(mix)) * 0.89
    wavfile.write("music.wav", SR, (mix.T * 32767).astype(np.int16))
    print("music.wav written:", round(N / SR, 1), "s")


if __name__ == "__main__":
    build()
