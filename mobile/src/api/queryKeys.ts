export const qk = {
  dashboard: (month: string) => ['dashboard', month] as const,
  expenses: (month: string, categoryId: number | null, search: string) => ['expenses', month, categoryId, search] as const,
  incomes: (month: string) => ['incomes', month] as const,
  categories: ['categories'] as const,
  budgets: (month: string) => ['budgets', month] as const,
  notifications: ['notifications'] as const,
  unread: ['unread'] as const,
  aiStatus: ['aiStatus'] as const,
  goals: ['goals'] as const,
  goal: (id: number) => ['goals', id] as const,
  deposits: (id: number) => ['goals', id, 'deposits'] as const,
  // AI texts all start with 'advice' so a language switch can drop them at once.
  monthlyAdvice: (month: string) => ['advice', 'monthly', month] as const,
  yearlyAdvice: (year: number) => ['advice', 'yearly', year] as const,
  savingsAdvice: ['advice', 'savings'] as const,
  goalPlan: (id: number) => ['advice', 'goal', id] as const,
};
