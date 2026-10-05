import { DecimalPipe } from '@angular/common';
import { IconComponent } from '../../shared/icon.component';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n';
import { Goal } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { GoalFormComponent } from '../../shared/goal-form.component';
import { goalTone } from '../../shared/goals';
import { LocalDatePipe, MoneyPipe } from '../../shared/pipes';

@Component({
  selector: 'app-goals',
  imports: [IconComponent, RouterLink, MoneyPipe, LocalDatePipe, DecimalPipe, TranslatePipe, GoalFormComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'goals.title' | t }}</h1>
          <p>{{ 'goals.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary" (click)="open(null)"><app-icon name="plus" [size]="16" />{{ 'goals.new' | t }}</button>
      </div>

      @if (loading()) {
        <div class="loading-box"><span class="spinner lg"></span></div>
      } @else if (goals().length) {
        <div class="grid grid-3">
          @for (g of goals(); track g.id) {
            <a class="card goal interactive" [routerLink]="['/app/goals', g.id]">
              <div class="row-between">
                <span class="g-icon">{{ g.icon }}</span>
                <span [class]="'badge badge-' + tone(g)">{{ 'goals.status.' + g.status | t }}</span>
              </div>
              <h3>{{ g.name }}</h3>
              <div class="amounts"><b class="num">{{ g.savedAmount | money: cur() }}</b>
                <span class="muted">{{ 'budgets.of' | t: { amount: (g.targetAmount | money: cur()) } }}</span></div>
              <div class="progress lg"><div [style.width.%]="g.percent" style="background: var(--primary)"></div></div>
              <div class="row-between small">
                <span class="muted">{{ 'goals.by' | t: { date: (g.deadline | date2) } }}</span>
                <b class="num">{{ g.percent | number: '1.0-0' }}%</b>
              </div>
              @if (g.status !== 'COMPLETED' && g.monthsLeft > 0) {
                <span class="small need">{{ 'goals.needed' | t: { amount: (g.requiredPerMonth | money: cur()) } }} · {{ 'goals.monthsLeft' | t: { n: g.monthsLeft } }}</span>
              }
              <span class="dim small">{{ (g.trackingMode === 'MANUAL' ? 'goals.manualShort' : 'goals.autoShort') | t }}</span>
            </a>
          }
        </div>
      } @else {
        <div class="card empty-state">
          <div class="empty-icon"><app-icon name="target" [size]="22" /></div>
          <h4>{{ 'goals.none' | t }}</h4>
          <p>{{ 'goals.noneHint' | t }}</p>
          <button class="btn btn-primary mt" (click)="open(null)"><app-icon name="plus" [size]="16" />{{ 'goals.new' | t }}</button>
        </div>
      }
    </div>

    @if (formOpen()) {
      <app-goal-form [goal]="editing()" (closed)="formOpen.set(false)" (saved)="load()" />
    }
  `,
  styles: [`
    .goal { display: grid; gap: 10px; color: var(--text); }
    .goal:hover { text-decoration: none; }
    .g-icon { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 20px; background: var(--surface-2); }
    .goal h3 { font-size: 16px; }
    .amounts { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
    .amounts b { font-size: 20px; font-weight: 600; }
    .progress.lg { height: 8px; }
    .need { color: var(--primary-text); font-weight: 500; }
  `],
})
export class GoalsComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  readonly goals = signal<Goal[]>([]);
  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly editing = signal<Goal | null>(null);
  readonly cur = this.auth.currency;

  constructor() {
    this.load();
    inject(RealtimeService)
      .on('GOALS_CHANGED', 'EXPENSES_CHANGED', 'INCOMES_CHANGED')
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  load() {
    this.api.goals().subscribe({
      next: (g) => {
        // Open goals first, reached ones at the end.
        this.goals.set([...g.filter((x) => x.status !== 'COMPLETED'), ...g.filter((x) => x.status === 'COMPLETED')]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(g: Goal | null) {
    this.editing.set(g);
    this.formOpen.set(true);
  }

  tone(g: Goal) {
    return goalTone(g.status);
  }
}
