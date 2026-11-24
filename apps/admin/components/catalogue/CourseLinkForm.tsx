'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiErrorMessage } from '../../lib/api/uploads';
import type { UploadedFileRef } from '../../lib/api/uploads';
import {
  CourseLink,
  CourseLinkInput,
  CourseLinkStatus,
  createCourseLink,
  paiseToRupeesText,
  rupeesToPaise,
  updateCourseLink,
} from '../../lib/api/catalogue';
import { UploadField } from '../uploads/UploadField';
import { Checkbox, Field, Notice, SectionCard, TagInput, gridTwo } from './ui';

interface FormState {
  title: string;
  shortDescription: string;
  category: string;
  tags: string[];
  instructorName: string;
  language: string;
  level: string;
  totalDurationMinutes: string;
  totalLessons: string;
  price: string;
  originalPrice: string;
  rating: string;
  totalReviews: string;
  platformName: string;
  redirectUrl: string;
  previewVideo: string;
  metaTitle: string;
  metaDescription: string;
  status: CourseLinkStatus;
  isFeatured: boolean;
  thumbnail: UploadedFileRef | null;
}

function initialState(course?: CourseLink): FormState {
  return {
    title: course?.title ?? '',
    shortDescription: course?.shortDescription ?? '',
    category: course?.category ?? '',
    tags: course?.tags ?? [],
    instructorName: course?.instructorName ?? '',
    language: course?.language ?? '',
    level: course?.level ?? '',
    totalDurationMinutes: course?.totalDurationMinutes != null ? String(course.totalDurationMinutes) : '',
    totalLessons: course?.totalLessons != null ? String(course.totalLessons) : '',
    price: course ? paiseToRupeesText(course.pricePaise) : '',
    originalPrice: course?.originalPricePaise != null ? paiseToRupeesText(course.originalPricePaise) : '',
    rating: course ? String(course.rating) : '',
    totalReviews: course ? String(course.totalReviews) : '',
    platformName: course?.platformName ?? '',
    redirectUrl: course?.redirectUrl ?? '',
    previewVideo: course?.previewVideo ?? '',
    metaTitle: course?.metaTitle ?? '',
    metaDescription: course?.metaDescription ?? '',
    status: course?.status ?? 'ACTIVE',
    isFeatured: course?.isFeatured ?? false,
    thumbnail: course?.thumbnail ? { url: course.thumbnail, key: course.thumbnailKey } : null,
  };
}

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function wholeNumber(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

export function CourseLinkForm({ course, onSaved }: { course?: CourseLink; onSaved: (course: CourseLink) => void }) {
  const isEdit = Boolean(course);
  const [form, setForm] = useState<FormState>(() => initialState(course));
  const [thumbnailChanged, setThumbnailChanged] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const build = (): { body: CourseLinkInput | null; problems: string[] } => {
    const found: string[] = [];
    const title = form.title.trim();
    if (title.length < 2 || title.length > 300) found.push('Course title must be 2 to 300 characters.');

    const price = rupeesToPaise(form.price);
    if (price === null) found.push('Price is required, in rupees (0 for a free course).');

    let originalPrice: number | null = null;
    if (form.originalPrice.trim() !== '') {
      originalPrice = rupeesToPaise(form.originalPrice);
      if (originalPrice === null) found.push('Original price must be an amount in rupees.');
    }

    let rating = 0;
    if (form.rating.trim() !== '') {
      const parsed = Number(form.rating);
      if (!/^\d+(\.\d+)?$/.test(form.rating.trim()) || parsed > 5) found.push('Rating must be between 0 and 5.');
      else rating = parsed;
    }

    let totalReviews = 0;
    if (form.totalReviews.trim() !== '') {
      const parsed = wholeNumber(form.totalReviews);
      if (parsed === null) found.push('Number of reviews must be a whole number.');
      else totalReviews = parsed;
    }

    let duration: number | null = null;
    if (form.totalDurationMinutes.trim() !== '') {
      duration = wholeNumber(form.totalDurationMinutes);
      if (duration === null) found.push('Duration must be a whole number of minutes.');
    }

    let lessons: number | null = null;
    if (form.totalLessons.trim() !== '') {
      lessons = wholeNumber(form.totalLessons);
      if (lessons === null) found.push('Number of lessons must be a whole number.');
    }

    const redirectUrl = form.redirectUrl.trim();
    if (!isHttpUrl(redirectUrl)) found.push('Redirect URL is required and must start with http:// or https://');
    const previewVideo = form.previewVideo.trim();
    if (previewVideo && !isHttpUrl(previewVideo)) found.push('Preview video must be a URL starting with http:// or https://');

    if (found.length > 0) return { body: null, problems: found };

    const body: CourseLinkInput = {
      title,
      shortDescription: form.shortDescription.trim() || null,
      category: form.category.trim() || null,
      tags: form.tags,
      instructorName: form.instructorName.trim() || null,
      language: form.language.trim() || null,
      level: form.level || null,
      pricePaise: price ?? 0,
      originalPricePaise: originalPrice,
      isFree: price === 0,
      rating,
      totalReviews,
      totalLessons: lessons,
      totalDurationMinutes: duration,
      previewVideo: previewVideo || null,
      platformName: form.platformName.trim() || null,
      redirectUrl,
      isFeatured: form.isFeatured,
      status: form.status,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
    };
    if (!isEdit) {
      if (form.thumbnail) body.thumbnail = form.thumbnail;
    } else if (thumbnailChanged) {
      body.thumbnail = form.thumbnail;
    }
    return { body, problems: [] };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    const result = build();
    setProblems(result.problems);
    if (!result.body) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsSaving(true);
    try {
      const saved = course ? await updateCourseLink(course.id, result.body) : await createCourseLink(result.body);
      onSaved(saved);
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Failed to save the course link'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {saveError && <Notice kind="error">{saveError}</Notice>}
      {problems.length > 0 && (
        <Notice kind="error">
          Please fix the following before saving:
          <ul style={{ margin: '0.4rem 0 0 1.1rem' }}>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      )}

      <SectionCard title="Basic Info">
        <Field label="Course Title" required hint={isEdit ? 'A new title gives the course a new slug (URL).' : undefined}>
          <input type="text" className="input-control" required minLength={2} maxLength={300} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Short Description">
          <textarea className="input-control" rows={3} maxLength={5000} placeholder="A quick summary of what students will learn..." value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
        </Field>
        <div style={gridTwo}>
          <Field label="Category">
            <input type="text" className="input-control" maxLength={200} value={form.category} onChange={(e) => set('category', e.target.value)} />
          </Field>
          <Field label="Tags" hint="Press Enter to add. Up to 50.">
            <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} placeholder="Add tag and press Enter" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Course Details">
        <div style={gridTwo}>
          <Field label="Instructor">
            <input type="text" className="input-control" maxLength={200} placeholder="Instructor name" value={form.instructorName} onChange={(e) => set('instructorName', e.target.value)} />
          </Field>
          <Field label="Language">
            <input type="text" className="input-control" maxLength={100} placeholder="e.g. Hindi" value={form.language} onChange={(e) => set('language', e.target.value)} />
          </Field>
          <Field label="Level">
            <select className="input-control" value={form.level} onChange={(e) => set('level', e.target.value)}>
              <option value="">Not set</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </Field>
          <Field label="Duration (minutes)">
            <input type="text" inputMode="numeric" className="input-control" placeholder="Course duration in minutes" value={form.totalDurationMinutes} onChange={(e) => set('totalDurationMinutes', e.target.value)} />
          </Field>
          <Field label="Lessons">
            <input type="text" inputMode="numeric" className="input-control" value={form.totalLessons} onChange={(e) => set('totalLessons', e.target.value)} />
          </Field>
          <Field label="Rating (0–5)">
            <input type="text" inputMode="decimal" className="input-control" placeholder="4.5" value={form.rating} onChange={(e) => set('rating', e.target.value)} />
          </Field>
          <Field label="Reviews">
            <input type="text" inputMode="numeric" className="input-control" value={form.totalReviews} onChange={(e) => set('totalReviews', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Pricing">
        <div style={gridTwo}>
          <Field label="Price (₹)" required hint="0 for a free course.">
            <input type="text" inputMode="decimal" className="input-control" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </Field>
          <Field label="Original Price (₹)" hint="Strike-through price. The discount percentage is calculated by the server.">
            <input type="text" inputMode="decimal" className="input-control" value={form.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Platform & Redirect">
        <div style={gridTwo}>
          <Field label="Platform Name">
            <input type="text" className="input-control" maxLength={200} placeholder="e.g. Udemy, Coursera" value={form.platformName} onChange={(e) => set('platformName', e.target.value)} />
          </Field>
          <Field label="Redirect URL" required>
            <input type="url" className="input-control" required maxLength={2048} placeholder="https://udemy.com/course/..." value={form.redirectUrl} onChange={(e) => set('redirectUrl', e.target.value)} />
          </Field>
          <Field label="Preview Video URL">
            <input type="url" className="input-control" maxLength={2048} placeholder="https://..." value={form.previewVideo} onChange={(e) => set('previewVideo', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Thumbnail">
        <UploadField
          purpose="course"
          value={form.thumbnail}
          disabled={isSaving}
          onChange={(thumbnail) => {
            set('thumbnail', thumbnail);
            setThumbnailChanged(true);
          }}
        />
      </SectionCard>

      <SectionCard title="SEO Meta">
        <Field label="Meta Title" hint={isEdit ? undefined : 'Left empty: the course title is used.'}>
          <input type="text" className="input-control" maxLength={300} value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
        </Field>
        <Field label="Meta Description" hint={isEdit ? undefined : 'Left empty: the short description is used.'}>
          <textarea className="input-control" rows={2} maxLength={1000} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard title="Publish Settings">
        <div style={gridTwo}>
          <Field label="Status">
            <select className="input-control" value={form.status} onChange={(e) => set('status', e.target.value as CourseLinkStatus)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive (hidden from the website)</option>
            </select>
          </Field>
          <div style={{ paddingTop: '1.4rem' }}>
            <Checkbox label="Featured" checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
          </div>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '2rem' }}>
        <Link href="/course-links" className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" disabled={isSaving} className="btn btn-primary">
          {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course Link'}
        </button>
      </div>
    </form>
  );
}
