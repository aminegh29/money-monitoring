import { Component, HostListener, input, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n';

@Component({
  selector: 'app-modal',
  imports: [TranslatePipe],
  template: `
    <div class="modal-backdrop" (click)="closed.emit()">
      <div class="modal" [style.max-width.px]="width()" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>{{ title() }}</h3>
          <button class="icon-btn" (click)="closed.emit()" [attr.aria-label]="'web.modal.close' | t">✕</button>
        </div>
        <div class="modal-body"><ng-content /></div>
      </div>
    </div>
  `,
})
export class ModalComponent {
  readonly title = input('');
  readonly width = input(520);
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closed.emit();
  }
}

@Component({
  selector: 'app-confirm',
  imports: [ModalComponent, TranslatePipe],
  template: `
    <app-modal [title]="title() || ('web.modal.sure' | t)" [width]="420" (closed)="cancel.emit()">
      <p class="muted">{{ message() }}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" (click)="cancel.emit()">{{ 'common.cancel' | t }}</button>
        <button class="btn" [class.btn-danger]="danger()" [class.btn-primary]="!danger()" (click)="confirm.emit()">
          {{ confirmLabel() || ('web.modal.confirm' | t) }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmComponent {
  readonly title = input('');
  readonly message = input('');
  readonly confirmLabel = input('');
  readonly danger = input(true);
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
