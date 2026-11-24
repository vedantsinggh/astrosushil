'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createConsultationType } from '../../../lib/api/bookings';
import { ConsultationTypeForm } from '../../../components/sales/ConsultationTypeForm';
import { PageHeader, RequirePermission } from '../../../components/sales/ui';

export default function NewConsultationTypePage() {
  const router = useRouter();
  return (
    <RequirePermission permission="consultations:create">
      <PageHeader crumbs={[{ label: 'Consultation Types', href: '/consultation-types' }, { label: 'Add' }]} title="Add consultation" subtitle="A consultation customers can book, with its modes and prices" />
      <ConsultationTypeForm
        existing={null}
        submitLabel="Create consultation"
        onCancel={() => router.push('/consultation-types')}
        onSubmit={async (body) => {
          const created = await createConsultationType(body);
          router.push(`/consultation-types/${created.id}?saved=created`);
        }}
      />
    </RequirePermission>
  );
}
