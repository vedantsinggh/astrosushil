'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiErrorMessage } from '../../lib/api/uploads';
import {
  AdminRole,
  PermissionMatrixGroup,
  RoleInput,
  RoleStatus,
  createRole,
  fetchPermissionMatrix,
  updateRole,
} from '../../lib/api/staff';
import { Field, Notice, SectionCard, gridTwo, smallButton } from './ui';

/**
 * Create / edit a role with the grouped permission matrix of `GET /admin/permissions`.
 * `readOnly` shows the role without any way to change it (no `roles:update`, or the Super Admin role).
 */
export function RoleForm({
  role,
  ownRoleId,
  readOnly,
  readOnlyReason,
  onSaved,
}: {
  role?: AdminRole;
  /** The signed-in staff member's own role, when known. */
  ownRoleId?: string | null;
  readOnly?: boolean;
  readOnlyReason?: string;
  onSaved: (role: AdminRole) => void;
}) {
  const isEdit = Boolean(role);
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [status, setStatus] = useState<RoleStatus>(role?.status ?? 'ACTIVE');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role?.permissions ?? []));
  const [filter, setFilter] = useState('');

  const [matrix, setMatrix] = useState<PermissionMatrixGroup[] | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPermissionMatrix()
      .then((groups) => {
        if (!cancelled) setMatrix(groups);
      })
      .catch((err) => {
        if (!cancelled) setMatrixError(apiErrorMessage(err, 'Failed to load the permission list'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allKeys = useMemo(() => (matrix ?? []).flatMap((g) => g.modules.flatMap((m) => m.permissions.map((p) => p.key))), [matrix]);
  const isOwnRole = Boolean(role && ownRoleId && role.id === ownRoleId);
  const locked = Boolean(readOnly);

  const visibleGroups = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!matrix) return [];
    if (!term) return matrix;
    return matrix
      .map((group) => ({
        ...group,
        modules: group.modules
          .map((module) => ({
            ...module,
            permissions:
              module.moduleLabel.toLowerCase().includes(term) || group.group.toLowerCase().includes(term)
                ? module.permissions
                : module.permissions.filter((p) => p.label.toLowerCase().includes(term) || p.key.toLowerCase().includes(term)),
          }))
          .filter((module) => module.permissions.length > 0),
      }))
      .filter((group) => group.modules.length > 0);
  }, [matrix, filter]);

  const setKeys = (keys: string[], on: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (locked) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setFormError('Role name must be 2 to 50 characters');
      return;
    }
    if (description.trim().length > 300) {
      setFormError('Description must be at most 300 characters');
      return;
    }

    // Only keys of the current catalogue are sent: the server refuses any other key.
    const permissions = allKeys.filter((key) => selected.has(key));
    const body: RoleInput = { description: description.trim(), permissions, status };
    // A system role cannot be renamed, so its name is not sent.
    if (!role?.isSystem) body.name = trimmedName;

    setIsSaving(true);
    setFormError(null);
    try {
      const saved = role ? await updateRole(role.id, body) : await createRole(body);
      onSaved(saved);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Failed to save the role'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = allKeys.filter((key) => selected.has(key)).length;

  return (
    <form onSubmit={handleSubmit}>
      {formError && <Notice kind="error">{formError}</Notice>}
      {locked && readOnlyReason && <Notice kind="info">{readOnlyReason}</Notice>}
      {!locked && isOwnRole && (
        <Notice kind="warning">
          This is your own role. You cannot deactivate it, and unless you are a Super Admin you cannot remove the
          &quot;View Roles&quot; or &quot;Edit Roles&quot; permissions from it.
        </Notice>
      )}

      <SectionCard title="Role">
        <div style={gridTwo}>
          <Field label="Role Name" required hint={role?.isSystem ? 'A system role cannot be renamed.' : undefined}>
            <input
              type="text"
              className="input-control"
              required
              minLength={2}
              maxLength={50}
              placeholder="e.g. Sales Manager"
              value={name}
              disabled={locked || role?.isSystem}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Status" hint="Members of an inactive role cannot sign in to the admin.">
            <select className="input-control" value={status} disabled={locked || isOwnRole} onChange={(e) => setStatus(e.target.value as RoleStatus)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea className="input-control" rows={2} maxLength={300} placeholder="What is this role for?" value={description} disabled={locked} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard title="Permissions">
        {role?.isSuperAdmin ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>The Super Admin role always has every permission.</p>
        ) : matrixError ? (
          <Notice kind="error">{matrixError}</Notice>
        ) : !matrix ? (
          <div className="skeleton" style={{ height: '200px', width: '100%' }} />
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <input type="text" className="input-control" style={{ maxWidth: '320px' }} placeholder="Search permissions…" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {selectedCount} of {allKeys.length} selected
              </span>
              {!locked && (
                <>
                  <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setKeys(allKeys, true)}>
                    Select all
                  </button>
                  <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setKeys(allKeys, false)}>
                    Clear all
                  </button>
                </>
              )}
            </div>

            {visibleGroups.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No permissions match your search.</p>}

            {visibleGroups.map((group) => {
              const groupKeys = group.modules.flatMap((m) => m.permissions.map((p) => p.key));
              const groupAll = groupKeys.every((key) => selected.has(key));
              return (
                <div key={group.group} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{group.group}</strong>
                    {!locked && (
                      <label style={{ fontSize: '0.75rem', display: 'flex', gap: '0.35rem', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" checked={groupAll} onChange={(e) => setKeys(groupKeys, e.target.checked)} />
                        All in group
                      </label>
                    )}
                  </div>
                  {group.modules.map((module) => {
                    const moduleKeys = module.permissions.map((p) => p.key);
                    const moduleAll = moduleKeys.every((key) => selected.has(key));
                    return (
                      <div key={module.module} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.75rem', padding: '0.6rem 0.85rem', borderBottom: '1px solid var(--border-color)', alignItems: 'start' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.4rem', alignItems: 'center', cursor: locked ? 'default' : 'pointer' }}>
                          {!locked && <input type="checkbox" checked={moduleAll} onChange={(e) => setKeys(moduleKeys, e.target.checked)} aria-label={`All ${module.moduleLabel} permissions`} />}
                          {module.moduleLabel}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1.25rem' }}>
                          {module.permissions.map((permission) => (
                            <label key={permission.key} title={permission.key} style={{ fontSize: '0.85rem', display: 'flex', gap: '0.35rem', alignItems: 'center', cursor: locked ? 'default' : 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={selected.has(permission.key)}
                                disabled={locked}
                                onChange={(e) => setKeys([permission.key], e.target.checked)}
                              />
                              {permission.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '2rem' }}>
        <Link href="/roles" className="btn btn-secondary">
          {locked ? 'Back' : 'Cancel'}
        </Link>
        {!locked && (
          <button type="submit" disabled={isSaving || (!matrix && !role?.isSuperAdmin)} className="btn btn-primary">
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        )}
      </div>
    </form>
  );
}
