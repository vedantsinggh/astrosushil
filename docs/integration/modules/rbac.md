# Staff roles and permissions (rbac)

**Status:** built, not migrated, not deployed. No migration SQL exists yet (the lead generates it). The seed and backfill have not been run against any database.
**Last updated:** 2026-11-24

Staff roles are now rows in the database and can be created and edited, as on the website admin. The list of permissions stays in code. Staff still sign in with email and password.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Permission catalogue | `apps/api/src/modules/admin/rbac/permission.catalog.ts` | Every valid key with its module, label, group and sort order. The build fails if it and the `Permission` union in `admin.permissions.ts` differ. |
| System role defaults | `admin.permissions.ts` (static map), `rbac/system-roles.ts` | The permissions the three seeded roles start with. No longer read on a request once roles are seeded. |
| Resolution | `rbac/rbac.resolver.ts` | Reads the acting user's staff profile and role from the database. |
| Permission gate | `rbac/check-permission.ts` | `checkPermission('module:action')`, same call as before. Also accepts several keys (any one is enough). |
| Roles, staff | `rbac/role.service.ts`, `rbac/staff.service.ts`, `rbac/rbac.routes.ts`, `rbac/rbac.schemas.ts` | The endpoints below. |
| Granting rule | `rbac/grant-guard.ts` | A staff member can change only permissions they hold (see "Granting permissions"). |
| Old column in step | `rbac/staff-link.ts` | Keeps `User.role` correct and links the previous Admin Staff endpoints to roles. |
| Seed and backfill | `rbac/rbac.seed.ts`, called from `apps/api/prisma/seed.ts` | Creates the system roles and gives existing admins a staff profile. |

### Resolving a user's permissions

1. The user has a staff profile. Removed or suspended: no access. No role: no access. Otherwise the role decides: a super admin role gives every catalogue key; an inactive role gives nothing; any other role gives its stored keys that are still in the catalogue.
2. No staff profile, but `User.role` is `SUPER_ADMIN`, `ADMIN` or `SUPPORT` (an admin not yet backfilled): the seeded system role for that value decides.
3. As 2, but the system role row does not exist (roles not seeded): the static map decides. This is the behaviour before this change, so the API works between deploy and seed.
4. Anyone else has no admin access.

The access token still carries only the user id and `User.role`. Permissions are never read from it. Login and `GET /admin/auth/me` return the permission list for the UI.

**Cache.** The result is cached per user in the API process for 10 seconds (`STAFF_ACCESS_CACHE_TTL_MS`). Every role or staff write clears it, so a change is immediate on the instance that made it and reaches any other API instance within 10 seconds. Login always reads fresh. If the database cannot be read, the check fails (no fallback to the static map).

### `User.role` is kept, as a coarse tier

