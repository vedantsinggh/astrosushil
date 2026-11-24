'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import type { UploadedFileRef } from '../../lib/api/uploads';
import {
  CategoryInput,
  CategoryProductType,
  CategoryTreeNode,
  createCategory,
  deleteCategory,
  fetchCategoryTree,
  flattenCategoryTree,
  updateCategory,
} from '../../lib/api/catalogue';
import { UploadField } from '../../components/uploads/UploadField';
import {
  Breadcrumbs,
  ConfirmDialog,
  EmptyRow,
  Field,
  Modal,
  Notice,
  PageHeader,
  PermissionGate,
  SkeletonRows,
  formatDate,
  smallButton,
} from '../../components/catalogue/ui';

interface CategoryForm {
  name: string;
  description: string;
  parent: string;
  productType: CategoryProductType;
  isActive: boolean;
  image: UploadedFileRef | null;
}

const EMPTY_FORM: CategoryForm = { name: '', description: '', parent: '', productType: 'physical', isActive: true, image: null };

function descendantIds(node: CategoryTreeNode): string[] {
  return node.children.flatMap((child) => [child.id, ...descendantIds(child)]);
}

function CategoriesScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('categories:create');
  const canUpdate = hasPermission('categories:update');
  const canDelete = hasPermission('categories:delete');

  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<CategoryTreeNode | 'new' | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deleting, setDeleting] = useState<CategoryTreeNode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTree(await fetchCategoryTree());
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load categories'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => flattenCategoryTree(tree), [tree]);
  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(({ node }) => node.name.toLowerCase().includes(term) || node.slug.toLowerCase().includes(term));
  }, [rows, search]);

  /** A category cannot become a child of itself or of one of its own subcategories. */
  const parentOptions = useMemo(() => {
    if (!editing || editing === 'new') return rows;
    const blocked = new Set([editing.id, ...descendantIds(editing)]);
    return rows.filter(({ node }) => !blocked.has(node.id));
  }, [rows, editing]);

  const openCreate = (parentId = '') => {
    setForm({ ...EMPTY_FORM, parent: parentId });
    setFormError(null);
    setImageChanged(false);
    setEditing('new');
  };

  const openEdit = (node: CategoryTreeNode) => {
    setForm({
      name: node.name,
      description: node.description || '',
      parent: node.parentId || '',
      productType: node.productType,
      isActive: node.isActive,
      image: node.image ? { url: node.image.url, key: node.image.key } : null,
    });
    setFormError(null);
    setImageChanged(false);
    setEditing(node);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const name = form.name.trim();
    if (name.length < 2 || name.length > 200) {
      setFormError('Name must be 2 to 200 characters');
      return;
    }
    if (form.description.trim().length > 5000) {
      setFormError('Description must be at most 5000 characters');
      return;
    }

    const body: CategoryInput = {
      name,
      description: form.description.trim(),
      parent: form.parent || null,
      productType: form.productType,
      isActive: form.isActive,
    };
    if (editing === 'new') {
      if (form.image) body.image = form.image;
    } else if (imageChanged) {
      body.image = form.image;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        const created = await createCategory(body);
        setMessage(`Category "${created.name}" created.`);
      } else {
        const updated = await updateCategory(editing.id, body);
        setMessage(`Category "${updated.name}" updated.`);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Failed to save the category'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteCategory(deleting.id);
      setMessage(
        result.uncategorisedProducts > 0
          ? `Category "${deleting.name}" deleted. ${result.uncategorisedProducts} product(s) are now without a category.`
          : `Category "${deleting.name}" deleted.`
      );
      setDeleting(null);
      await load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Failed to delete the category'));
    } finally {
      setIsDeleting(false);
    }
  };

  const showActions = canCreate || canUpdate || canDelete;
  const columns = showActions ? 7 : 6;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Categories' }]} />
      <PageHeader
        title="Product Categories"
        subtitle="The category tree used by shop products"
        actions={
          <>
            {canCreate && (
              <button onClick={() => openCreate()} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Add Category
              </button>
            )}
            <button onClick={load} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Refresh
            </button>
          </>
        }
      />

      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <Field label="Search" style={{ marginBottom: 0, maxWidth: '420px' }}>
          <input type="text" className="input-control" placeholder="Filter by name or slug..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Image</th>
                <th>Product Type</th>
                <th>Subcategories</th>
                <th>Status</th>
                <th>Created</th>
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns} />
              ) : visibleRows.length > 0 ? (
                visibleRows.map(({ node, depth }) => (
                  <tr key={node.id}>
                    <td>
                      <div style={{ paddingLeft: `${(search.trim() ? 0 : depth) * 1.5}rem` }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {!search.trim() && depth > 0 && <span style={{ color: 'var(--text-muted)' }}>└ </span>}
                          {node.name}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{node.slug}</div>
                        {node.description && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {node.image?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={node.image.url} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{node.productType}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{node.children.length}</td>
                    <td>
                      <span className={`badge ${node.isActive ? 'badge-success' : 'badge-warning'}`}>{node.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(node.createdAt)}</td>
                    {showActions && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {canCreate && (
                            <button onClick={() => openCreate(node.id)} className="btn btn-secondary" style={smallButton}>
                              Add sub
                            </button>
                          )}
                          {canUpdate && (
                            <button onClick={() => openEdit(node)} className="btn btn-secondary" style={smallButton}>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(node);
                              }}
                              className="btn btn-secondary"
                              style={{ ...smallButton, color: 'var(--badge-danger-text)' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <EmptyRow columns={columns}>
                  {rows.length === 0 ? 'No categories yet.' : 'No categories match your search.'}
                </EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add Category' : `Edit Category: ${editing.name}`} onClose={() => setEditing(null)} busy={isSaving}>
          <form onSubmit={handleSave}>
            <Field label="Category Name" required hint={editing !== 'new' ? 'Renaming a category gives it a new slug (URL).' : undefined}>
              <input type="text" className="input-control" required minLength={2} maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Description">
              <textarea className="input-control" rows={3} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Parent Category" hint="Leave empty for a top-level category.">
              <select className="input-control" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
                <option value="">None (top level)</option>
                {parentOptions.map(({ node, depth }) => (
                  <option key={node.id} value={node.id}>
                    {'— '.repeat(depth)}
                    {node.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product Type" required>
              <select className="input-control" value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value as CategoryProductType })}>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </Field>
            <Field label="Status" required>
              <select className="input-control" value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive (hidden from the shop)</option>
              </select>
            </Field>
            <div style={{ marginBottom: '1rem' }}>
              <UploadField
                purpose="category"
                label="Image"
                value={form.image}
                disabled={isSaving}
                onChange={(image) => {
                  setForm((current) => ({ ...current, image }));
                  setImageChanged(true);
                }}
              />
            </div>

            {formError && <Notice kind="error">{formError}</Notice>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setEditing(null)} disabled={isSaving} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving ? 'Saving…' : editing === 'new' ? 'Create Category' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting &&
        (deleting.children.length > 0 ? (
          <Modal title={`Cannot delete "${deleting.name}"`} onClose={() => setDeleting(null)} width={480}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              This category has {deleting.children.length} subcategor{deleting.children.length === 1 ? 'y' : 'ies'} (
              {deleting.children.map((c) => c.name).join(', ')}). A category with subcategories cannot be deleted: delete or
              move its subcategories first.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleting(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </Modal>
        ) : (
          <ConfirmDialog
            title={`Delete category "${deleting.name}"?`}
            confirmLabel="Delete Category"
            onConfirm={handleDelete}
            onCancel={() => setDeleting(null)}
            busy={isDeleting}
            error={deleteError}
          >
            The category and its image are removed permanently. Products in this category are kept and become
            uncategorised.
          </ConfirmDialog>
        ))}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <PermissionGate permission="categories:read">
      <CategoriesScreen />
    </PermissionGate>
  );
}
