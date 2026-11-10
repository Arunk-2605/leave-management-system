import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../header.component';
import { LeaveService, LeaveRequest } from '../leave.service';
import { AuthService, User } from '../auth.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
    <app-header></app-header>
    <main class="dashboard-container">
      <div class="welcome-section">
        <h1>Manager Dashboard</h1>
        <p *ngIf="currentUser">Team Leave Requests for {{ currentUser.firstName || currentUser.email }}</p>
      </div>

      <section class="team-section">
        <div class="section-header">
          <h2>Direct Reports' Requests</h2>
          <button (click)="loadTeamLeaves()" class="refresh-btn">Refresh</button>
        </div>

        <div *ngIf="loading" class="loading-text">Loading team requests...</div>
        <div *ngIf="!loading && teamRequests.length === 0" class="empty-text">
          No team leave requests found.
        </div>

        <div class="table-responsive" *ngIf="!loading && teamRequests.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Employee Reason</th>
                <th>Rejection Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let req of teamRequests">
                <td>
                  <strong>{{ req.user?.firstName }} {{ req.user?.lastName }}</strong>
                  <br />
                  <small class="text-muted">{{ req.user?.email }}</small>
                </td>
                <td>{{ req.leaveType?.name || 'Leave' }}</td>
                <td>{{ req.startDate | date:'mediumDate' }} - {{ req.endDate | date:'mediumDate' }}</td>
                <td>{{ req.reason || '-' }}</td>
                <td>{{ req.rejectionReason || '-' }}</td>
                <td>
                  <span class="badge" [ngClass]="'badge-' + req.status.toLowerCase()">
                    {{ req.status }}
                  </span>
                </td>
                <td>
                  <div class="actions-cell" *ngIf="req.status === 'PENDING'">
                    <button (click)="onApprove(req.id)" class="approve-btn">Approve</button>
                    <button (click)="onReject(req.id)" class="reject-btn">Reject</button>
                  </div>
                  <span *ngIf="req.status !== 'PENDING'" class="text-muted">Decided</span>
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
    .team-section {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.5rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      h2 { font-size: 1.25rem; color: #1e293b; margin: 0; }
    }
    .refresh-btn {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      &:hover { background: #e2e8f0; }
    }
    .text-muted { color: #64748b; }
    .table-responsive { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
      th, td { padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; }
      th { background: #f8fafc; font-weight: 600; color: #475569; }
    }
    .actions-cell {
      display: flex;
      gap: 0.5rem;
    }
    .approve-btn {
      background: #16a34a;
      color: white;
      border: none;
      padding: 0.35rem 0.7rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      &:hover { background: #15803d; }
    }
    .reject-btn {
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.35rem 0.7rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      &:hover { background: #b91c1c; }
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
export class ManagerDashboardComponent implements OnInit {
  currentUser: User | null = null;
  teamRequests: LeaveRequest[] = [];
  loading = true;

  constructor(
    private readonly leaveService: LeaveService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((u) => (this.currentUser = u));
    this.loadTeamLeaves();
  }

  loadTeamLeaves(): void {
    this.loading = true;
    this.leaveService.getTeamLeaves().subscribe({
      next: (requests) => {
        this.teamRequests = requests;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onApprove(id: number): void {
    if (!confirm('Are you sure you want to approve this leave request?')) return;

    this.leaveService.approveLeave(id).subscribe({
      next: () => this.loadTeamLeaves(),
      error: (err: HttpErrorResponse) => {
        alert(err.error?.message || 'Failed to approve leave request.');
      },
    });
  }

  onReject(id: number): void {
    const reason = prompt('Optional rejection reason (or leave blank):');
    if (reason === null) return; // user cancelled prompt

    this.leaveService.rejectLeave(id, reason || undefined).subscribe({
      next: () => this.loadTeamLeaves(),
      error: (err: HttpErrorResponse) => {
        alert(err.error?.message || 'Failed to reject leave request.');
      },
    });
  }
}

