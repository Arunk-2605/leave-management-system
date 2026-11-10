import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  // Employee area
  {
    path: 'employee',
    canActivate: [AuthGuard],
    data: { role: 'EMPLOYEE' },
    loadComponent: () => import('./employee/dashboard.component').then(m => m.EmployeeDashboardComponent),
  },
  {
    path: 'employee/dashboard',
    redirectTo: 'employee',
    pathMatch: 'full',
  },
  // Manager area
  {
    path: 'manager',
    canActivate: [AuthGuard],
    data: { role: 'MANAGER' },
    loadComponent: () => import('./manager/dashboard.component').then(m => m.ManagerDashboardComponent),
  },
  {
    path: 'manager/dashboard',
    redirectTo: 'manager',
    pathMatch: 'full',
  },
  // Admin area
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./admin/dashboard.component').then(m => m.AdminDashboardComponent),
  },
  {
    path: 'admin/dashboard',
    redirectTo: 'admin',
    pathMatch: 'full',
  },
  // Fallback
  { path: '**', redirectTo: '/login' },
];