Code outside the admin module still reads `User.role` from the token (for example, whether someone may read another customer's order or birth profile). It is therefore kept and written by the staff and role services:

| Staff account | `User.role` |
|---|---|
| Usable, on the super admin role | `SUPER_ADMIN` |
| Usable, on the seeded Admin role | `ADMIN` |
| Usable, on the seeded Support role or any custom role | `SUPPORT` |
| Suspended, removed, without a role, or on an inactive role | `USER` |

A custom role is placed on the lowest staff tier on purpose. Its permissions inside the admin come only from its keys. See open question 1.

## Models

Added to `apps/api/prisma/schema.prisma` between the `rbac` markers, plus one line on `User` (`staffProfile StaffProfile?`).

**AdminRole** (`admin_roles`). The name `Role` is already the enum behind `User.role`.

| Field | Notes |
|---|---|
| `name` | Unique. The service also refuses a name that differs only in case. |
| `slug` | Unique. Made from the name on create; never changes. |
| `description` | Optional. |
| `permissions` | `String[]` of catalogue keys. |
| `isSuperAdmin` | Grants everything without reading `permissions`. Only the seed sets it. |
| `isSystem` | Seeded role: cannot be deleted or renamed. Only the seed sets it. |
| `legacyRole` | The `User.role` value for the role's usable members. Only the seed sets it; a role made through the API gets `SUPPORT`. |
| `status` | `ACTIVE` or `INACTIVE`. |
| `createdById`, `legacyId`, `createdAt`, `updatedAt` | `legacyId` is the MongoDB `_id`. |

**StaffProfile** (`staff_profiles`). One per staff user.

| Field | Notes |
|---|---|
| `userId` | Unique; the `User` row holds email, full name and password hash. |
| `roleId` | Nullable. Set to null if the role is deleted (only possible when no usable staff hold it). |
| `status` | `ACTIVE` or `SUSPENDED`. |
| `isDeleted`, `deletedAt` | Soft delete. |
| `username`, `phoneNumber`, `designation`, `website`, `portfolioLink`, `profilePhoto`, `address`, `city`, `state`, `postalCode` | The website admin's profile fields. `username` is unique and optional. |
| `lastLoginAt`, `createdById`, `legacyId`, `createdAt`, `updatedAt` | |

## Seed and backfill

`seedRbac(prisma, options)` in `rbac/rbac.seed.ts`. Repeatable. `prisma/seed.ts` calls it after creating the default admins.

| Existing `User.role` | System role (slug) | Permissions at seed | `isSuperAdmin` |
|---|---|---|---|
| `SUPER_ADMIN` | Super Admin (`super-admin`) | all catalogue keys | yes |
| `ADMIN` | Admin (`admin`) | the static `ADMIN` list, unchanged | no |
| `SUPPORT` | Support (`support`) | the static `SUPPORT` list, unchanged | no |

- A system role that already exists keeps the permissions an admin has given it. Pass `resetSystemRolePermissions: true` to put the defaults back.
- Every user with one of the three role values and no staff profile gets a profile on the matching role, status `ACTIVE`.
- `prune: true` removes keys that are no longer in the catalogue from every role.
- It warns when no user is a super admin. It does not promote anyone (the website's seed promotes the oldest admin).

A unit test checks that `checkPermission` gives the three seeded roles the same answer as the static map for every key.

## Endpoints

All under `/api/v1/admin`, inside the existing protected scope (valid staff token). Lists return `{ items, pagination }`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/roles` | `roles:read` | `search`, `status`, `page`, `pageSize`. Each role has `staffCount` and `permissionCount`. |
| GET | `/roles/options` | `roles:read` or `staff:create` or `staff:update` | Active roles for the staff form. |
| POST | `/roles` | `roles:create` | `name`, `description`, `permissions`, `status`. |
| GET | `/roles/:id` | `roles:read` | |
| PUT | `/roles/:id` | `roles:update` | Any of the create fields. |
| PATCH | `/roles/:id/status` | `roles:update` | `status`. |
| DELETE | `/roles/:id` | `roles:delete` | Hard delete of the role row. |
| GET | `/permissions` | `permissions:read` or `roles:read` or `roles:create` or `roles:update` | Grouped matrix; `?flat=true` for a list. |
| GET | `/staff` | `staff:read` | `search`, `role` (role id), `status`, `page`, `pageSize`. |
| POST | `/staff` | `staff:create` | `fullName`, `email`, `password`, `roleId`; optional `username`, `phoneNumber`, `designation`, `status`. |
| GET | `/staff/:id` | `staff:read` | `:id` is the user id. |
| PATCH | `/staff/:id` | `staff:update` | Profile fields. |
| PATCH | `/staff/:id/role` | `staff:update` | `roleId`. |
| PATCH | `/staff/:id/status` | `staff:update` | `ACTIVE` or `SUSPENDED`. |
| POST | `/staff/:id/reset-password` | `staff:update` | `newPassword`. Returns a message only. |
| DELETE | `/staff/:id` | `staff:delete` | Soft delete. |
| GET | `/auth/profile` | none (any usable staff account) | Own staff profile. |
| PATCH | `/auth/profile` | none | Own profile fields (website `PATCH /admin/update`). |
| POST | `/auth/change-password` | none | `oldPassword`, `newPassword` (website `POST /admin/change-password`). |

Changed responses: `POST /admin/auth/login` (`user`) and `GET /admin/auth/me` now also carry `staffRole` (`id`, `name`, `slug`, `isSuperAdmin`, `status`) and `isSuperAdmin`. `role` is still the `User.role` value and `permissions` is still the key list, so the current admin app needs no change.

### Guards

| Guard | Applies to |
|---|---|
| Cannot act on yourself | staff role change, status change, delete |
| Only a super admin can modify a super admin's account | staff update, role change, status change, password reset, delete |
| Only a super admin can assign the super admin role | staff create, role change |
| The last usable super admin cannot be demoted, suspended or removed | staff role change, suspend, delete |
| The super admin role cannot be modified | role update, status change, delete |
| A system role cannot be renamed or deleted | role update, delete |
| A role with staff cannot be deleted | role delete |
| Cannot delete or deactivate your own role | role delete, status change, update |
| A non-super-admin cannot remove `roles:read` or `roles:update` from their own role | role update |
| Only an active role can be assigned | staff create, role change |
| Only catalogue keys can be stored | role create, update |
| A non-super-admin can change only permissions they hold (next section) | role create, update, status change; staff create, role change, status change, password reset, delete |
| `isSuperAdmin`, `isSystem`, `slug`, `legacyRole` cannot be sent | all bodies are strict |

### Granting permissions

Owner decision of 2026-11-24 (open-questions S1): a staff member may grant only permissions they
hold themselves; super admins are unrestricted. The website has no such limit.

The rule built is symmetric: **a staff member who is not a super admin cannot change, in either
direction, a permission they do not hold.** "Hold" means the keys of the acting staff member's own
role as read from the database for the request. A role is measured by its stored catalogue keys,
active or not, because an inactive role grants them again once reactivated.

| Action | Allowed for a non-super-admin when |
|---|---|
| Create a role (`POST /roles`) | every key in the request is held |
| Edit a role's keys (`PUT /roles/:id`) | every key **added** and every key **removed** is held. Keys they do not hold must stay as they are, present or absent. Sending the unchanged list back is not a change |
| Edit a role's name or description | always (no permission changes) |
| Activate or deactivate a role (`PATCH /roles/:id/status`, or `status` in `PUT /roles/:id`) | every key of the role is held (the switch gives or takes all of them for every member) |
| Delete a role (`DELETE /roles/:id`) | unchanged: only an unused, non-system role can be deleted, so nobody's permissions change |
| Create a staff account (`POST /staff`) | every key of the chosen role is held |
| Change a staff account's role (`PATCH /staff/:id/role`) | every key of the **new** role is held, and every key of the account's **current** role is held |
| Suspend or reactivate (`PATCH /staff/:id/status`), remove (`DELETE /staff/:id`), reset the password (`POST /staff/:id/reset-password`) | every key of the account's current role is held |
| Edit a staff profile (`PATCH /staff/:id`) | always (name, phone, designation and address carry no access) |

Why the last-but-one row is part of the rule: a password reset lets the acting staff member sign in
as the other account, so without it anyone with `staff:update` could use every permission of a more
powerful role, which is exactly what the decision forbids. Suspending, reactivating and removing
change what that account can do and follow the same symmetric rule. This row goes further than the
wording of the decision; it is one function (`assertCanManageAccess` in `staff.service.ts`) if the
owner wants only the password reset kept.

A super admin passes every check. The earlier guards still apply first (the super admin role can be
assigned and its accounts modified only by a super admin, and so on).

Refusal: `403` in the standard shape, code `PERMISSION_GRANT_NOT_ALLOWED`. The message says which
kind of action was refused and never names a permission key, because someone who may create staff
is not necessarily allowed to read what a role contains. Nothing is written and no audit entry is
made for a refused request.

The previous `/admin/admin-users` endpoints are not affected: they stay super-admin-only in the service.

Consequence for the admin panel: the role form should disable the checkboxes of keys the signed-in
staff member does not hold, and the role picker of the staff form should offer only roles they may
assign; today both would show an error on save instead. `GET /roles/options` still lists every
active role (open question 8).

Tests: `apps/api/tests/unit/rbac-granting.test.ts`.

### Audit log

Every state change writes an entry through `adminService.logAction` with the acting admin, IP address and user agent. The website has no audit log.

| Action | Resource |
|---|---|
| `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_STATUS_CHANGED`, `ROLE_DELETED` | `AdminRole:<id>` |
| `STAFF_CREATED`, `STAFF_UPDATED`, `STAFF_ROLE_CHANGED`, `STAFF_SUSPENDED`, `STAFF_ACTIVATED`, `STAFF_PASSWORD_RESET`, `STAFF_DELETED` | `User:<id>` |
| `ADMIN_PROFILE_UPDATED`, `ADMIN_PASSWORD_CHANGED` | `User:<id>` |

Role entries record the keys added and removed. Staff entries record the email and which fields changed, not their values. No entry contains a password or a hash.

## Permission keys

| Our key | Website key |
|---|---|
| `roles:read`, `roles:create`, `roles:update`, `roles:delete` | `roles.view`, `roles.create`, `roles.edit`, `roles.delete` |
| `permissions:read` | `permissions.view` |
| `staff:read`, `staff:create`, `staff:update`, `staff:delete` | `staff.view`, `staff.create`, `staff.edit`, `staff.delete` |

The general rule for every website key is `module.view` to `module:read`, `module.edit` to `module:update`, and camel case to snake case (`reportOrders` to `report_orders`, `gstReport` to `gst_report`, `pdfReports` to `pdf_reports`). All 81 website keys are in the catalogue; none was missing from `admin.permissions.ts`. No new key was added by this work.

### The previous Admin Staff endpoints and `admin_users:manage`

They still work and are unchanged for the caller.

| Endpoint | Permission | Now also |
|---|---|---|
| `GET /admin/admin-users` | `users:read` | Unchanged. Lists by `User.role`, so suspended or removed staff no longer appear. |
| `POST /admin/admin-users` | `admin_users:manage`, and the caller must be `SUPER_ADMIN` | Gives the new admin a staff profile on the Admin or Support system role. |
| `PATCH /admin/admin-users/:id/role` | `admin_users:manage`, and the caller must be `SUPER_ADMIN` | Moves the staff profile to the Admin or Support system role. Refuses an account that was removed or suspended through the staff endpoints. |

`admin_users:manage` is not an alias of the `staff:*` keys. It gates only these two old endpoints, which stay super-admin-only in the service. It is in the catalogue under Administration so a role can hold it, but it is useful only to a super admin. It can be retired with the old Admin Staff page once the new staff screen exists.

## Mapping from the website's MongoDB collections

### `permissions`

Not migrated. The catalogue is code here. Role permissions are stored as keys, so each website permission id must be turned into its key: read `permissions.name` and apply the rule above.

### `roles` to `admin_roles`

| Website | Ours |
|---|---|
| `_id` | `legacyId` |
| `name`, `description` | same |
| `slug` | `slug` |
| `permissions` (ids) | `permissions` (keys, translated) |
| `isSuperAdmin`, `isSystem`, `status` | same |
| `createdBy` (admin id) | `createdById` (our user id of that admin) |
| `createdAt`, `updatedAt` | same |

- The website's `super-admin` and `admin` roles must be merged into our seeded rows of the same slug, not inserted beside them. Set their `legacyId`.
- The website's Admin role has only website permissions. Our Admin role also has this platform's keys. On merge, keep the union, or the app-side admin screens would lose access (open question 4).
- Custom roles get `legacyRole = SUPPORT`.
- A stored permission id with no matching permission document must be reported and dropped.

### `admins` to `users` + `staff_profiles`

| Website | Ours |
|---|---|
| `_id` | `staff_profiles.legacyId` |
| `email` | `users.email` (lowercase) |
| `fullName` | `users.fullName` |
| `password` (bcrypt, 10 rounds) | `users.passwordHash`. Our verifier accepts it as is. |
| `username` | `staff_profiles.username` |
| `phoneNumber`, `designation`, `website`, `portfolioLink`, `profilePhoto`, `address`, `city`, `state`, `postalCode` | same names on `staff_profiles` |
| `role` (role id) | `staff_profiles.roleId`; `users.role` from the table above |
| `status` | `staff_profiles.status` |
| `isDeleted` | `staff_profiles.isDeleted`; `users.role = USER` |
| `loginTime` / `lastLoginAt` | `staff_profiles.lastLoginAt` (the later of the two) |
| `createdBy` | `staff_profiles.createdById` |
| `isVerified` | `users.emailVerifiedAt` set |
| `createdAt`, `updatedAt` | same |
| `refreshToken`, `loginHistory`, `isAdmin` | not migrated |

Quirks seen in the website code:
- `seedRbac.js` rewrote `role` from the strings `ADMIN` and `SUPER_ADMIN` to role ids with the raw driver. Any admin whose `role` is still a string, missing or null must be reported; the website treats it as "no permissions".
- The same script removed an older `permissions` field from admin documents. Ignore it if present.
- An admin's email may equal a customer's email. `users.email` is unique here, so this must be detected before migration (open question 5).
- `phoneNumber` is kept on the staff profile, not on `users.phoneNumber`, because that column is unique and belongs to customer login.
- Removed admins keep their role id; the role may since have been deleted.

## Differences from the website, and why

| Website | Here | Why |
|---|---|---|
| Permissions are documents in MongoDB, upserted by a seed | The catalogue is code; roles store keys | Decided in the task: one source of valid keys. |
| Staff and customers are separate collections | Staff are `User` rows with a staff profile | One user table already holds admins here. |
| Login by email or username | Email only | Login is unchanged by decision. `username` is stored for the record. |
| `username` required | Optional | Not used for login here. |
| Password minimum 8 characters | This platform's policy: 8 to 100 characters, upper case, lower case, and a digit or symbol | Follow our existing policy. |
| Change password leaves other sessions signed in | All refresh tokens are revoked | Safer; the old password may be known to someone else. |
| A role's permission list is not checked on read | Keys no longer in the catalogue are ignored | A removed permission must stop working. |
| An inactive role still lets its members sign in, with no permissions | Members cannot sign in to the admin until the role is active | `User.role` drops to `USER` so the rest of the API also stops treating them as staff. |
| `PUT /roles/:id` can deactivate your own role (only the status route checks) | Refused on both | The website's guard has a gap. |
| The last-super-admin check counts active super admins including the target | Counts usable super admins other than the target | Same intent; correct when the target is already suspended. |
| Deleting a role leaves removed admins pointing at a missing role | Their role link is cleared | Foreign key. |
| List paging is `page` and `limit`, response `{ data, meta }` | `page` and `pageSize`, response `{ items, pagination }` | This admin API's convention. |
| No audit log | Every change is audited | Required here. |
| Anyone with `roles.edit` can add any permission to any role except the super admin role; anyone with `staff.create` / `staff.edit` can put an account on any such role, and reset its password | A non-super-admin can change only permissions they hold (see "Granting permissions") | Owner decision of 2026-11-24. |
| Role and staff ids are MongoDB ids | UUIDs; a staff id is the user id | |
| `GET /roles` returns `permissionCount: "ALL"` for the super admin | A number, with `isSuperAdmin: true` | One type per field. |
| Forgot password for admins (`/admin/forgot-password`, `/admin/reset-password`, OTP by email) | Not built here | The existing `/auth/forgot-password` and `/auth/reset-password` work for any user with an email, staff included. See open question 3. |

Security findings checked: no secret, password or hash is returned or logged; staff ids in a URL are always checked against the caller (self, super admin); the role is read from the database on each request, so a suspended or removed staff member loses access within seconds. Finding 13 (customer and staff tokens signed with the same secret) also holds for this backend today and was not in scope.

## Changes in `apps/admin`

None. The app reads `user.role` and `permissions`, and both keep their meaning. It stores the permission list at login, so a role change shows in the menu after the next sign-in; the server enforces it within seconds regardless.

## Environment variables

None.

## Not done

- No admin screens for roles and staff (a later phase).
- No migration SQL, and the seed has not been run.
- Not tested against a real database. The integration tests were not run.
- Other new modules must use `checkPermission` from `apps/api/src/modules/admin/rbac/check-permission.ts`. A copy that calls `hasPermission(request.user.role, ...)` reads the static map and ignores database roles.

## Open questions

1. **Tier of custom roles.** A custom role sits on the `SUPPORT` tier outside the admin module. One visible effect: `GET /admin/payments` hides the Razorpay payment id from that tier even when the role has `payments:read`. Should that redaction become a permission instead?
2. **Who may edit roles.** Decided 2026-11-24 and built: a staff member can change only permissions they hold; super admins are unrestricted (see "Granting permissions"). Left to confirm: the rule also stops a non-super-admin from suspending, reactivating or removing an account on a role with more permissions than their own. Keep that, or limit it to the role change and the password reset?
3. **Password reset.** Reproduced as on the website: the acting admin types the new password and must pass it to the staff member outside the system. It is never returned, logged or emailed. The alternative is to send the staff member a reset code by email. Also: the staff "forgot password" flow depends on `/auth/forgot-password` and `/auth/reset-password`, which the OTP-only customer login work may remove. They must stay for staff, or a staff-only pair is needed.
4. **Merging the website's Admin role** with ours: keep the union of permissions?
5. **An admin and a customer with the same email** on the website: one user with both, or a changed email for one of them?
6. **Removed staff** keep their password hash and become an ordinary `USER`. Should the password be cleared on removal?
7. **Login history.** The website keeps every login time on the admin document. Here logins are in the audit log (`ADMIN_LOGIN`) and only the last one is on the profile. Is the old history needed?
8. **Role picker.** `GET /roles/options` returns every active role, including ones the caller may not assign. Should it return only assignable roles, or mark them, so the staff form does not offer a choice that will be refused?
