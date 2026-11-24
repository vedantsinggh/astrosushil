'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ConsultationType, getConsultationType, updateConsultationType } from '../../../../lib/api/bookings';
import { errorMessage } from '../../../../lib/api/sales';
import { ConsultationTypeForm } from '../../../../components/sales/ConsultationTypeForm';
import { PageHeader, RequirePermission } from '../../../../components/sales/ui';

function EditScreen() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [type, setType] = useState<ConsultationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getConsultationType(id)
      .then((data) => {
        if (!cancelled) setType(data);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) return <div className="skeleton" style={{ height: '320px', width: '100%' }} />;
  if (error || !type) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--badge-danger-text)', marginBottom: '0.5rem' }}>Consultation not available</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to load this consultation'}</p>
        <Link href="/consultation-types" className="btn btn-secondary">
          ← Back to Consultation Types
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Consultation Types', href: '/consultation-types' }, { label: type.title, href: `/consultation-types/${type.id}` }, { label: 'Edit' }]}
        title={`Edit ${type.title}`}
      />
      <ConsultationTypeForm
        existing={type}
        submitLabel="Save changes"
        onCancel={() => router.push(`/consultation-types/${type.id}`)}
        onSubmit={async (body) => {
          await updateConsultationType(type.id, body);
          router.push(`/consultation-types/${type.id}?saved=updated`);
        }}
      />
    </>
  );
}

export default function EditConsultationTypePage() {
  return (
    <RequirePermission permission="consultations:update">
      <EditScreen />
    </RequirePermission>
  );
}
