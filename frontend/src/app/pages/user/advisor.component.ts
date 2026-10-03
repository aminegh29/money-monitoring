import { Component, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { I18nService, t, tList, TranslatePipe } from '../../core/i18n';
import { Advice, AiStatus, ChatMessage } from '../../core/models';
import { Months } from '../../core/ui.service';
import { MonthPickerComponent } from '../../shared/month-picker.component';
import { MarkdownPipe, MoneyPipe, TimeAgoPipe } from '../../shared/pipes';

type Tab = 'month' | 'year' | 'savings';

@Component({
  selector: 'app-advisor',
  imports: [FormsModule, RouterLink, MonthPickerComponent, MarkdownPipe, MoneyPipe, TimeAgoPipe, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'advisor.title' | t }}</h1>
          <p>{{ 'web.advisor.subtitle' | t }}</p>
        </div>
        @if (status(); as s) {
          <span class="badge" [class.badge-success]="s.configured" [class.badge-warning]="!s.configured">
            {{ s.configured ? '🟢 ' + s.provider + ' · ' + s.model : ('web.advisor.offlineLong' | t) }}
          </span>
        }
      </div>

      <div class="layout">
        <!-- Advice -->
        <div class="card advice">
          <div class="card-header wrap">
            <div class="tabs">
              <button [class.active]="tab() === 'month'" (click)="tab.set('month')">{{ 'web.advisor.monthlyReview' | t }}</button>
              <button [class.active]="tab() === 'year'" (click)="tab.set('year')">{{ 'web.advisor.yearReview' | t }}</button>
              <button [class.active]="tab() === 'savings'" (click)="tab.set('savings')">{{ 'web.advisor.savingsPlan' | t }}</button>
            </div>
            <div class="row">
              @if (tab() === 'month') {
                <app-month-picker [(month)]="month" />
              } @else if (tab() === 'year') {
                <select class="input year" [ngModel]="year()" (ngModelChange)="year.set(+$event)">
                  @for (y of years; track y) { <option [value]="y">{{ y }}</option> }
                </select>
              }
              <button class="btn btn-ghost btn-sm" (click)="load(true)" [disabled]="loading()">↻ {{ 'common.regenerate' | t }}</button>
            </div>
          </div>

          @if (tab() === 'savings') {
            <div class="savings-intro">
              <p class="muted">{{ 'advisor.savingsIntro' | t }}</p>
              <div class="row-between">
                <b>{{ 'dashboard.savingsGoal' | t }}:
                  {{ auth.user()?.savingsGoal ? ('common.perMonth' | t: { amount: (auth.user()?.savingsGoal | money: auth.currency()) }) : '—' }}</b>
                <a routerLink="/app/profile" class="small">{{ 'advisor.changeGoal' | t }}</a>
              </div>
            </div>
          }

          @if (loading()) {
            <div class="thinking">
              <div class="orb"></div>
              <p><b>{{ 'advisor.analysing' | t }}</b></p>
              <p class="muted small">{{ 'advisor.analysingHint' | t }}</p>
            </div>
          } @else if (advice()) {
            <div class="markdown" [innerHTML]="advice()!.content | markdown"></div>
            <div class="meta muted small">
              {{ 'advisor.generated' | t: { when: (advice()!.createdAt | timeAgo), source: advice()!.source === 'rules' ? ('advisor.builtIn' | t) : advice()!.source } }}
            </div>
          } @else if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }
        </div>

        <!-- Chat -->
        <div class="card chat">
          <div class="card-header">
            <h3>💬 {{ 'advisor.askPenny' | t }}</h3>
            @if (messages().length) { <button class="btn btn-ghost btn-sm" (click)="messages.set([])">{{ 'advisor.clear' | t }}</button> }
          </div>
          <div class="messages" #scroller>
            @if (!messages().length) {
              <div class="welcome">
                <div class="emoji">🤖</div>
                <p>{{ 'advisor.chatHello' | t }}</p>
                <div class="suggestions">
                  @for (s of suggestions(); track s) { <button class="chip" (click)="send(s)">{{ s }}</button> }
                </div>
              </div>
            }
            @for (m of messages(); track $index) {
              <div class="msg" [class.me]="m.role === 'user'">
                @if (m.role === 'assistant') { <span class="bot">✨</span> }
                <div class="bubble">
                  @if (m.role === 'assistant') { <div class="markdown" [innerHTML]="m.content | markdown"></div> } @else { {{ m.content }} }
                </div>
              </div>
            }
            @if (sending()) {
              <div class="msg"><span class="bot">✨</span><div class="bubble typing"><span></span><span></span><span></span></div></div>
            }
          </div>
          <form class="composer" (ngSubmit)="send(draft)">
            <input class="input" name="draft" [(ngModel)]="draft" [placeholder]="'advisor.placeholder' | t" maxlength="2000" autocomplete="off" />
            <button class="btn btn-primary" [disabled]="!draft.trim() || sending()">{{ 'advisor.send' | t }}</button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 1.15fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
    .wrap { flex-wrap: wrap; }
    .year { width: 110px; height: 36px; }
    .advice .markdown { font-size: 14.5px; }
    .savings-intro { display: grid; gap: 8px; padding: 12px 14px; margin-bottom: 16px; border-radius: 14px; background: var(--primary-soft); }
    .meta { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); }
    .thinking { text-align: center; padding: 50px 10px; display: grid; gap: 6px; justify-items: center; }
    .orb { width: 58px; height: 58px; border-radius: 50%; background: var(--gradient); margin-bottom: 12px; animation: breathe 1.4s ease-in-out infinite; box-shadow: 0 0 40px rgba(124,58,237,.45); }
    @keyframes breathe { 50% { transform: scale(.82); opacity: .7; } }

    .chat { display: flex; flex-direction: column; height: calc(100vh - 190px); min-height: 520px; position: sticky; top: 84px; padding-bottom: 16px; }
    .messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 4px 2px 12px; }
    .welcome { text-align: center; margin: auto 0; color: var(--text-muted); }
    .welcome .emoji { font-size: 42px; margin-bottom: 8px; }
    .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
    .chip { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: 999px; padding: 8px 14px; font: inherit; font-size: 13px; cursor: pointer; }
    .chip:hover { border-color: var(--primary); color: var(--primary-text); }
    .msg { display: flex; gap: 10px; align-items: flex-end; }
    .msg.me { justify-content: flex-end; }
    .bot { width: 30px; height: 30px; border-radius: 10px; background: var(--gradient); display: grid; place-items: center; flex-shrink: 0; font-size: 14px; }
    .bubble { max-width: 85%; padding: 11px 15px; border-radius: 16px; background: var(--surface-2); border: 1px solid var(--border); font-size: 14px; border-end-start-radius: 4px; }
    .bubble .markdown p:last-child, .bubble .markdown ul:last-child { margin-bottom: 0; }
    .me .bubble { background: var(--gradient); color: #fff; border: none; border-end-start-radius: 16px; border-end-end-radius: 4px; }
    .typing { display: flex; gap: 4px; padding: 14px 16px; }
    .typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); animation: blink 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: .2s; } .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
    .composer { display: flex; gap: 10px; padding-top: 12px; border-top: 1px solid var(--border); }
    .chat { border-color: color-mix(in srgb, var(--violet) 30%, var(--border)); }
    @media (max-width: 1100px) { .chat { position: relative; top: 0; height: 70vh; min-height: 460px; } }
    @media (max-width: 760px) { .wrap .row { width: 100%; justify-content: space-between; } .bubble { max-width: 92%; } }
  `],
})
export class AdvisorComponent {
  private api = inject(ApiService);
  private i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly tab = signal<Tab>('month');
  readonly month = signal(Months.current());
  readonly year = signal(new Date().getFullYear());
  readonly years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  readonly advice = signal<Advice | null>(null);
  readonly status = signal<AiStatus | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly messages = signal<ChatMessage[]>([]);
  readonly sending = signal(false);
  draft = '';

  suggestions() {
    this.i18n.lang();
    return tList('advisor.suggestions');
  }

  constructor() {
    this.api.aiStatus().subscribe((s) => this.status.set(s));
    // Reload when the tab, period or language changes (AI texts are generated per language).
    effect(() => {
      this.tab();
      this.month();
      this.year();
      this.i18n.lang();
      untracked(() => this.load(false));
    });
  }

  load(refresh: boolean) {
    this.loading.set(true);
    this.error.set('');
    const tab = this.tab();
    const req =
      tab === 'month' ? this.api.monthlyAdvice(this.month(), refresh)
        : tab === 'year' ? this.api.yearlyAdvice(this.year(), refresh)
          : this.api.savingsAdvice(refresh);
    req.subscribe({
      next: (a) => {
        this.advice.set(a);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  send(text: string) {
    const message = text.trim();
    if (!message || this.sending()) return;
    const history = this.messages();
    this.messages.set([...history, { role: 'user', content: message }]);
    this.draft = '';
    this.sending.set(true);
    this.scrollDown();
    this.api.chat(message, history).subscribe({
      next: (r) => {
        this.messages.update((m) => [...m, { role: 'assistant', content: r.reply }]);
        this.sending.set(false);
        this.scrollDown();
      },
      error: (err) => {
        this.messages.update((m) => [...m, { role: 'assistant', content: '⚠️ ' + (errorMessage(err) || t('common.somethingWrong')) }]);
        this.sending.set(false);
      },
    });
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }
}
