'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/api/uploads';
import {
  StaffMember,
  StaffProfileInput,
  changeOwnPassword,
  fetchOwnProfile,
  passwordProblem,
  staffProfileChanges,
  updateOwnProfile,
} from '../../lib/api/staff';
import { Breadcrumbs, Field, Notice, PageHeader, SectionCard, formatDateTime, gridTwo } from '../../components/catalogue/ui';

type ProfileForm = Record<keyof StaffProfileInput, string>;

function toForm(profile: StaffMember): ProfileForm {
  return {
    fullName: profile.fullName ?? '',
    phoneNumber: profile.phoneNumber ?? '',
    designation: profile.designation ?? '',
    website: profile.website ?? '',
    portfolioLink: profile.portfolioLink ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    postalCode: profile.postalCode ?? '',
  };
}

/** The signed-in staff member's own profile and password. Needs no permission key. */
export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await fetchOwnProfile();
      setProfile(result);
      setForm(toForm(result));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load your profile'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !form) return;
    setProfileMessage(null);
    const { changes, cannotClear, problem } = staffProfileChanges(profile, form);
    if (problem) return setProfileError(problem);
    if (cannotClear.length > 0) {
      return setProfileError(`${cannotClear.join(', ')} cannot be emptied: the server only accepts a new value for it. Enter a value or restore the old one.`);
    }
    if (Object.keys(changes).length === 0) {
      setProfileError(null);
      setProfileMessage('Nothing to save: no field was changed.');
      return;
    }
    setIsSaving(true);
    setProfileError(null);
    try {
      const updated = await updateOwnProfile(changes);
      setProfile(updated);
      setForm(toForm(updated));
      setProfileMessage('Your profile was updated.');
    } catch (err) {
      setProfileError(apiErrorMessage(err, 'Failed to update your profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!oldPassword) return setPasswordError('Enter your current password');
    const problem = passwordProblem(newPassword);
    if (problem) return setPasswordError(problem);
    if (newPassword !== confirmPassword) return setPasswordError('The two new passwords do not match');

    setIsChanging(true);
    setPasswordError(null);
    try {
      await changeOwnPassword(oldPassword, newPassword);
      setPasswordChanged(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Failed to change your password'));
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'My Profile' }]} />
      <PageHeader title="My Profile" subtitle={user?.email} />

      {loadError && <Notice kind="error">{loadError}</Notice>}
      {isLoading && <div className="skeleton" style={{ height: '240px', width: '100%', marginBottom: '1.5rem' }} />}

      {profile && form && (
        <SectionCard title="Profile">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span className={`badge ${profile.role?.isSuperAdmin ? 'badge-danger' : 'badge-info'}`}>{profile.role?.name || 'No role'}</span>
            <span className={`badge ${profile.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{profile.status}</span>
            <span>Email: {profile.email}</span>
            {profile.username && <span>· Username: {profile.username}</span>}
            <span>· Last login: {profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : 'not recorded'}</span>
          </div>
          <form onSubmit={handleSave}>
            <div style={gridTwo}>
              <Field label="Full Name" required>
                <input type="text" className="input-control" maxLength={80} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input type="tel" className="input-control" maxLength={15} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </Field>
              <Field label="Designation">
                <input type="text" className="input-control" maxLength={80} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </Field>
              <Field label="Website">
                <input type="url" className="input-control" maxLength={300} placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </Field>
              <Field label="Portfolio Link">
                <input type="url" className="input-control" maxLength={300} placeholder="https://" value={form.portfolioLink} onChange={(e) => setForm({ ...form, portfolioLink: e.target.value })} />
              </Field>
              <Field label="City">
                <input type="text" className="input-control" maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="State">
                <input type="text" className="input-control" maxLength={80} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </Field>
              <Field label="Postal Code">
                <input type="text" className="input-control" maxLength={20} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </Field>
            </div>
            <Field label="Address">
              <textarea className="input-control" rows={2} maxLength={300} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            {profileError && <Notice kind="error">{profileError}</Notice>}
            {profileMessage && <Notice kind="success" onDismiss={() => setProfileMessage(null)}>{profileMessage}</Notice>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Change Password">
        {passwordChanged ? (
          <>
            <Notice kind="success">
              Your password was changed and every session of your account was signed out. Sign in again with the new
              password.
            </Notice>
            <button type="button" onClick={logout} className="btn btn-primary">
              Sign in again
            </button>
          </>
        ) : (
          <form onSubmit={handlePassword} style={{ maxWidth: '420px' }}>
            <Field label="Current Password" required>
              <input type="password" className="input-control" required autoComplete="current-password" maxLength={100} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </Field>
            <Field label="New Password" required hint="8 to 100 characters with an uppercase letter, a lowercase letter and a number or symbol.">
              <input type="password" className="input-control" required autoComplete="new-password" maxLength={100} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Field>
            <Field label="Confirm New Password" required>
              <input type="password" className="input-control" required autoComplete="new-password" maxLength={100} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </Field>
            {passwordError && <Notice kind="error">{passwordError}</Notice>}
            <button type="submit" disabled={isChanging} className="btn btn-primary">
              {isChanging ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
