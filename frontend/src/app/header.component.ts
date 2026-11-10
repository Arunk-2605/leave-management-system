import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs';
import { AuthService, User } from './auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="logo">Leave Management System</div>
      <nav class="nav">
        <span class="user-role" *ngIf="role$ | async as role">{{ role }}</span>
        <button (click)="logout()" class="logout-btn">Logout</button>
      </nav>
    </header>
  `,
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);

  readonly role$ = this.authService.currentUser$.pipe(
    map((user: User | null) => user?.role ?? '')
  );

  logout(): void {
    this.authService.logout();
  }
}
