import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { apiUrl } from './config';
import { Native } from './native';
import {
  AdminStats, AdminUser, Advice, AiStatus, AppNotification, Budget, Category, ChatMessage, Dashboard, Deposit, Expense,
  ExpenseRequest, Goal, GoalRequest, Income, Role, User,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Dashboard
  dashboard(month: string) {
    return this.http.get<Dashboard>(`${apiUrl()}/dashboard`, { params: { month } });
  }

  // Expenses
  expenses(month: string, categoryId?: number | null, search?: string) {
    let params = new HttpParams().set('month', month);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (search) params = params.set('search', search);
    return this.http.get<Expense[]>(`${apiUrl()}/expenses`, { params });
  }
  createExpense(body: ExpenseRequest) {
    return this.http.post<Expense>(`${apiUrl()}/expenses`, body);
  }
  updateExpense(id: number, body: ExpenseRequest) {
    return this.http.put<Expense>(`${apiUrl()}/expenses/${id}`, body);
  }
  deleteExpense(id: number) {
    return this.http.delete<void>(`${apiUrl()}/expenses/${id}`);
  }

  // Incomes
  incomes(month: string) {
    return this.http.get<Income[]>(`${apiUrl()}/incomes`, { params: { month } });
  }
  createIncome(body: Omit<Income, 'id'>) {
    return this.http.post<Income>(`${apiUrl()}/incomes`, body);
  }
  updateIncome(id: number, body: Omit<Income, 'id'>) {
    return this.http.put<Income>(`${apiUrl()}/incomes/${id}`, body);
  }
  deleteIncome(id: number) {
    return this.http.delete<void>(`${apiUrl()}/incomes/${id}`);
  }

  // Categories
  categories() {
    return this.http.get<Category[]>(`${apiUrl()}/categories`);
  }
  createCategory(body: Partial<Category>) {
    return this.http.post<Category>(`${apiUrl()}/categories`, body);
  }
  updateCategory(id: number, body: Partial<Category>) {
    return this.http.put<Category>(`${apiUrl()}/categories/${id}`, body);
  }
  deleteCategory(id: number) {
    return this.http.delete<void>(`${apiUrl()}/categories/${id}`);
  }

  // Budgets
  budgets(month: string) {
    return this.http.get<Budget[]>(`${apiUrl()}/budgets`, { params: { month } });
  }
  saveBudget(body: { categoryId: number | null; period: string; limitAmount: number }) {
    return this.http.post<Budget>(`${apiUrl()}/budgets`, body);
  }
  copyBudgets(month: string) {
    return this.http.post<Budget[]>(`${apiUrl()}/budgets/copy-previous`, null, { params: { month } });
  }
  deleteBudget(id: number) {
    return this.http.delete<void>(`${apiUrl()}/budgets/${id}`);
  }

  // Notifications
  notifications() {
    return this.http.get<AppNotification[]>(`${apiUrl()}/notifications`);
  }
  unreadCount() {
    return this.http.get<{ count: number }>(`${apiUrl()}/notifications/unread-count`).pipe(map((r) => r.count));
  }
  markRead(id: number) {
    return this.http.post<void>(`${apiUrl()}/notifications/${id}/read`, null);
  }
  markAllRead() {
    return this.http.post<void>(`${apiUrl()}/notifications/read-all`, null);
  }
  deleteNotification(id: number) {
    return this.http.delete<void>(`${apiUrl()}/notifications/${id}`);
  }

  // Profile
  updateProfile(body: { fullName: string; currency: string; monthlyIncome: number; savingsGoal: number; language: string; emailNotifications: boolean }) {
    return this.http.put<User>(`${apiUrl()}/profile`, body);
  }
  /** Permanently deletes the signed-in account and all its data (password required). */
  deleteAccount(password: string) {
    return this.http.post<void>(`${apiUrl()}/profile/delete`, { password });
  }
  setLanguage(language: string) {
    return this.http.put<User>(`${apiUrl()}/profile/language`, { language });
  }
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${apiUrl()}/profile/password`, { currentPassword, newPassword });
  }

  // AI
  aiStatus() {
    return this.http.get<AiStatus>(`${apiUrl()}/ai/status`);
  }
  monthlyAdvice(month: string, refresh = false) {
    return this.http.get<Advice>(`${apiUrl()}/ai/advice/monthly`, { params: { month, refresh } });
  }
  yearlyAdvice(year: number, refresh = false) {
    return this.http.get<Advice>(`${apiUrl()}/ai/advice/yearly`, { params: { year, refresh } });
  }
  savingsAdvice(refresh = false) {
    return this.http.get<Advice>(`${apiUrl()}/ai/advice/savings`, { params: { refresh } });
  }
  goalPlan(id: number, refresh = false) {
    return this.http.get<Advice>(`${apiUrl()}/ai/goals/${id}/plan`, { params: { refresh } });
  }
  chat(message: string, history: ChatMessage[]) {
    return this.http.post<{ reply: string; source: string }>(`${apiUrl()}/ai/chat`, { message, history });
  }

  // Goals
  goals() {
    return this.http.get<Goal[]>(`${apiUrl()}/goals`);
  }
  goal(id: number) {
    return this.http.get<Goal>(`${apiUrl()}/goals/${id}`);
  }
  createGoal(body: GoalRequest) {
    return this.http.post<Goal>(`${apiUrl()}/goals`, body);
  }
  updateGoal(id: number, body: GoalRequest) {
    return this.http.put<Goal>(`${apiUrl()}/goals/${id}`, body);
  }
  deleteGoal(id: number) {
    return this.http.delete<void>(`${apiUrl()}/goals/${id}`);
  }
  deposits(id: number) {
    return this.http.get<Deposit[]>(`${apiUrl()}/goals/${id}/deposits`);
  }
  addDeposit(id: number, body: { amount: number; date: string; note: string }) {
    return this.http.post<Goal>(`${apiUrl()}/goals/${id}/deposits`, body);
  }
  deleteDeposit(id: number, depositId: number) {
    return this.http.delete<Goal>(`${apiUrl()}/goals/${id}/deposits/${depositId}`);
  }

  // Reports (PDF blobs)
  monthlyReport(month: string) {
    return this.http.get(`${apiUrl()}/reports/monthly`, { params: { month }, responseType: 'blob' });
  }
  yearlyReport(year: number) {
    return this.http.get(`${apiUrl()}/reports/yearly`, { params: { year }, responseType: 'blob' });
  }

  // Admin
  adminStats() {
    return this.http.get<AdminStats>(`${apiUrl()}/admin/stats`);
  }
  adminUsers() {
    return this.http.get<AdminUser[]>(`${apiUrl()}/admin/users`);
  }
  setUserStatus(id: number, enabled: boolean) {
    return this.http.patch<void>(`${apiUrl()}/admin/users/${id}/status`, { enabled });
  }
  setUserRole(id: number, role: Role) {
    return this.http.patch<void>(`${apiUrl()}/admin/users/${id}/role`, { role });
  }
  deleteUser(id: number) {
    return this.http.delete<void>(`${apiUrl()}/admin/users/${id}`);
  }
}

/** Download in the browser, native share sheet in the mobile apps. */
export function downloadBlob(blob: Blob, filename: string) {
  return Native.saveFile(blob, filename);
}
