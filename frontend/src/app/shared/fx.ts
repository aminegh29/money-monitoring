import { Component, Directive, effect, ElementRef, inject, input, OnDestroy } from '@angular/core';

const numberFormat = (decimals: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Animates a number from its previous value to the new one: <span [countUp]="1234.5" [decimals]="2"></span> */
@Directive({ selector: '[countUp]' })
export class CountUpDirective implements OnDestroy {
  readonly countUp = input<number | null | undefined>(0);
  readonly decimals = input(2);
  readonly suffix = input('');
  private el = inject(ElementRef<HTMLElement>);
  private current = 0;
  private frame = 0;

  constructor() {
    effect(() => {
      const target = Number(this.countUp() ?? 0);
      const decimals = this.decimals();
      const suffix = this.suffix();
      this.animate(target, decimals, suffix);
    });
  }

  private animate(target: number, decimals: number, suffix: string) {
    cancelAnimationFrame(this.frame);
    const from = this.current;
    const fmt = numberFormat(decimals);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : 900;
    const start = performance.now();
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - t, 4);
      this.current = from + (target - from) * eased;
      this.el.nativeElement.textContent = fmt.format(this.current) + suffix;
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
  }
}

/** The Money Monitor mark: a neon "M" pulse line. */
@Component({
  selector: 'app-logo',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="id" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#22d3ee" /><stop offset=".55" stop-color="#8b5cf6" /><stop offset="1" stop-color="#e879f9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="rgba(10,12,30,.85)" />
      <rect x="1" y="1" width="62" height="62" rx="17" fill="none" [attr.stroke]="'url(#' + id + ')'" stroke-opacity=".6" stroke-width="2" />
      <path class="pulse" d="M15 44V22l9 12 8-12 8 12 9-12v22" fill="none" [attr.stroke]="'url(#' + id + ')'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="49" cy="15" r="4" fill="#22d3ee"><animate attributeName="opacity" values="1;.3;1" dur="2.4s" repeatCount="indefinite" /></circle>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; filter: drop-shadow(0 0 12px rgba(139, 92, 246, .55)); }
    .pulse { stroke-dasharray: 120; stroke-dashoffset: 120; animation: draw 1.4s cubic-bezier(.6, 0, .2, 1) forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
  `],
})
export class LogoComponent {
  readonly size = input(36);
  readonly id = 'lg' + Math.random().toString(36).slice(2, 8);
}

/** Circular progress ring with neon gradient. */
@Component({
  selector: 'app-ring',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 100 100">
      <defs>
        <linearGradient [attr.id]="id" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#22d3ee" /><stop offset=".55" stop-color="#8b5cf6" /><stop offset="1" stop-color="#e879f9" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" stroke-width="9" />
      <circle cx="50" cy="50" r="42" fill="none" [attr.stroke]="color() || 'url(#' + id + ')'" stroke-width="9" stroke-linecap="round"
              [attr.stroke-dasharray]="264" [attr.stroke-dashoffset]="264 - 264 * clamped()" transform="rotate(-90 50 50)" class="arc" />
    </svg>
    <div class="center"><ng-content /></div>
  `,
  styles: [`
    :host { position: relative; display: inline-grid; place-items: center; }
    .arc { transition: stroke-dashoffset 1s cubic-bezier(.2, .8, .2, 1); filter: drop-shadow(0 0 6px rgba(139, 92, 246, .7)); }
    .center { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
  `],
})
export class RingComponent {
  readonly value = input(0); // 0..100
  readonly size = input(96);
  readonly color = input<string | null>(null);
  readonly id = 'rg' + Math.random().toString(36).slice(2, 8);
  clamped() {
    return Math.max(0, Math.min(100, this.value() || 0)) / 100;
  }
}
