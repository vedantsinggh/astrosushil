'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiErrorMessage } from '../../../lib/api/uploads';
import { CourseLink, fetchCourseLink } from '../../../lib/api/catalogue';
import { CourseLinkForm } from '../../../components/catalogue/CourseLinkForm';
import { Breadcrumbs, Notice, PageHeader, PermissionGate } from '../../../components/catalogue/ui';

function EditCourseLinkScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [course, setCourse] = useState<CourseLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCourse(null);
    setError(null);
    fetchCourseLink(id)
      .then((result) => {
        if (!cancelled) setCourse(result);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load the course link'));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Course Links', href: '/course-links' }, { label: course?.title || 'Course Link' }]} />
      <PageHeader
        title="Edit Course Link"
        subtitle={course ? `/${course.slug} · ${course.clickCount} click(s) through the redirect` : undefined}
      />
      {error && <Notice kind="error">{error}</Notice>}
      {!course && !error && <div className="skeleton" style={{ height: '320px', width: '100%' }} />}
      {course && <CourseLinkForm course={course} onSaved={() => router.push('/course-links?saved=updated')} />}
    </div>
  );
}

export default function EditCourseLinkPage() {
  return (
    <PermissionGate permission="courses:update">
      <EditCourseLinkScreen />
    </PermissionGate>
  );
}
