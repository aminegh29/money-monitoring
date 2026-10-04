import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, landingGuard } from './core/guards';

// Titles are translation keys (see TranslatedTitleStrategy in app.config.ts).
export const routes: Routes = [
  { path: '', canActivate: [landingGuard], loadComponent: () => import('./pages/public/landing.component').then((m) => m.LandingComponent) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/public/login.component').then((m) => m.LoginComponent), title: 'auth.signIn' },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/public/register.component').then((m) => m.RegisterComponent), title: 'auth.createBtn' },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./pages/public/forgot-password.component').then((m) => m.ForgotPasswordComponent), title: 'auth.forgotTitle' },
  { path: 'reset-password', loadComponent: () => import('./pages/public/reset-password.component').then((m) => m.ResetPasswordComponent), title: 'auth.resetTitle' },
  { path: 'verify-email', canActivate: [guestGuard], loadComponent: () => import('./pages/public/verify-email.component').then((m) => m.VerifyEmailComponent), title: 'auth.verifyTitle' },
  { path: 'privacy', loadComponent: () => import('./pages/public/legal.component').then((m) => m.LegalComponent), data: { page: 'privacy' }, title: 'web.legal.privacyTitle' },
  { path: 'terms', loadComponent: () => import('./pages/public/legal.component').then((m) => m.LegalComponent), data: { page: 'terms' }, title: 'web.legal.termsTitle' },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/user/dashboard.component').then((m) => m.DashboardComponent), title: 'web.nav.dashboard' },
      { path: 'expenses', loadComponent: () => import('./pages/user/expenses.component').then((m) => m.ExpensesComponent), title: 'expenses.title' },
      { path: 'income', loadComponent: () => import('./pages/user/income.component').then((m) => m.IncomeComponent), title: 'income.title' },
      { path: 'budgets', loadComponent: () => import('./pages/user/budgets.component').then((m) => m.BudgetsComponent), title: 'budgets.title' },
      { path: 'goals', loadComponent: () => import('./pages/user/goals.component').then((m) => m.GoalsComponent), title: 'goals.title' },
      { path: 'goals/:id', loadComponent: () => import('./pages/user/goal-detail.component').then((m) => m.GoalDetailComponent), title: 'goals.title' },
      { path: 'categories', loadComponent: () => import('./pages/user/categories.component').then((m) => m.CategoriesComponent), title: 'categories.title' },
      { path: 'advisor', loadComponent: () => import('./pages/user/advisor.component').then((m) => m.AdvisorComponent), title: 'web.nav.advisor' },
      { path: 'reports', loadComponent: () => import('./pages/user/reports.component').then((m) => m.ReportsComponent), title: 'reports.title' },
      { path: 'notifications', loadComponent: () => import('./pages/user/notifications.component').then((m) => m.NotificationsComponent), title: 'notifications.title' },
      { path: 'profile', loadComponent: () => import('./pages/user/profile.component').then((m) => m.ProfileComponent), title: 'profile.title' },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent), title: 'web.nav.overview' },
      { path: 'users', loadComponent: () => import('./pages/admin/admin-users.component').then((m) => m.AdminUsersComponent), title: 'web.nav.users' },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/public/not-found.component').then((m) => m.NotFoundComponent), title: 'web.notFound.title' },
];
