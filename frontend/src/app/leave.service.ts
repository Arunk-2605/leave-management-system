import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface LeaveType {
  id: number;
  name: string;
  description?: string;
  defaultDays: number;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  leaveType?: LeaveType;
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface LeaveBalance {
  id: number;
  userId: number;
  leaveTypeId: number;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  leaveType?: LeaveType;
}

export interface CreateLeaveDto {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly baseUrl = `${environment.apiBaseUrl}/leaves`;

  constructor(private readonly http: HttpClient) {}

  getMyLeaves(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/my`);
  }

  getTeamLeaves(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/team`);
  }

  getBalance(): Observable<LeaveBalance[]> {
    return this.http.get<LeaveBalance[]>(`${this.baseUrl}/balance`);
  }

  submitLeave(dto: CreateLeaveDto): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(this.baseUrl, dto);
  }

  approveLeave(id: number, reason?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}/approve`, { reason });
  }

  rejectLeave(id: number, reason?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}/reject`, { reason });
  }

  cancelLeave(id: number): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}/cancel`, {});
  }
}

