/**
 * API functions for roles, the permission catalogue, staff accounts and the signed-in staff
 * member's own profile. Backend: docs/integration/modules/rbac.md
 * (apps/api/src/modules/admin/rbac). Lists answer `{ items, pagination }`.
 */
import { apiFetch } from '../api-client';

const ADMIN = '/api/v1/admin';

function queryString(params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export interface PagePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// --------------------------------------------------------------------------------------- roles

export type RoleStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  permissionCount: number;
  isSuperAdmin: boolean;
  isSystem: boolean;
  status: RoleStatus;
  staffCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleOption {
  id: string;
  name: string;
  slug: string;
  isSuperAdmin: boolean;
}

export interface RoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
  status?: RoleStatus;
}

export interface PermissionMatrixGroup {
  group: string;
  modules: Array<{
    module: string;
    moduleLabel: string;
    permissions: Array<{ key: string; action: string; label: string }>;
  }>;
}

export function fetchRoles(query: { search?: string; status?: RoleStatus | ''; page?: number; pageSize?: number }) {
  return apiFetch<{ items: AdminRole[]; pagination: PagePagination }>(`${ADMIN}/roles${queryString(query)}`);
}

export function fetchRole(id: string) {
  return apiFetch<AdminRole>(`${ADMIN}/roles/${id}`);
}

export async function fetchRoleOptions(): Promise<RoleOption[]> {
  const res = await apiFetch<{ items: RoleOption[] }>(`${ADMIN}/roles/options`);
  return res.items;
}

export async function fetchPermissionMatrix(): Promise<PermissionMatrixGroup[]> {
  const res = await apiFetch<{ groups: PermissionMatrixGroup[] }>(`${ADMIN}/permissions`);
  return res.groups;
}

export function createRole(input: RoleInput) {
  return apiFetch<AdminRole>(`${ADMIN}/roles`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateRole(id: string, input: RoleInput) {
  return apiFetch<AdminRole>(`${ADMIN}/roles/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function updateRoleStatus(id: string, status: RoleStatus) {
  return apiFetch<AdminRole>(`${ADMIN}/roles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function deleteRole(id: string) {
  return apiFetch<{ message: string; id: string }>(`${ADMIN}/roles/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
}

// --------------------------------------------------------------------------------------- staff

export type StaffStatus = 'ACTIVE' | 'SUSPENDED';

export interface StaffMember {
  /** The user id of the staff account. */
  id: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  phoneNumber: string | null;
  designation: string | null;
  website: string | null;
  portfolioLink: string | null;
  profilePhoto: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  status: StaffStatus;
  role: { id: string; name: string; slug: string; isSuperAdmin: boolean; status: RoleStatus } | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffInput {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  username?: string;
  phoneNumber?: string;
  designation?: string;
  status?: StaffStatus;
}

/** Fields of `PATCH /admin/staff/:id` and `PATCH /admin/auth/profile` (the body is strict). */
export interface StaffProfileInput {
  fullName?: string;
  phoneNumber?: string;
  designation?: string;
  website?: string;
  portfolioLink?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export function fetchStaff(query: { search?: string; role?: string; status?: StaffStatus | ''; page?: number; pageSize?: number }) {
  return apiFetch<{ items: StaffMember[]; pagination: PagePagination }>(`${ADMIN}/staff${queryString(query)}`);
}

export function createStaff(input: CreateStaffInput) {
  return apiFetch<StaffMember>(`${ADMIN}/staff`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateStaff(id: string, input: StaffProfileInput) {
  return apiFetch<StaffMember>(`${ADMIN}/staff/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function updateStaffRole(id: string, roleId: string) {
  return apiFetch<StaffMember>(`${ADMIN}/staff/${id}/role`, { method: 'PATCH', body: JSON.stringify({ roleId }) });
}

export function updateStaffStatus(id: string, status: StaffStatus) {
  return apiFetch<StaffMember>(`${ADMIN}/staff/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function resetStaffPassword(id: string, newPassword: string) {
  return apiFetch<{ message: string }>(`${ADMIN}/staff/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

export function deleteStaff(id: string) {
  return apiFetch<{ message: string; id: string }>(`${ADMIN}/staff/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
}

// --------------------------------------------------------------------------------- own account

export function fetchOwnProfile() {
  return apiFetch<StaffMember>(`${ADMIN}/auth/profile`);
}

export function updateOwnProfile(input: StaffProfileInput) {
  return apiFetch<StaffMember>(`${ADMIN}/auth/profile`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function changeOwnPassword(oldPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>(`${ADMIN}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

// ---------------------------------------------------------------------------------- validation

/**
 * The platform's password policy (apps/api auth.schemas.ts `registerSchema.password`).
 * Returns the first problem, or null when the password is acceptable.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (password.length > 100) return 'Password must not exceed 100 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one number or special character';
  return null;
}

/**
 * Builds the body of a staff profile update from the form, sending only what changed.
 * `phoneNumber`, `website` and `portfolioLink` cannot be emptied (the backend requires a valid
 * value when the field is present), so an emptied one is reported in `cannotClear` and left out.
 */
export function staffProfileChanges(
  current: StaffMember,
  form: Record<keyof StaffProfileInput, string>
): { changes: StaffProfileInput; cannotClear: string[]; problem: string | null } {
  const changes: StaffProfileInput = {};
  const cannotClear: string[] = [];
  const labels: Record<keyof StaffProfileInput, string> = {
    fullName: 'Full name',
    phoneNumber: 'Phone',
    designation: 'Designation',
    website: 'Website',
    portfolioLink: 'Portfolio link',
    address: 'Address',
    city: 'City',
    state: 'State',
    postalCode: 'Postal code',
  };
  const mustHaveValue: Array<keyof StaffProfileInput> = ['fullName', 'phoneNumber', 'website', 'portfolioLink'];

  for (const key of Object.keys(labels) as Array<keyof StaffProfileInput>) {
    const next = form[key].trim();
    const previous = (current[key] ?? '').trim();
    if (next === previous) continue;
    if (next === '' && mustHaveValue.includes(key)) {
      cannotClear.push(labels[key]);
      continue;
    }
    changes[key] = next;
  }

  let problem: string | null = null;
  if (changes.fullName !== undefined && (changes.fullName.length < 2 || changes.fullName.length > 80)) {
    problem = 'Full name must be 2 to 80 characters';
  } else if (changes.phoneNumber !== undefined && (changes.phoneNumber.length < 10 || changes.phoneNumber.length > 15)) {
    problem = 'Phone must be 10 to 15 characters';
  } else {
    for (const key of ['website', 'portfolioLink'] as const) {
      const value = changes[key];
      if (value === undefined) continue;
      try {
        new URL(value);
      } catch {
        problem = `${labels[key]} must be a full URL, for example https://example.com`;
      }
    }
  }
  return { changes, cannotClear, problem };
}
