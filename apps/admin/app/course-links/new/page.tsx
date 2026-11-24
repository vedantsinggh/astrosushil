'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CourseLinkForm } from '../../../components/catalogue/CourseLinkForm';
import { Breadcrumbs, PageHeader, PermissionGate } from '../../../components/catalogue/ui';

export default function NewCourseLinkPage() {
  const router = useRouter();
  return (
    <PermissionGate permission="courses:create">
      <Breadcrumbs items={[{ label: 'Course Links', href: '/course-links' }, { label: 'Add Course Link' }]} />
      <PageHeader title="Add Course Link" subtitle="A course card that sends visitors to an outside platform" />
      <CourseLinkForm onSaved={() => router.push('/course-links?saved=created')} />
    </PermissionGate>
  );
}
