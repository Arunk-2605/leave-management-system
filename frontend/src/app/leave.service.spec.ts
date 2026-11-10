import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LeaveService, LeaveRequest, LeaveBalance } from './leave.service';
import { environment } from '../environments/environment';

describe('LeaveService', () => {
  let service: LeaveService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LeaveService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(LeaveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch employee leaves', () => {
    const mockLeaves: LeaveRequest[] = [
      {
        id: 1,
        userId: 1,
        leaveTypeId: 1,
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        status: 'PENDING',
        createdAt: '2026-05-01',
        updatedAt: '2026-05-01',
      },
    ];

    service.getMyLeaves().subscribe((leaves) => {
      expect(leaves.length).toBe(1);
      expect(leaves[0].status).toBe('PENDING');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/leaves/my`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLeaves);
  });

  it('should submit leave request', () => {
    const dto = { leaveTypeId: 1, startDate: '2026-07-01', endDate: '2026-07-03', reason: 'Vacation' };

    service.submitLeave(dto).subscribe((res) => {
      expect(res.id).toBe(10);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/leaves`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, ...dto, status: 'PENDING' });
  });

  it('should approve team leave request', () => {
    service.approveLeave(5, 'Approved').subscribe((res) => {
      expect(res.status).toBe('APPROVED');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/leaves/5/approve`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 5, status: 'APPROVED' });
  });
});

