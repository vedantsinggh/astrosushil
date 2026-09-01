# Admin Panel Test Verification Matrix

*Document Version*: 1.0.0  
*Status*: VERIFIED  
*Date*: 2026-09-02  

---

## 1. Authentication & Session Security Tests

| Test Case | Procedure / Input | Expected Result | Server Status | Client Status |
| :--- | :--- | :--- | :--- | :--- |
| Valid Admin Login | Submit valid admin credentials via `POST /auth/login` | Returns HTTP 200 with JWT access token & admin profile | PASS (200) | PASS |
| Invalid Password | Submit invalid password via `POST /auth/login` | Returns HTTP 401 `Invalid administrative credentials` | PASS (401) | PASS |
| Non-Admin User Login | Submit credentials of standard `USER` role via `POST /auth/login` | Returns HTTP 403 `Access denied: User is not authorized` | PASS (403) | PASS |
| Expired Token Request | Send expired JWT header to `/api/v1/admin/dashboard` | Returns HTTP 401 `Token expired` | PASS (401) | PASS |
| Logout & Session Revocation | Invoke `POST /auth/logout` and attempt subsequent request with revoked token | Returns HTTP 401 `Session revoked` | PASS (401) | PASS |

---

## 2. Server-Side RBAC Enforcement Matrix

| Endpoint Route | Required Permission | SUPER_ADMIN | ADMIN | SUPPORT | Unauthorized Role Result |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `GET /api/v1/admin/dashboard` | `dashboard:read` | ALLOW | ALLOW | ALLOW | HTTP 403 Forbidden |
| `GET /api/v1/admin/users` | `users:read` | ALLOW | ALLOW | ALLOW | HTTP 403 Forbidden |
| `POST /api/v1/admin/users/:id/suspend` | `users:suspend` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks users:suspend permission` |
| `POST /api/v1/admin/users/:id/activate` | `users:activate` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks users:activate permission` |
| `POST /api/v1/admin/users/:id/sessions/revoke` | `sessions:revoke` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks sessions:revoke permission` |
| `POST /api/v1/admin/users/:id/password-reset` | `users:password_reset` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks users:password_reset permission` |
| `POST /api/v1/admin/users/:id/entitlements` | `entitlements:grant` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks entitlements:grant permission` |
| `DELETE /api/v1/admin/users/:id/entitlements/:f` | `entitlements:revoke` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks entitlements:revoke permission` |
| `POST /api/v1/admin/reports/:id/regenerate` | `reports:regenerate` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks reports:regenerate permission` |
| `POST /api/v1/admin/reports/cache/clear` | `reports:clear_cache` | ALLOW | DENY | DENY | HTTP 403 `Lacks reports:clear_cache permission` |
| `POST /api/v1/admin/admin-users` | `admin_users:manage` | ALLOW | DENY | DENY | HTTP 403 `Lacks admin_users:manage permission` |
| `GET /api/v1/admin/system/health` | `system:read` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks system:read permission` |
| `GET /api/v1/admin/audit-log` | `audit_log:read` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks audit_log:read permission` |
| `GET /api/v1/admin/analytics/export` | `analytics:export` | ALLOW | ALLOW | DENY | HTTP 403 `Lacks analytics:export permission` |

---

## 3. UI State Verification Matrix

| Page Component | Loading State | Empty Data State | Error State | Action Confirmation Modal |
| :--- | :--- | :--- | :--- | :--- |
| `Dashboard` (`/dashboard`) | Skeleton cards | "No pending actions" | Alert banner + retry button | N/A (Read-only) |
| `Users` (`/users`) | Table skeleton shimmer | "No users match your query" | Error banner with request ID | Suspend/Activate Modals |
| `User Detail` (`/users/[id]`) | Profile skeleton | "No records found" | "User not found" (404) | Revoke Sessions / Password Reset |
| `Birth Profiles` (`/birth-profiles`) | Table skeleton | "No birth profiles recorded" | Error alert | N/A |
| `Reports` (`/reports`) | Table skeleton | "No career reports found" | Error alert | Clear Cache Modal |
| `Report Diagnostics` (`/reports/[id]`) | Pipeline stepper shimmer | N/A | Failure stage callout box | Force Regenerate Modal |
| `Subscriptions` (`/subscriptions`) | Card grid skeleton | "No active subscriptions" | Error banner | N/A |
| `Payments` (`/payments`) | Table skeleton | "No payments recorded" | Error banner | N/A (Read-only) |
| `Notifications` (`/notifications`) | Metric shimmer | "No notification events" | Error banner | Test Send Modal |
| `Analytics` (`/analytics`) | Chart skeleton | Zero values rendered cleanly | Error alert | N/A |
| `Audit Log` (`/audit-log`) | Table skeleton | "No audit events recorded" | Error alert | N/A (Read-only) |
