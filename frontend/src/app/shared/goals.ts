import { GoalStatus } from '../core/models';

/** Badge colour of a goal status (badge-success, badge-primary…). */
export function goalTone(status: GoalStatus): 'success' | 'primary' | 'warning' | 'danger' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'ON_TRACK':
      return 'primary';
    case 'AT_RISK':
      return 'warning';
    default:
      return 'danger';
  }
}

export const GOAL_ICONS = ['🎯', '🛟', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '👶', '🏖️', '🎁', '🏥', '📈', '🛋️', '🐶'];
