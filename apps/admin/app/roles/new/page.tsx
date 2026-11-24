'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RoleForm } from '../../../components/catalogue/RoleForm';
import { Breadcrumbs, PageHeader, PermissionGate } from '../../../components/catalogue/ui';

export default function NewRolePage() {
  const router = useRouter();
  return (
    <PermissionGate permission="roles:create">
      <Breadcrumbs items={[{ label: 'Roles', href: '/roles' }, { label: 'Create Role' }]} />
      <PageHeader title="Create Role" subtitle="Name the role and choose what its members may do" />
      <RoleForm onSaved={() => router.push('/roles?saved=created')} />
    </PermissionGate>
  );
}
