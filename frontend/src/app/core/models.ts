export type Role = 'USER' | 'ADMIN';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE' | 'OTHER';
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'REPORT';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer', icon: '🏦' },
  { value: 'MOBILE', label: 'Mobile payment', icon: '📱' },
  { value: 'OTHER', label: 'Other', icon: '🔹' },
];

export const CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'CAD', 'CHF', 'DZD', 'TND', 'XOF', 'SAR', 'AED'];

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  enabled: boolean;
  currency: string;
  monthlyIncome: number;
  savingsGoal: number;
  language: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  essential: boolean;
  custom: boolean;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  category: Category;
  createdAt: string;
}

export interface ExpenseRequest {
  amount: number;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  categoryId: number;
}

export interface Income {
  id: number;
  amount: number;
  source: string;
  date: string;
}

export interface Budget {
  id: number;
  category: Category | null;
  period: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  percent: number;
}

export interface CategorySpend {
  categoryId: number;
  name: string;
  icon: string;
  color: string;
  essential: boolean;
  amount: number;
  percent: number;
}

export interface Dashboard {
  period: string;
  currency: string;
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  savingsRate: number;
  previousMonthExpenses: number;
  changePercent: number;
  dailyAverage: number;
  projectedMonthEnd: number;
  savingsGoal: number;
  byCategory: CategorySpend[];
  daily: { date: string; amount: number }[];
  trend: { period: string; expenses: number; income: number }[];
  budgets: Budget[];
  recent: Expense[];
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Advice {
  period: string;
  content: string;
  source: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiStatus {
  provider: string;
  model: string | null;
  configured: boolean;
}

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  enabled: boolean;
  currency: string;
  createdAt: string;
  lastLoginAt: string | null;
  expenseCount: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  newUsersThisMonth: number;
  expensesThisMonth: number;
  expensesAmountThisMonth: number;
  registrations: { period: string; count: number }[];
  aiProvider: string;
  aiConfigured: boolean;
}

export type RealtimeEventType =
  | 'EXPENSES_CHANGED' | 'INCOMES_CHANGED' | 'BUDGETS_CHANGED' | 'CATEGORIES_CHANGED' | 'PROFILE_CHANGED' | 'GOALS_CHANGED'
  | 'NOTIFICATION' | 'ACCOUNT_DISABLED' | 'ADMIN_ACTIVITY';

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: any;
}

export type GoalStatus = 'COMPLETED' | 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'OVERDUE';

/** A savings goal with the progress computed by the backend (see GoalService). */
export interface Goal {
  id: number;
  name: string;
  icon: string;
  targetAmount: number;
  initialAmount: number;
  startDate: string;
  deadline: string;
  depositsTotal: number;
  depositsCount: number;
  autoSaved: number;
  /** MANUAL when deposits exist, AUTO when progress is estimated from income minus expenses. */
  trackingMode: 'MANUAL' | 'AUTO';
  savedAmount: number;
  percent: number;
  remaining: number;
  monthsLeft: number;
  requiredPerMonth: number;
  averageMonthlySavings: number;
  projectedAmount: number;
  status: GoalStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface GoalRequest {
  name: string;
  icon: string;
  targetAmount: number;
  initialAmount: number;
  deadline: string;
}

export interface Deposit {
  id: number;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
}