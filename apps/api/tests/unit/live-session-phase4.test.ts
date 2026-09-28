import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  consultationSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  consultationNote: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  sessionObservation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  birthProfile: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  report: {
    findMany: vi.fn(),
  },
  adminAuditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/services/prisma.service', () => ({
  prisma: mockPrisma,
}));

import { LiveSessionService } from '../../src/modules/admin/live-session.service';

describe('Phase 4 Live Session Hardening & Isolation Unit Tests', () => {
  let service: LiveSessionService;

  const mockAdminUser = { id: 'admin-uuid-1', email: 'astrologer@astrosushil.com', role: 'ADMIN' };
  const mockClientA = { id: 'client-uuid-a', fullName: 'Client A', email: 'clienta@test.com' };
  const mockClientB = { id: 'client-uuid-b', fullName: 'Client B', email: 'clientb@test.com' };

  const mockProfileA = {
    id: 'profile-uuid-a',
    userId: mockClientA.id,
    name: 'Client A Chart',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    location: 'New Delhi, India',
    timezone: 'Asia/Kolkata',
  };

  const mockSessionA = {
    id: 'session-uuid-a',
    adminId: mockAdminUser.id,
    adminEmail: mockAdminUser.email,
    userId: mockClientA.id,
    birthProfileId: mockProfileA.id,
    status: 'ACTIVE',
    startedAt: new Date('2026-09-24T10:00:00Z'),
    endedAt: null,
    durationSeconds: null,
    createdAt: new Date('2026-09-24T10:00:00Z'),
    updatedAt: new Date('2026-09-24T10:00:00Z'),
    user: mockClientA,
    birthProfile: mockProfileA,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LiveSessionService();
  });

  describe('1. Strict Client & Profile Isolation', () => {
    it('prevents creating session if birth profile belongs to a different client', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockClientB as any);
      mockPrisma.birthProfile.findUnique.mockResolvedValue(mockProfileA as any); // Profile belongs to Client A

      await expect(
        service.createSession({ userId: mockClientB.id, birthProfileId: mockProfileA.id }, mockAdminUser)
      ).rejects.toThrow(/does not belong to the specified client/);
    });

    it('returns only notes and observations belonging to the requested session', async () => {
      const mockSessionWithRelations = {
        ...mockSessionA,
        notes: [
          { id: 'note-1', sessionId: mockSessionA.id, adminId: mockAdminUser.id, content: 'Client A specific note', version: 1, createdAt: new Date(), updatedAt: new Date() },
        ],
        observations: [
          { id: 'obs-1', sessionId: mockSessionA.id, adminId: mockAdminUser.id, tag: 'IMPORTANT', createdAt: new Date() },
        ],
      };
      mockPrisma.consultationSession.findUnique.mockResolvedValue(mockSessionWithRelations as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockClientA as any);
      mockPrisma.birthProfile.findUnique.mockResolvedValue(mockProfileA as any);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.consultationSession.findMany.mockResolvedValue([]);
      mockPrisma.birthProfile.findMany.mockResolvedValue([]);

      const result = await service.getSessionById(mockSessionA.id, mockAdminUser);

      expect(result.session.id).toBe(mockSessionA.id);
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].content).toBe('Client A specific note');
    });
  });

  describe('2. Safe Error Handling & Non-Destructive Operations', () => {
    it('returns structured error when session does not exist', async () => {
      mockPrisma.consultationSession.findUnique.mockResolvedValue(null);

      await expect(service.getSessionById('non-existent-uuid', mockAdminUser)).rejects.toThrow(
        /not found/
      );
    });

    it('preserves read-only integrity when session is already COMPLETED', async () => {
      const completedSession = { ...mockSessionA, status: 'COMPLETED' };
      mockPrisma.consultationSession.findUnique.mockResolvedValue(completedSession as any);

      await expect(
        service.createNote(mockSessionA.id, { content: 'New note after end' }, mockAdminUser)
      ).rejects.toThrow(/This session has ended and is now read-only/);
    });
  });

  describe('3. Observation Tagging Integrity', () => {
    it('accepts all four standard observation tags: IMPORTANT, FOLLOW_UP, DISCUSSED, REPORT_NEEDED', async () => {
      mockPrisma.consultationSession.findUnique.mockResolvedValue(mockSessionA as any);
      mockPrisma.sessionObservation.create.mockImplementation(({ data }: any) => ({
        id: 'obs-new',
        ...data,
        createdAt: new Date(),
      }));

      const tags = ['IMPORTANT', 'FOLLOW_UP', 'DISCUSSED', 'REPORT_NEEDED'] as const;
      for (const tag of tags) {
        await service.addObservation(mockSessionA.id, { tag, note: `Testing ${tag}` }, mockAdminUser);
        expect(mockPrisma.sessionObservation.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ tag }),
          })
        );
      }
    });
  });

  describe('4. Session Duration Calculation Accuracy', () => {
    it('calculates duration correctly in seconds when ending session', async () => {
      const startedAt = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
      const activeSession = { ...mockSessionA, startedAt, _count: { notes: 3, observations: 2 } };

      mockPrisma.consultationSession.findUnique.mockResolvedValue(activeSession as any);
      mockPrisma.consultationSession.update.mockImplementation(({ data }: any) => ({
        ...activeSession,
        ...data,
        endedAt: new Date(),
        durationSeconds: 2700,
      }));

      const result = await service.endSession(mockSessionA.id, mockAdminUser);

      expect(result.session.status).toBe('COMPLETED');
      expect(result.summary.durationSeconds).toBeGreaterThanOrEqual(2690);
      expect(result.summary.durationSeconds).toBeLessThanOrEqual(2710);
      expect(result.summary.notesCount).toBe(3);
      expect(result.summary.observationsCount).toBe(2);
    });
  });
});
