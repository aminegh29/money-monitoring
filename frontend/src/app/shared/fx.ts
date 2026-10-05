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

/** The Money Monitor mark: three rising bars on the brand green. */
@Component({
  selector: 'app-logo',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#0f6e4f" />
      <rect x="15" y="35" width="9" height="14" rx="2.5" fill="#fff" fill-opacity=".55" />
      <rect x="27.5" y="27" width="9" height="22" rx="2.5" fill="#fff" fill-opacity=".8" />
      <rect x="40" y="17" width="9" height="32" rx="2.5" fill="#fff" />
    </svg>
  `,
  styles: [`:host { display: inline-flex; flex-shrink: 0; }`],
})
export class LogoComponent {
  readonly size = input(32);
}

/** Circular progress ring. */
@Component({
  selector: 'app-ring',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" stroke-width="8" />
      <circle cx="50" cy="50" r="42" fill="none" [attr.stroke]="color() || 'var(--primary)'" stroke-width="8" stroke-linecap="round"
              [attr.stroke-dasharray]="264" [attr.stroke-dashoffset]="264 - 264 * clamped()" transform="rotate(-90 50 50)" class="arc" />
    </svg>
    <div class="center"><ng-content /></div>
  `,
  styles: [`
    :host { position: relative; display: inline-grid; place-items: center; }
    .arc { transition: stroke-dashoffset .8s ease; }
    .center { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
  `],
})
export class RingComponent {
  readonly value = input(0); // 0..100
  readonly size = input(96);
  readonly color = input<string | null>(null);
  clamped() {
    return Math.max(0, Math.min(100, this.value() || 0)) / 100;
  }
}
