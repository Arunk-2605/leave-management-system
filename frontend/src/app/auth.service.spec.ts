import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService, LoginResponse } from './auth.service';
import { environment } from '../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: class {} }]),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store JWT and user on successful login', () => {
    const mockResponse: LoginResponse = {
      access_token: 'fake-jwt-token',
      user: { id: 1, email: 'emp@example.com', role: 'EMPLOYEE' },
    };

    service.login('emp@example.com', 'pass123').subscribe((res) => {
      expect(res.access_token).toBe('fake-jwt-token');
      expect(localStorage.getItem('jwt')).toBe('fake-jwt-token');
      expect(service.token).toBe('fake-jwt-token');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should clear token and user on logout', () => {
    localStorage.setItem('jwt', 'token123');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'a@b.com', role: 'EMPLOYEE' }));

    service.logout();

    expect(localStorage.getItem('jwt')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(service.token).toBeNull();
  });
});
