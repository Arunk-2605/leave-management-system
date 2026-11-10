import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';

export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  firstName?: string;
  lastName?: string;
  managerId?: number | null;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        this.userSubject.next(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const url = `${environment.apiBaseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((resp: LoginResponse) => {
        localStorage.setItem('jwt', resp.access_token);
        if (resp.user) {
          localStorage.setItem('user', JSON.stringify(resp.user));
          this.userSubject.next(resp.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem('jwt');
  }

  loadUserProfile(): Observable<User> {
    const url = `${environment.apiBaseUrl}/auth/profile`;
    return this.http.get<User>(url).pipe(
      tap((user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        this.userSubject.next(user);
      })
    );
  }
}
