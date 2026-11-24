'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { apiErrorMessage } from '../../../lib/api/uploads';
import { AdminRole, fetchOwnProfile, fetchRole } from '../../../lib/api/staff';
import { RoleForm } from '../../../components/catalogue/RoleForm';
import { Breadcrumbs, Notice, PageHeader, PermissionGate } from '../../../components/catalogue/ui';

function RoleScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const id = params.id;
  const canUpdate = hasPermission('roles:update');

  const [role, setRole] = useState<AdminRole | null>(null);
  const [ownRoleId, setOwnRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRole(null);
    setError(null);
    fetchRole(id)
      .then((result) => {
        if (!cancelled) setRole(result);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load the role'));
      });
    // Only used for the "this is your own role" hint; the server enforces the rule regardless.
    fetchOwnProfile()
      .then((profile) => {
        if (!cancelled) setOwnRoleId(profile.role?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const readOnlyReason = role?.isSuperAdmin
    ? 'The Super Admin role cannot be modified.'
    : !canUpdate
    ? 'You can view this role but your own role does not allow editing roles.'
    : undefined;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Roles', href: '/roles' }, { label: role?.name || 'Role' }]} />
      <PageHeader
        title={role ? (readOnlyReason ? role.name : `Edit Role: ${role.name}`) : 'Role'}
        subtitle={role ? `${role.staffCount ?? 0} staff account(s) · ${role.isSystem ? 'System role' : 'Custom role'}` : undefined}
      />
      {error && <Notice kind="error">{error}</Notice>}
      {!role && !error && <div className="skeleton" style={{ height: '320px', width: '100%' }} />}
      {role && (
        <RoleForm
          key={role.id}
          role={role}
          ownRoleId={ownRoleId}
          readOnly={Boolean(readOnlyReason)}
          readOnlyReason={readOnlyReason}
          onSaved={() => router.push('/roles?saved=updated')}
        />
      )}
    </div>
  );
}

export default function RolePage() {
  return (
    <PermissionGate permission="roles:read">
      <RoleScreen />
    </PermissionGate>
  );
}
