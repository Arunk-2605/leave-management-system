import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../header.component';
import { LeaveService, LeaveBalance, LeaveRequest, CreateLeaveDto } from '../leave.service';
import { AuthService, User } from '../auth.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
    <app-header></app-header>
    <main class="dashboard-container">
      <div class="welcome-section">
        <h1>Employee Dashboard</h1>
        <p *ngIf="currentUser">Welcome back, {{ currentUser.firstName || currentUser.email }}!</p>
      </div>

      <!-- Balance Summary Cards -->
      <section class="balance-section">
        <h2>Leave Balances (Current Year)</h2>
        <div *ngIf="loadingBalances" class="loading-text">Loading balances...</div>
        <div *ngIf="!loadingBalances && balances.length === 0" class="empty-text">
          No balance records found.
        </div>
        <div class="cards-grid" *ngIf="!loadingBalances && balances.length > 0">
          <div class="balance-card" *ngFor="let b of balances">
            <div class="card-type">{{ b.leaveType?.name || 'Leave' }}</div>
            <div class="card-metric">
              <span class="remaining-value">{{ b.remainingDays }}</span>
              <span class="metric-label">Days Remaining</span>
            </div>
            <div class="card-details">
              <span>Total: {{ b.totalDays }}</span>
              <span>Used: {{ b.usedDays }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Leave Request Form -->
      <section class="form-section">
        <h2>Submit Leave Request</h2>
        <form (ngSubmit)="onSubmitLeave()" #leaveForm="ngForm" class="leave-form">
          <div class="form-row">
            <div class="form-group">
              <label for="leaveTypeId">Leave Type</label>
              <select id="leaveTypeId" name="leaveTypeId" [(ngModel)]="newLeave.leaveTypeId" required>
                <option [ngValue]="1">Annual Leave</option>
                <option [ngValue]="2">Sick Leave</option>
                <option [ngValue]="3">Unpaid Leave</option>
              </select>
            </div>
            <div class="form-group">
              <label for="startDate">Start Date</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                [(ngModel)]="newLeave.startDate"
                required
              />
            </div>
            <div class="form-group">
              <label for="endDate">End Date</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                [(ngModel)]="newLeave.endDate"
                required
              />
            </div>
          </div>
          <div class="form-group">
            <label for="reason">Reason (optional)</label>
            <input
              id="reason"
              name="reason"
              type="text"
              [(ngModel)]="newLeave.reason"
              placeholder="e.g. Vacation with family"
            />
          </div>

          <div *ngIf="submitError" class="error-msg">{{ submitError }}</div>
          <div *ngIf="submitSuccess" class="success-msg">{{ submitSuccess }}</div>

          <button type="submit" [disabled]="submitting" class="primary-btn">
            {{ submitting ? 'Submitting...' : 'Submit Request' }}
          </button>
        </form>
      </section>

      <!-- Leave History Table -->
      <section class="history-section">
        <h2>My Leave Requests</h2>
        <div *ngIf="loadingHistory" class="loading-text">Loading requests...</div>
        <div *ngIf="!loadingHistory && requests.length === 0" class="empty-text">
          You have not submitted any leave requests yet.
        </div>
        <div class="table-responsive" *ngIf="!loadingHistory && requests.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Rejection Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let req of requests">
                <td><strong>{{ req.leaveType?.name || 'Leave' }}</strong></td>
                <td>{{ req.startDate | date:'mediumDate' }} - {{ req.endDate | date:'mediumDate' }}</td>
                <td>{{ req.reason || '-' }}</td>
                <td>{{ req.rejectionReason || '-' }}</td>
                <td>
                  <span class="badge" [ngClass]="'badge-' + req.status.toLowerCase()">
                    {{ req.status }}
                  </span>
                </td>
                <td>
                  <button
                    *ngIf="req.status === 'PENDING'"
                    (click)="onCancelLeave(req.id)"
                    class="danger-btn"
                  >
                    Cancel
                  </button>
                  <span *ngIf="req.status !== 'PENDING'">-</span>
                </td>
              </tr>
            </tbody>
          </table>
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
    section {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      h2 { font-size: 1.25rem; color: #1e293b; margin-bottom: 1.25rem; }
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .balance-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
      .card-type { font-size: 0.875rem; font-weight: 600; color: #475569; text-transform: uppercase; }
      .card-metric {
        margin: 0.75rem 0;
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        .remaining-value { font-size: 2rem; font-weight: 700; color: #2563eb; }
        .metric-label { font-size: 0.8rem; color: #64748b; }
      }
      .card-details {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        padding-top: 0.5rem;
      }
    }
    .leave-form {
      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }
      .form-group {
        margin-bottom: 1rem;
        label { display: block; margin-bottom: 0.35rem; font-size: 0.875rem; font-weight: 500; color: #334155; }
        input, select {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          box-sizing: border-box;
          font-size: 0.9rem;
        }
      }
    }
    .primary-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      &:hover:not([disabled]) { background: #1d4ed8; }
      &:disabled { opacity: 0.6; }
    }
    .danger-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.3rem 0.65rem;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      &:hover { background: #dc2626; }
    }
    .error-msg { background: #fef2f2; color: #b91c1c; padding: 0.65rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.875rem; }
    .success-msg { background: #f0fdf4; color: #15803d; padding: 0.65rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.875rem; }
    .table-responsive { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
      th, td { padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; }
      th { background: #f8fafc; font-weight: 600; color: #475569; }
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      &-pending { background: #fef3c7; color: #92400e; }
      &-approved { background: #dcfce7; color: #166534; }
      &-rejected { background: #fee2e2; color: #991b1b; }
      &-cancelled { background: #f1f5f9; color: #475569; }
    }
  `],
})
export class EmployeeDashboardComponent implements OnInit {
  currentUser: User | null = null;
  balances: LeaveBalance[] = [];
  requests: LeaveRequest[] = [];

  loadingBalances = true;
  loadingHistory = true;
  submitting = false;
  submitError = '';
  submitSuccess = '';

  newLeave: CreateLeaveDto = {
    leaveTypeId: 1,
    startDate: '',
    endDate: '',
    reason: '',
  };

  constructor(
    private readonly leaveService: LeaveService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((u) => (this.currentUser = u));
    this.loadBalances();
    this.loadHistory();
  }

  loadBalances(): void {
    this.loadingBalances = true;
    this.leaveService.getBalance().subscribe({
      next: (b) => {
        this.balances = b;
        this.loadingBalances = false;
      },
      error: () => (this.loadingBalances = false),
    });
  }

  loadHistory(): void {
    this.loadingHistory = true;
    this.leaveService.getMyLeaves().subscribe({
      next: (r) => {
        this.requests = r;
        this.loadingHistory = false;
      },
      error: () => (this.loadingHistory = false),
    });
  }

  onSubmitLeave(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.newLeave.startDate || !this.newLeave.endDate) {
      this.submitError = 'Please select both start and end dates.';
      return;
    }

    this.submitting = true;
    this.leaveService.submitLeave(this.newLeave).subscribe({
      next: () => {
        this.submitting = false;
        this.submitSuccess = 'Leave request submitted successfully!';
        this.newLeave.startDate = '';
        this.newLeave.endDate = '';
        this.newLeave.reason = '';
        this.loadBalances();
        this.loadHistory();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.submitError = err.error?.message || 'Failed to submit leave request.';
      },
    });
  }

  onCancelLeave(id: number): void {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    this.leaveService.cancelLeave(id).subscribe({
      next: () => {
        this.loadBalances();
        this.loadHistory();
      },
      error: (err: HttpErrorResponse) => {
        alert(err.error?.message || 'Failed to cancel leave request.');
      },
    });
  }
}

