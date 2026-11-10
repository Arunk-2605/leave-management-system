import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, LoginResponse } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <h2>Leave Management System</h2>
          <p>Sign in to your account</p>
        </div>
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              placeholder="e.g. employee@example.com"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              [(ngModel)]="password"
              required
              placeholder="Enter your password"
            />
          </div>
          <div *ngIf="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>
          <button type="submit" [disabled]="loading" class="submit-btn">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
      h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 0.5rem;
      }
      p {
        color: #64748b;
        font-size: 0.875rem;
      }
    }
    .form-group {
      margin-bottom: 1.25rem;
      label {
        display: block;
        margin-bottom: 0.4rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #334155;
      }
      input {
        width: 100%;
        padding: 0.65rem 0.85rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.95rem;
        box-sizing: border-box;
        transition: border-color 0.2s, box-shadow 0.2s;
        &:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
      }
    }
    .error-banner {
      background-color: #fef2f2;
      color: #b91c1c;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
      border: 1px solid #fecaca;
    }
    .submit-btn {
      width: 100%;
      padding: 0.75rem;
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
      &:hover:not([disabled]) {
        background-color: #1d4ed8;
      }
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  `],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (res: LoginResponse) => {
        const role = (res?.user?.role || 'EMPLOYEE').toLowerCase();
        this.router.navigate([`/${role}`]);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'Invalid credentials';
        this.loading = false;
      },
    });
  }
}
