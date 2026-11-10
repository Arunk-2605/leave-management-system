import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header.component';
import { AuthService, User } from '../auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  template: `
    <app-header></app-header>
    <main class="dashboard-container">
      <div class="welcome-section">
        <h1>Administrator Dashboard</h1>
        <p *ngIf="currentUser">Logged in as: {{ currentUser.firstName || currentUser.email }} (Role: {{ currentUser.role }})</p>
      </div>

      <div class="cards-grid">
        <div class="info-card">
          <h3>System Status</h3>
          <p class="status-live">● Operational</p>
          <p class="card-desc">NestJS Backend & PostgreSQL Database connected.</p>
        </div>

        <div class="info-card">
          <h3>Authentication & Security</h3>
          <p><strong>Role-Based Access Control:</strong> Active</p>
          <p class="card-desc">JWT strategy with bcrypt password verification.</p>
        </div>

        <div class="info-card">
          <h3>Policy Engine</h3>
          <p><strong>Team Capacity:</strong> Enforced</p>
          <p><strong>Notice Period:</strong> Enforced</p>
          <p class="card-desc">Weekend and statutory holiday exclusion active.</p>
        </div>
      </div>

      <section class="admin-details">
        <h2>Administrator Profile & Settings</h2>
        <div class="details-box" *ngIf="currentUser">
          <div class="detail-row">
            <span class="label">User ID:</span>
            <span class="value">{{ currentUser.id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Email:</span>
            <span class="value">{{ currentUser.email }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Role:</span>
            <span class="value badge-admin">{{ currentUser.role }}</span>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    .welcome-section {
      margin-bottom: 2rem;
      h1 { font-size: 1.875rem; color: #0f172a; margin-bottom: 0.25rem; }
      p { color: #64748b; }
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      h3 { font-size: 1.1rem; color: #1e293b; margin-bottom: 0.75rem; }
      .status-live { color: #16a34a; font-weight: 600; margin-bottom: 0.5rem; }
      .card-desc { font-size: 0.85rem; color: #64748b; margin-top: 0.5rem; }
    }
    .admin-details {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      h2 { font-size: 1.25rem; color: #1e293b; margin-bottom: 1.25rem; }
    }
    .details-box {
      max-width: 500px;
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid #f1f5f9;
        .label { color: #64748b; font-size: 0.9rem; font-weight: 500; }
        .value { color: #0f172a; font-size: 0.9rem; font-weight: 600; }
        .badge-admin {
          background: #3b82f6;
          color: white;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
      }
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((u) => (this.currentUser = u));
  }
}

