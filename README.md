# Leave Management System

A full-stack, enterprise-grade Leave Management System built with **Angular 22**, **NestJS**, **Prisma ORM**, and **PostgreSQL 18**. The application enables employees to request leaves and track allowances, empowers managers to review and decide on team requests, and allows administrators to oversee organizational leave policies and system status.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Main Features](#main-features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Database Design Summary](#database-design-summary)
7. [Project Folder Structure](#project-folder-structure)
8. [Prerequisites](#prerequisites)
9. [PostgreSQL Database Setup](#postgresql-database-setup)
10. [Environment Variables](#environment-variables)
11. [Installation & Setup](#installation--setup)
12. [Running the Application](#running-the-application)
13. [Sample Demo Credentials](#sample-demo-credentials)
14. [Automated Testing](#automated-testing)
15. [API Endpoint Summary](#api-endpoint-summary)
16. [Screenshots](#screenshots)
17. [Future Enhancements](#future-enhancements)

---

## Project Overview

The Leave Management System automates and streamlines time-off workflows within an organization. It eliminates paper-based and email-driven leave requests by providing:
- Explicit role-based access control (RBAC) across Employee, Manager, and Admin tiers.
- Real-time leave balance calculations across distinct leave types.
- Strict automated business policy validation including weekend/holiday exclusions, notice periods, overlapping request prevention, and team concurrency capacity.
- Audit preservation of employee submission reasons and manager decision comments.

---

## Main Features

### 1. Employee Features
* **Authentication & Session:** Secure email/password login with JWT storage, persistent session, and responsive header display.
* **Balance Tracking:** Visual balance cards for Annual, Sick, and Unpaid leave showing Total, Used, and Remaining days.
* **Leave Submission:** Intuitive request form with calendar date pickers, category dropdown, and reason notes.
* **Smart Calculation:** Automatically excludes weekends (Saturdays & Sundays) and statutory public holidays.
* **Policy Validation:** Blocks submissions violating balance limits, overlapping existing leaves, or failing minimum advance notice requirements.
* **Leave History & Actions:** Tabular history with real-time status badges (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`) and the ability to cancel pending requests (automatically restoring balance).

### 2. Manager Features
* **Direct Reports Overview:** Scoped visibility strictly limited to direct reports assigned in the organization hierarchy.
* **Review & Decisions:** One-click approval and rejection actions.
* **Audit Trail:** Preserves the employee's original submission reason while allowing managers to attach specific rejection rationale.
* **Concurrency Protection:** Backend transactional capacity checks prevent exceeding team concurrency thresholds per working day.

### 3. Administrator Features
* **System Overview:** Real-time visibility into active policies, security modules, database connectivity, and administrative profile details.
* **Configurable Rules:** Centralized database-backed configuration for `TEAM_CAPACITY` and `MIN_NOTICE_DAYS`.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Angular 22 (Standalone Components, Signals, Router, HttpClient, SCSS) |
| **Backend** | NestJS 12, Node.js, TypeScript 6, Passport, Passport-JWT, Bcrypt, Class-Validator |
| **Database** | PostgreSQL 18 |
| **ORM** | Prisma 6.19.3 |
| **Testing** | Vitest (Frontend), Jest (Backend) |
| **Environment** | Windows / PowerShell / Cross-Platform |

---

## System Architecture

```text
+-----------------------------------------------------------+
|                   Angular 22 Frontend                     |
|  [AuthGuard]  [AuthInterceptor]  [Responsive UI / SCSS]  |
|  - Employee Dashboard  - Manager Dashboard  - Admin View   |
+-----------------------------+-----------------------------+
                              |
                              | HTTP / REST (JWT Bearer Token)
                              v
+-----------------------------------------------------------+
|                     NestJS Backend                        |
|  - AuthModule (Passport JWT, RolesGuard, Bcrypt)          |
|  - LeavesModule (Transaction Engine & Policy Rules)       |
|  - DateUtils (Working Day & Holiday Calculation)          |
+-----------------------------+-----------------------------+
                              |
                              | Prisma Client v6
                              v
+-----------------------------------------------------------+
|                  PostgreSQL 18 Database                   |
|  - Users (Self-referential Manager/Report Hierarchy)      |
|  - LeaveBalances (Composite key: user + type + year)      |
|  - LeaveRequests (PostgreSQL Date, Status, Comments)      |
|  - PublicHolidays & Configurations                        |
+-----------------------------------------------------------+
```

---

## User Roles & Permissions

| Role | Submit Leaves | View Own History | View Team Requests | Approve/Reject | View Admin Overview |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **EMPLOYEE** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **MANAGER**  | ❌ | ❌ | ✅ (Direct reports) | ✅ | ❌ |
| **ADMIN**    | ❌ | ❌ | ❌ | ❌ | ✅ |

*Note: Server-side authorization is strictly enforced by `JwtAuthGuard` and `RolesGuard`.*

---

## Database Design Summary

```prisma
enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```

* **`User`**: Identifies accounts, hashed passwords, explicit `Role`, and self-referential `managerId` for team mapping.
* **`LeaveType`**: Distinguishes leave categories (`ANNUAL`, `SICK`, `UNPAID`) and their default allowances.
* **`LeaveBalance`**: Tracks yearly allowances per employee and leave category with composite unique constraint `@@unique([userId, leaveTypeId, year])`.
* **`LeaveRequest`**: Stores calendar dates (`@db.Date`), status, employee reason, and manager `rejectionReason`.
* **`PublicHoliday`**: Calendar dates (`@db.Date`) excluded from working-day counts.
* **`Configuration`**: Dynamic system key-value pairs (`TEAM_CAPACITY`, `MIN_NOTICE_DAYS`).

---

## Project Folder Structure

```text
leave-management-system/
├── backend/
│   ├── prisma/
│   │   ├── migrations/       # Prisma migration history
│   │   ├── schema.prisma     # Relational schema & enums
│   │   └── seed.ts           # Idempotent development seed script
│   ├── src/
│   │   ├── auth/             # AuthService, Controller, Guards, JWT Strategy
│   │   ├── leaves/           # LeavesService, Controller, DTOs, Date Utils
│   │   ├── prisma/           # Prisma service provider
│   │   ├── app.module.ts     # Root NestJS application module
│   │   └── main.ts           # Application bootstrap entry
│   ├── test/                 # E2E test suite
│   ├── .env.example          # Environment template
│   ├── package.json          # Dependencies & scripts
│   └── tsconfig.json         # TypeScript configuration
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/        # Administrator overview dashboard
│   │   │   ├── employee/     # Employee balances, form & history dashboard
│   │   │   ├── manager/      # Manager team requests & review dashboard
│   │   │   ├── login/        # Responsive sign-in component
│   │   │   ├── auth.guard.ts # Functional Angular route guard
│   │   │   ├── auth.interceptor.ts # Functional Bearer token interceptor
│   │   │   ├── auth.service.ts     # User state & JWT persistence
│   │   │   ├── leave.service.ts    # REST API client for leave operations
│   │   │   └── header.component.ts # Common role-aware navigation header
│   │   ├── environments/     # Environment configurations (API URL)
│   │   ├── index.html
│   │   └── styles.scss
│   ├── angular.json          # Angular CLI configuration
│   ├── package.json
│   └── tsconfig.json
├── .gitignore                # Root Git ignore rules
└── README.md                 # Project documentation
```

---

## Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **npm**: `v10.x` or `v11.x`
* **PostgreSQL**: `v16`, `v17`, or `v18`
* **Git**: `v2.40+`

---

## PostgreSQL Database Setup

1. Open PowerShell or your PostgreSQL terminal (`psql`):
   ```sql
   CREATE DATABASE leave_management;
   ```
2. Verify that your PostgreSQL service is running on your configured port (default development port: `5433` or `5432`).

---

## Environment Variables

Copy the example environment file inside the `backend/` directory:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` with your PostgreSQL database credentials:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5433/leave_management?schema=public"
JWT_SECRET="super_secret_jwt_key_for_development_purposes_only"
PORT=3000
```

> **Security Note:** Never commit `.env` files or credentials to Git. `backend/.env` is strictly excluded by `.gitignore`.

---

## Installation & Setup

### 1. Backend Setup
From the repository root:
```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate status
npx prisma db seed
```

### 2. Frontend Setup
From another terminal:
```powershell
cd frontend
npm install
```

---

## Running the Application

### Start Backend API
```powershell
cd backend
npm run start:dev
```
* Backend runs at: `http://localhost:3000`

### Start Frontend Client
```powershell
cd frontend
npm start
```
* Frontend runs at: `http://localhost:4200`

---

## Sample Demo Credentials

All test accounts seeded in the development database use the password:  
**`Password123!`**

| Role | Email | Name / Notes |
|---|---|---|
| **ADMIN** | `admin@example.com` | System Administrator |
| **MANAGER** | `manager@example.com` | Sarah Connor (Manages 4 reports) |
| **MANAGER** | `manager2@example.com` | John Miller (Manages 4 reports) |
| **EMPLOYEE** | `employee@example.com` | Alice Smith (Reports to Sarah Connor) |
| **EMPLOYEE** | `emp2@example.com` | Bob Jones (Reports to Sarah Connor) |
| **EMPLOYEE** | `emp5@example.com` | Evan Wright (Reports to John Miller) |

---

## Automated Testing

### Backend Unit Tests (Jest)
Runs comprehensive tests for auth, JWT, guards, date calculations, working-day holiday exclusions, overlap checks, notice days, and team capacity:
```powershell
cd backend
npm test
```
*Results: 3 Test Suites Passed, 14 Tests Passed.*

### Frontend Unit Tests (Vitest)
Runs tests for authentication state, HTTP interceptor logic, route guard logic, and dashboard services:
```powershell
cd frontend
npm test -- --watch=false
```
*Results: 3 Test Files Passed, 9 Tests Passed.*

### Production Build Verification
```powershell
# Backend Build
cd backend
npm run build

# Frontend Build
cd frontend
npm run build
```

---

## API Endpoint Summary

All routes (except `/auth/login`) require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticates credentials; returns JWT and user profile |
| `GET` | `/auth/profile` | Any | Returns authenticated user details |
| `GET` | `/leaves/balance` | `EMPLOYEE` | Returns user's leave balances for current calendar year |
| `GET` | `/leaves/my` | `EMPLOYEE` | Returns employee's own leave requests |
| `POST` | `/leaves` | `EMPLOYEE` | Submits a new leave request |
| `PATCH`| `/leaves/:id/cancel` | `EMPLOYEE` | Cancels an eligible leave request and restores balance |
| `GET` | `/leaves/team` | `MANAGER` | Returns leave requests from direct reports only |
| `PATCH`| `/leaves/:id/approve` | `MANAGER` | Approves a direct report's leave request |
| `PATCH`| `/leaves/:id/reject` | `MANAGER` | Rejects a direct report's leave request with optional comment |

---

## Screenshots

| View | Screenshot Placeholder |
|---|---|
| **Sign In Page** | `![Sign In](docs/screenshots/login.png)` |
| **Employee Dashboard** | `![Employee Dashboard](docs/screenshots/employee-dashboard.png)` |
| **Leave Request Modal** | `![Leave Request](docs/screenshots/leave-form.png)` |
| **Manager Approval View**| `![Manager Dashboard](docs/screenshots/manager-dashboard.png)` |
| **Admin Overview** | `![Admin Dashboard](docs/screenshots/admin-dashboard.png)` |

---

## Future Enhancements

* Interactive team calendar heatmaps and Gantt visualizations.
* Multi-level approval workflows (e.g. Lead $\to$ Manager $\to$ HR).
* Document attachment support for medical and sick leave verification.
* Automated email and Slack notification webhooks for status transitions.
* Self-service password reset and multi-factor authentication (MFA).
