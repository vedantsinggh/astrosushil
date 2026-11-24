'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Faq, FaqInput, apiErrorMessage, faqsApi } from '../../lib/api/content';
import {
  ActiveBadge,
  Checkbox,
  ConfirmDialog,
  EmptyRow,
  Field,
  LoadError,
  Modal,
  Notice,
  ORDER_MAX,
  ORDER_MIN,
  PageHeader,
  PermissionGate,
  SkeletonRows,
  dangerText,
  labelStyle,
  parseInteger,
  smallButton,
  useNotice,
} from '../../components/content/ui';

interface FaqFormState {
  question: string;
  answer: string;
  page: string;
  order: string;
  isActive: boolean;
}

type FormErrors = Partial<Record<'question' | 'answer' | 'page' | 'order', string>>;

function validate(form: FaqFormState): FormErrors {
  const errors: FormErrors = {};
  const question = form.question.trim();
  const answer = form.answer.trim();
  const page = form.page.trim();
  if (question.length < 5) errors.question = 'The question needs at least 5 characters.';
  else if (question.length > 1000) errors.question = 'At most 1000 characters.';
  if (answer.length < 5) errors.answer = 'The answer needs at least 5 characters.';
  else if (answer.length > 10000) errors.answer = 'At most 10000 characters.';
  if (page.length < 1) errors.page = 'The page is required.';
  else if (page.length > 100) errors.page = 'At most 100 characters.';
  if (parseInteger(form.order, ORDER_MIN, ORDER_MAX) === null) errors.order = 'Enter a whole number.';
  return errors;
}

function FaqFormModal({
  faq,
  knownPages,
  onClose,
  onSaved,
}: {
  faq: Faq | null;
  knownPages: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<FaqFormState>(() =>
    faq
      ? { question: faq.question, answer: faq.answer, page: faq.page, order: String(faq.order), isActive: faq.isActive }
      : { question: '', answer: '', page: '', order: '0', isActive: true }
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof FaqFormState>(key: K, value: FaqFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: FaqInput = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      page: form.page.trim(),
      order: parseInteger(form.order, ORDER_MIN, ORDER_MAX) ?? 0,
      isActive: form.isActive,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (faq) {
        await faqsApi.update(faq.id, input);
        onSaved('FAQ updated.');
      } else {
        await faqsApi.create(input);
        onSaved('FAQ created.');
      }
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Could not save the FAQ.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={faq ? 'Edit FAQ' : 'Add FAQ'}
      onClose={isSaving ? () => undefined : onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="faq-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : faq ? 'Save changes' : 'Create FAQ'}
          </button>
        </>
      }
    >
      <form id="faq-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {saveError && <Notice notice={{ kind: 'error', text: saveError }} />}

        <Field label="Question" required error={errors.question}>
          <input type="text" className="input-control" maxLength={1000} value={form.question} onChange={(e) => set('question', e.target.value)} />
        </Field>
        <Field label="Answer" required error={errors.answer} hint="Plain text. It is shown as text on the website.">
          <textarea className="input-control" rows={6} maxLength={10000} value={form.answer} onChange={(e) => set('answer', e.target.value)} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <Field label="Page" required error={errors.page} hint="The page the FAQ belongs to, e.g. home, about, services.">
            <input
              type="text"
              className="input-control"
              list="faq-pages"
              maxLength={100}
              value={form.page}
              onChange={(e) => set('page', e.target.value)}
            />
            <datalist id="faq-pages">
              {knownPages.map((page) => (
                <option key={page} value={page} />
              ))}
            </datalist>
          </Field>
          <Field label="Order" error={errors.order} hint="Lower numbers show first.">
            <input type="number" step={1} className="input-control" value={form.order} onChange={(e) => set('order', e.target.value)} />
          </Field>
        </div>

        <Checkbox label="Active" description="Only active FAQs are shown on the website." checked={form.isActive} onChange={(v) => set('isActive', v)} />
      </form>
    </Modal>
  );
}

function FaqsScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('faqs:create');
  const canUpdate = hasPermission('faqs:update');
  const canDelete = hasPermission('faqs:delete');

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [knownPages, setKnownPages] = useState<string[]>([]);
  const [pageFilter, setPageFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, showSuccess, showError, clear } = useNotice();

  const [editing, setEditing] = useState<Faq | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await faqsApi.list({ page: pageFilter, isActive: activeFilter });
      setFaqs(items);
      // Remember every page name seen, so the filter keeps its options while a filter is applied.
      setKnownPages((prev) => Array.from(new Set([...prev, ...items.map((f) => f.page)])).sort());
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load FAQs.'));
    } finally {
      setIsLoading(false);
    }
  }, [pageFilter, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const pageOptions = useMemo(
    () => (pageFilter && !knownPages.includes(pageFilter) ? [...knownPages, pageFilter].sort() : knownPages),
    [knownPages, pageFilter]
  );

  const handleToggle = async (faq: Faq) => {
    setBusyId(faq.id);
    try {
      await faqsApi.update(faq.id, { isActive: !faq.isActive });
      showSuccess(`FAQ ${faq.isActive ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (err) {
      showError(apiErrorMessage(err, 'Could not change the FAQ status.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    setDeleteError(null);
    try {
      await faqsApi.remove(deleting.id);
      setDeleting(null);
      showSuccess('FAQ deleted.');
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Could not delete the FAQ.'));
    } finally {
      setBusyId(null);
    }
  };

  const columns = 6;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'FAQs' }]}
        title="FAQs"
        subtitle="Questions and answers shown on the website, per page"
        actions={
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={load}>
              🔄 Refresh
            </button>
            {canCreate && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                + Add FAQ
              </button>
            )}
          </>
        }
      />

      <Notice notice={notice} onClose={clear} />
      {loadError && <LoadError message={loadError} onRetry={load} />}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Page</label>
            <select className="input-control" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)}>
              <option value="">All pages</option>
              {pageOptions.map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="input-control" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="">Active and inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Question</th>
                <th>Answer</th>
                <th>Page</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : faqs.length === 0 ? (
                <EmptyRow columns={columns}>{loadError ? 'FAQs could not be loaded.' : 'No FAQs match these filters.'}</EmptyRow>
              ) : (
                faqs.map((faq) => (
                  <tr key={faq.id}>
                    <td>{faq.order}</td>
                    <td style={{ maxWidth: '280px', fontWeight: 600 }}>{faq.question}</td>
                    <td style={{ maxWidth: '380px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {faq.answer.length > 160 ? `${faq.answer.slice(0, 160)}…` : faq.answer}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'none' }}>
                        {faq.page}
                      </span>
                    </td>
                    <td>
                      <ActiveBadge active={faq.isActive} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {canUpdate && (
                          <>
                            <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setEditing(faq)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={smallButton}
                              disabled={busyId === faq.id}
                              onClick={() => handleToggle(faq)}
                            >
                              {faq.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ ...smallButton, ...dangerText }}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(faq);
                            }}
                          >
                            Delete
                          </button>
                        )}
                        {!canUpdate && !canDelete && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>View only</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && faqs.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>{faqs.length} FAQ(s)</p>
        )}
      </div>

      {editing && (
        <FaqFormModal
          faq={editing === 'new' ? null : editing}
          knownPages={knownPages}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            showSuccess(message);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete FAQ"
          message={
            <>
              Delete the question <strong>{deleting.question}</strong>? This cannot be undone.
            </>
          }
          busy={busyId === deleting.id}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default function FaqsPage() {
  return (
    <PermissionGate permission="faqs:read" area="FAQs">
      <FaqsScreen />
    </PermissionGate>
  );
}
