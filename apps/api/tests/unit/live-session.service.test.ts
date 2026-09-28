/**
 * @file live-session.service.test.ts
 * @description Unit tests for the LiveSessionService (Phase 3)
 *
 * Uses Vitest with vi.mock() for prisma. No database connection required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Prisma Mock – must use vi.hoisted() so variables are available when
// vi.mock() factory is hoisted to the top of the module
// ---------------------------------------------------------------------------

const mockPrisma = vi.hoisted(() => ({
  consultationSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  consultationNote: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sessionObservation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  birthProfile: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  report: {
    findMany: vi.fn(),
  },
}));

vi.mock('../../src/services/prisma.service', () => ({
  prisma: mockPrisma,
}));

// ---------------------------------------------------------------------------
// Import service (after mocks are set up)
// ---------------------------------------------------------------------------

import { LiveSessionService } from '../../src/modules/admin/live-session.service';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SERVICE = new LiveSessionService();

const ADMIN_USER = { id: 'admin-1', email: 'astrologer@admin.com', role: 'ADMIN' };
const SUPER_ADMIN = { id: 'super-1', email: 'super@admin.com', role: 'SUPER_ADMIN' };

const MOCK_USER = {
  id: 'user-1',
  email: 'client@test.com',
  fullName: 'Test Client',
  phoneNumber: null,
};
const MOCK_PROFILE = {
  id: 'profile-1',
  name: 'Test Profile',
  dateOfBirth: '1990-01-01',
  timeOfBirth: '12:00:00',
  placeName: 'Mumbai',
  latitude: 19.0,
  longitude: 72.8,
  timezone: 'Asia/Kolkata',
  userId: 'user-1',
};
const MOCK_SESSION = {
  id: 'session-1',
  adminId: 'admin-1',
  adminEmail: 'astrologer@admin.com',
  userId: 'user-1',
  birthProfileId: 'profile-1',
  status: 'ACTIVE',
  startedAt: new Date('2026-09-24T10:00:00Z'),
  endedAt: null,
  durationSeconds: null,
  createdAt: new Date('2026-09-24T10:00:00Z'),
  updatedAt: new Date('2026-09-24T10:00:00Z'),
};
const MOCK_NOTE = {
  id: 'note-1',
  sessionId: 'session-1',
  adminId: 'admin-1',
  content: 'Sun in 10th house — strong career potential',
  section: 'planets',
  subject: 'Career',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------

describe('LiveSessionService.createSession', () => {
  it('creates a session when valid user and profile are provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
    mockPrisma.birthProfile.findUnique.mockResolvedValue(MOCK_PROFILE);
    mockPrisma.consultationSession.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.consultationSession.create.mockResolvedValue(MOCK_SESSION);

    const result = await SERVICE.createSession(
      { userId: 'user-1', birthProfileId: 'profile-1' },
      ADMIN_USER
    );

    expect(result.session.id).toBe('session-1');
    expect(result.session.status).toBe('ACTIVE');
    expect(result.client.name).toBe('Test Client');
    expect(result.birthProfile.name).toBe('Test Profile');
    expect(mockPrisma.consultationSession.create).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      SERVICE.createSession({ userId: 'nonexistent', birthProfileId: 'profile-1' }, ADMIN_USER)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('throws NotFoundError when birth profile does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
    mockPrisma.birthProfile.findUnique.mockResolvedValue(null);

    await expect(
      SERVICE.createSession({ userId: 'user-1', birthProfileId: 'nonexistent' }, ADMIN_USER)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('throws AuthorizationError when birth profile belongs to a different user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
    mockPrisma.birthProfile.findUnique.mockResolvedValue({
      ...MOCK_PROFILE,
      userId: 'other-user',
    });

    await expect(
      SERVICE.createSession({ userId: 'user-1', birthProfileId: 'profile-1' }, ADMIN_USER)
    ).rejects.toMatchObject({ name: 'AuthorizationError' });
  });

  it('abandons existing ACTIVE sessions before creating a new one', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
    mockPrisma.birthProfile.findUnique.mockResolvedValue(MOCK_PROFILE);
    mockPrisma.consultationSession.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.consultationSession.create.mockResolvedValue(MOCK_SESSION);

    await SERVICE.createSession({ userId: 'user-1', birthProfileId: 'profile-1' }, ADMIN_USER);

    expect(mockPrisma.consultationSession.updateMany).toHaveBeenCalledWith({
      where: { adminId: 'admin-1', userId: 'user-1', status: 'ACTIVE' },
      data: expect.objectContaining({ status: 'ABANDONED' }),
    });
  });
});

// ---------------------------------------------------------------------------
// endSession
// ---------------------------------------------------------------------------

describe('LiveSessionService.endSession', () => {
  it('marks an ACTIVE session as COMPLETED and computes duration', async () => {
    const sessionWithCount = {
      ...MOCK_SESSION,
      startedAt: new Date(Date.now() - 300_000), // 5 minutes ago
      _count: { notes: 2, observations: 1 },
    };
    mockPrisma.consultationSession.findUnique.mockResolvedValue(sessionWithCount);
    mockPrisma.consultationSession.update.mockResolvedValue({
      ...sessionWithCount,
      status: 'COMPLETED',
      endedAt: new Date(),
      durationSeconds: 300,
    });

    const result = await SERVICE.endSession('session-1', ADMIN_USER);

    expect(result.session.status).toBe('COMPLETED');
    expect(result.summary.notesCount).toBe(2);
    expect(result.summary.observationsCount).toBe(1);
    expect(result.summary.durationSeconds).toBeGreaterThan(0);
  });

  it('throws AuthorizationError when a different admin tries to end the session', async () => {
    const other = { id: 'other-admin', email: 'other@admin.com', role: 'ADMIN' };
    mockPrisma.consultationSession.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      _count: { notes: 0, observations: 0 },
    });

    await expect(SERVICE.endSession('session-1', other)).rejects.toMatchObject({
      name: 'AuthorizationError',
    });
  });

  it('allows SUPER_ADMIN to end any session', async () => {
    const sessionWithCount = {
      ...MOCK_SESSION,
      startedAt: new Date(Date.now() - 60_000),
      _count: { notes: 0, observations: 0 },
    };
    mockPrisma.consultationSession.findUnique.mockResolvedValue(sessionWithCount);
    mockPrisma.consultationSession.update.mockResolvedValue({
      ...sessionWithCount,
      status: 'COMPLETED',
      endedAt: new Date(),
      durationSeconds: 60,
    });

    const result = await SERVICE.endSession('session-1', SUPER_ADMIN);
    expect(result.session.status).toBe('COMPLETED');
  });

  it('throws ValidationError when session is already COMPLETED', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue({
      ...MOCK_SESSION,
      status: 'COMPLETED',
      _count: { notes: 0, observations: 0 },
    });

    await expect(SERVICE.endSession('session-1', ADMIN_USER)).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('throws NotFoundError when session does not exist', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue(null);

    await expect(SERVICE.endSession('nonexistent', ADMIN_USER)).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });
});

// ---------------------------------------------------------------------------
// createNote
// ---------------------------------------------------------------------------

describe('LiveSessionService.createNote', () => {
  const ACTIVE_SESSION_STUB = { id: 'session-1', adminId: 'admin-1', status: 'ACTIVE' };

  it('creates a note for an active session', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue(ACTIVE_SESSION_STUB);
    mockPrisma.consultationNote.create.mockResolvedValue(MOCK_NOTE);

    const result = await SERVICE.createNote(
      'session-1',
      { content: 'Sun in 10th house — strong career potential', section: 'planets', subject: 'Career' },
      ADMIN_USER
    );

    expect(result.note.id).toBe('note-1');
    expect(result.note.content).toBe('Sun in 10th house — strong career potential');
  });

  it('throws ValidationError for empty content', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue(ACTIVE_SESSION_STUB);

    await expect(
      SERVICE.createNote('session-1', { content: '   ' }, ADMIN_USER)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('throws ValidationError when content exceeds 10,000 characters', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue(ACTIVE_SESSION_STUB);

    await expect(
      SERVICE.createNote('session-1', { content: 'x'.repeat(10001) }, ADMIN_USER)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('throws ValidationError when session is not ACTIVE', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue({
      ...ACTIVE_SESSION_STUB,
      status: 'COMPLETED',
    });

    await expect(
      SERVICE.createNote('session-1', { content: 'Valid note' }, ADMIN_USER)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('throws AuthorizationError when a different admin tries to add a note', async () => {
    const other = { id: 'other-admin', email: 'other@admin.com', role: 'ADMIN' };
    mockPrisma.consultationSession.findUnique.mockResolvedValue(ACTIVE_SESSION_STUB);

    await expect(
      SERVICE.createNote('session-1', { content: 'Valid note' }, other)
    ).rejects.toMatchObject({ name: 'AuthorizationError' });
  });
});

// ---------------------------------------------------------------------------
// addObservation
// ---------------------------------------------------------------------------

describe('LiveSessionService.addObservation', () => {
  const ACTIVE_SESSION_STUB = { id: 'session-1', adminId: 'admin-1', status: 'ACTIVE' };

  it('adds a valid IMPORTANT observation', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue(ACTIVE_SESSION_STUB);
    mockPrisma.sessionObservation.create.mockResolvedValue({
      id: 'obs-1',
      sessionId: 'session-1',
      adminId: 'admin-1',
      tag: 'IMPORTANT',
      note: 'Check this further',
      section: 'planets',
      createdAt: new Date(),
    });

    const result = await SERVICE.addObservation(
      'session-1',
      { tag: 'IMPORTANT', note: 'Check this further', section: 'planets' },
      ADMIN_USER
    );

    expect(result.observation.tag).toBe('IMPORTANT');
    expect(result.observation.note).toBe('Check this further');
  });

  it.each([['FOLLOW_UP'], ['DISCUSSED'], ['REPORT_NEEDED']] as const)(
    'accepts valid tag %s',
    async (tag) => {
      mockPrisma.consultationSession.findUnique.mockResolvedValue(ACTIVE_SESSION_STUB);
      mockPrisma.sessionObservation.create.mockResolvedValue({
        id: 'obs-2', sessionId: 'session-1', adminId: 'admin-1',
        tag, note: null, section: null, createdAt: new Date(),
      });
      const result = await SERVICE.addObservation('session-1', { tag } as any, ADMIN_USER);
      expect(result.observation.tag).toBe(tag);
    }
  );

  it('throws ValidationError for invalid tag', async () => {
    mockPrisma.consultationSession.findUnique.mockResolvedValue(ACTIVE_SESSION_STUB);

    await expect(
      SERVICE.addObservation('session-1', { tag: 'INVALID_TAG' as any }, ADMIN_USER)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------

describe('LiveSessionService.deleteNote', () => {
  it('allows the note author to delete their note', async () => {
    mockPrisma.consultationNote.findUnique.mockResolvedValue(MOCK_NOTE);
    mockPrisma.consultationNote.delete.mockResolvedValue(MOCK_NOTE);

    const result = await SERVICE.deleteNote('session-1', 'note-1', ADMIN_USER);
    expect(result.message).toContain('deleted');
  });

  it('allows SUPER_ADMIN to delete any note', async () => {
    mockPrisma.consultationNote.findUnique.mockResolvedValue({
      ...MOCK_NOTE,
      adminId: 'someone-else',
    });
    mockPrisma.consultationNote.delete.mockResolvedValue(MOCK_NOTE);

    const result = await SERVICE.deleteNote('session-1', 'note-1', SUPER_ADMIN);
    expect(result.message).toContain('deleted');
  });

  it('throws AuthorizationError when non-author tries to delete note', async () => {
    const other = { id: 'other-admin', email: 'other@admin.com', role: 'ADMIN' };
    mockPrisma.consultationNote.findUnique.mockResolvedValue(MOCK_NOTE); // owned by admin-1

    await expect(SERVICE.deleteNote('session-1', 'note-1', other)).rejects.toMatchObject({
      name: 'AuthorizationError',
    });
  });

  it('throws NotFoundError when note does not belong to session', async () => {
    mockPrisma.consultationNote.findUnique.mockResolvedValue({
      ...MOCK_NOTE,
      sessionId: 'different-session',
    });

    await expect(SERVICE.deleteNote('session-1', 'note-1', ADMIN_USER)).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });

  it('throws NotFoundError when note does not exist', async () => {
    mockPrisma.consultationNote.findUnique.mockResolvedValue(null);

    await expect(SERVICE.deleteNote('session-1', 'nonexistent', ADMIN_USER)).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });
});

// ---------------------------------------------------------------------------
// listSessions
// ---------------------------------------------------------------------------

describe('LiveSessionService.listSessions', () => {
  it('returns paginated sessions for the requesting admin', async () => {
    const mockSessions = [
      { ...MOCK_SESSION, _count: { notes: 3, observations: 1 } },
    ];
    mockPrisma.consultationSession.count.mockResolvedValue(1);
    mockPrisma.consultationSession.findMany.mockResolvedValue(mockSessions);
    mockPrisma.user.findMany.mockResolvedValue([MOCK_USER]);

    const result = await SERVICE.listSessions(ADMIN_USER, { page: 1, limit: 10 });

    expect(result.sessions).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.sessions[0].notesCount).toBe(3);
    expect(result.sessions[0].observationsCount).toBe(1);
  });

  it('SUPER_ADMIN sees all sessions (no adminId filter in where clause)', async () => {
    mockPrisma.consultationSession.count.mockResolvedValue(0);
    mockPrisma.consultationSession.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);

    await SERVICE.listSessions(SUPER_ADMIN, {});

    // The where arg passed to findMany should NOT include adminId for SUPER_ADMIN
    const whereArg = mockPrisma.consultationSession.findMany.mock.calls[0][0].where;
    expect(whereArg.adminId).toBeUndefined();
  });

  it('applies status filter when provided', async () => {
    mockPrisma.consultationSession.count.mockResolvedValue(0);
    mockPrisma.consultationSession.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);

    await SERVICE.listSessions(ADMIN_USER, { status: 'COMPLETED' });

    const whereArg = mockPrisma.consultationSession.findMany.mock.calls[0][0].where;
    expect(whereArg.status).toBe('COMPLETED');
  });

  it('caps limit at 50', async () => {
    mockPrisma.consultationSession.count.mockResolvedValue(0);
    mockPrisma.consultationSession.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);

    await SERVICE.listSessions(ADMIN_USER, { limit: 999 });

    const takeArg = mockPrisma.consultationSession.findMany.mock.calls[0][0].take;
    expect(takeArg).toBe(50);
  });
});
