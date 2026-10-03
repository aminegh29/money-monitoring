// One function per backend endpoint, mirroring frontend/src/app/core/api.service.ts and auth.service.ts.
import { http } from './client';
import {
  Advice, AiStatus, AppNotification, AuthResponse, Budget, Category, ChatMessage, Dashboard, Deposit, Expense, ExpenseRequest,
  Goal, GoalRequest, Income, User,
} from './models';

export type IncomeRequest = Omit<Income, 'id'>;
export type CategoryRequest = Pick<Category, 'name' | 'icon' | 'color' | 'essential'>;

export const api = {
  // Auth
  login: (email: string, password: string) => http.post<AuthResponse>('/auth/login', { email, password }),
  register: (body: { fullName: string; email: string; password: string; currency: string; language: string }) =>
    http.post<AuthResponse>('/auth/register', body),
  forgotPassword: (email: string) => http.post<{ message: string }>('/auth/forgot-password', { email }),
  validateResetToken: (token: string) => http.get<{ valid: boolean }>('/auth/reset-password/validate', { token }),
  resetPassword: (token: string, password: string) => http.post<{ message: string }>('/auth/reset-password', { token, password }),
  me: () => http.get<User>('/auth/me'),

  // Dashboard
  dashboard: (month: string) => http.get<Dashboard>('/dashboard', { month }),

  // Expenses
  expenses: (month: string, categoryId?: number | null, search?: string) =>
    http.get<Expense[]>('/expenses', { month, categoryId, search }),
  createExpense: (body: ExpenseRequest) => http.post<Expense>('/expenses', body),
  updateExpense: (id: number, body: ExpenseRequest) => http.put<Expense>(`/expenses/${id}`, body),
  deleteExpense: (id: number) => http.delete(`/expenses/${id}`),

  // Incomes
  incomes: (month: string) => http.get<Income[]>('/incomes', { month }),
  createIncome: (body: IncomeRequest) => http.post<Income>('/incomes', body),
  updateIncome: (id: number, body: IncomeRequest) => http.put<Income>(`/incomes/${id}`, body),
  deleteIncome: (id: number) => http.delete(`/incomes/${id}`),

  // Categories
  categories: () => http.get<Category[]>('/categories'),
  createCategory: (body: CategoryRequest) => http.post<Category>('/categories', body),
  updateCategory: (id: number, body: CategoryRequest) => http.put<Category>(`/categories/${id}`, body),
  deleteCategory: (id: number) => http.delete(`/categories/${id}`),

  // Budgets
  budgets: (month: string) => http.get<Budget[]>('/budgets', { month }),
  saveBudget: (body: { categoryId: number | null; period: string; limitAmount: number }) => http.post<Budget>('/budgets', body),
  copyBudgets: (month: string) => http.post<Budget[]>('/budgets/copy-previous', undefined, { month }),
  deleteBudget: (id: number) => http.delete(`/budgets/${id}`),

  // Notifications
  notifications: () => http.get<AppNotification[]>('/notifications'),
  unreadCount: () => http.get<{ count: number }>('/notifications/unread-count').then((r) => r.count),
  markRead: (id: number) => http.post<void>(`/notifications/${id}/read`),
  markAllRead: () => http.post<void>('/notifications/read-all'),
  deleteNotification: (id: number) => http.delete(`/notifications/${id}`),

  // Profile
  updateProfile: (body: { fullName: string; currency: string; monthlyIncome: number; savingsGoal: number; language: string }) =>
    http.put<User>('/profile', body),
  setLanguage: (language: string) => http.put<User>('/profile/language', { language }),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<{ message: string }>('/profile/password', { currentPassword, newPassword }),

  // AI
  aiStatus: () => http.get<AiStatus>('/ai/status'),
  monthlyAdvice: (month: string, refresh = false) => http.get<Advice>('/ai/advice/monthly', { month, refresh }),
  yearlyAdvice: (year: number, refresh = false) => http.get<Advice>('/ai/advice/yearly', { year, refresh }),
  savingsAdvice: (refresh = false) => http.get<Advice>('/ai/advice/savings', { refresh }),
  goalPlan: (id: number, refresh = false) => http.get<Advice>(`/ai/goals/${id}/plan`, { refresh }),
  chat: (message: string, history: ChatMessage[]) => http.post<{ reply: string; source: string }>('/ai/chat', { message, history }),

  // Goals
  goals: () => http.get<Goal[]>('/goals'),
  goal: (id: number) => http.get<Goal>(`/goals/${id}`),
  createGoal: (body: GoalRequest) => http.post<Goal>('/goals', body),
  updateGoal: (id: number, body: GoalRequest) => http.put<Goal>(`/goals/${id}`, body),
  deleteGoal: (id: number) => http.delete(`/goals/${id}`),
  deposits: (id: number) => http.get<Deposit[]>(`/goals/${id}/deposits`),
  addDeposit: (id: number, body: { amount: number; date: string; note: string }) => http.post<Goal>(`/goals/${id}/deposits`, body),
  deleteDeposit: (id: number, depositId: number) => http.delete<Goal>(`/goals/${id}/deposits/${depositId}`),
};
