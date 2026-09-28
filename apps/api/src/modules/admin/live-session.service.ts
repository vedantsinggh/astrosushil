// apps/api/src/modules/admin/live-session.service.ts
// Phase 3 – Live Session / Consultation Workspace Backend

import { prisma } from '../../services/prisma.service';
import { NotFoundError, AuthorizationError, ValidationError } from '../../errors/app-error';

type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
type ObservationTag = 'IMPORTANT' | 'FOLLOW_UP' | 'DISCUSSED' | 'REPORT_NEEDED';

const VALID_TAGS: ObservationTag[] = ['IMPORTANT', 'FOLLOW_UP', 'DISCUSSED', 'REPORT_NEEDED'];

export interface AdminUser {
  id: string;
  role: string;
  email?: string;
}

export class LiveSessionService {
  // ----------------------------------------------------------------
  // Session CRUD
  // ----------------------------------------------------------------

  /**
   * Create a new consultation session.
   * Only one ACTIVE session per admin+client combination is allowed at a time.
   */
  public async createSession(
    input: { userId: string; birthProfileId: string },
    adminUser: AdminUser
  ) {
    // Verify the client user exists
    const clientUser = await (prisma as any).user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, fullName: true },
    });
    if (!clientUser) {
      throw new NotFoundError(`Client user '${input.userId}' not found`);
    }

    // Verify birth profile exists and belongs to client
    const birthProfile = await (prisma as any).birthProfile.findUnique({
      where: { id: input.birthProfileId },
      select: { id: true, name: true, dateOfBirth: true, timeOfBirth: true, placeName: true, userId: true },
    });
    if (!birthProfile) {
      throw new NotFoundError(`Birth profile '${input.birthProfileId}' not found`);
    }
    if (birthProfile.userId !== input.userId) {
      throw new AuthorizationError('Birth profile does not belong to the specified client');
    }

    // Abandon any existing ACTIVE session for this admin+client
    await (prisma as any).consultationSession.updateMany({
      where: {
        adminId: adminUser.id,
        userId: input.userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'ABANDONED',
        endedAt: new Date(),
      },
    });

    const session = await (prisma as any).consultationSession.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        userId: input.userId,
        birthProfileId: input.birthProfileId,
        status: 'ACTIVE',
      },
    });

    return {
      session: this._formatSession(session),
      client: {
        id: clientUser.id,
        name: clientUser.fullName || clientUser.email,
        email: clientUser.email,
      },
      birthProfile: {
        id: birthProfile.id,
        name: birthProfile.name,
        dateOfBirth: birthProfile.dateOfBirth,
        timeOfBirth: birthProfile.timeOfBirth,
        location: birthProfile.placeName || 'Unknown location',
      },
    };
  }

  /**
   * Get session details including client/birth profile context.
   * Admin can only access their own sessions unless SUPER_ADMIN.
   */
  public async getSessionById(sessionId: string, adminUser: AdminUser) {
    const session = await (prisma as any).consultationSession.findUnique({
      where: { id: sessionId },
      include: {
        notes: { orderBy: { createdAt: 'asc' } },
        observations: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      throw new NotFoundError(`Consultation session '${sessionId}' not found`);
    }

    // Access control: only the session owner or SUPER_ADMIN can view
    if (session.adminId !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('You do not have access to this consultation session');
    }

    // Fetch client + birth profile
    const [clientUser, birthProfile] = await Promise.all([
      (prisma as any).user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, fullName: true, phoneNumber: true },
      }),
      (prisma as any).birthProfile.findUnique({
        where: { id: session.birthProfileId },
        select: { id: true, name: true, dateOfBirth: true, timeOfBirth: true, placeName: true, latitude: true, longitude: true, timezone: true },
      }),
    ]);

    // Fetch previous completed sessions for this client
    const previousSessions = await (prisma as any).consultationSession.findMany({
      where: {
        userId: session.userId,
        status: { in: ['COMPLETED', 'ABANDONED'] },
        NOT: { id: sessionId },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        adminEmail: true,
        _count: { select: { notes: true, observations: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    // Fetch reports for this birth profile
    const reports = await (prisma as any).report.findMany({
      where: { birthProfileId: session.birthProfileId },
      select: {
        id: true,
        reportType: true,
        status: true,
        progress: true,
        stage: true,
        s3Url: true,
        fileName: true,
        createdAt: true,
        completedAt: true,
        failedAt: true,
        errorCode: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Fetch other birth profiles for this client
    const otherProfiles = await (prisma as any).birthProfile.findMany({
      where: {
        userId: session.userId,
        NOT: { id: session.birthProfileId },
      },
      select: { id: true, name: true, dateOfBirth: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      session: this._formatSession(session),
      notes: session.notes.map(this._formatNote),
      observations: session.observations.map(this._formatObservation),
      client: clientUser
        ? {
            id: clientUser.id,
            name: clientUser.fullName || clientUser.email,
            email: clientUser.email,
            hasPhone: !!clientUser.phoneNumber,
          }
        : null,
      birthProfile: birthProfile
        ? {
            id: birthProfile.id,
            name: birthProfile.name,
            dateOfBirth: birthProfile.dateOfBirth,
            timeOfBirth: birthProfile.timeOfBirth,
            location: birthProfile.placeName || `${birthProfile.latitude?.toFixed(4)}, ${birthProfile.longitude?.toFixed(4)}`,
            timezone: birthProfile.timezone,
          }
        : null,
      otherProfiles: otherProfiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        dateOfBirth: p.dateOfBirth,
      })),
      previousSessions: previousSessions.map((s: any) => ({
        id: s.id,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        durationSeconds: s.durationSeconds,
        astrologerEmail: s.adminEmail,
        notesCount: s._count.notes,
        observationsCount: s._count.observations,
      })),
      reports: reports.map((r: any) => ({
        id: r.id,
        reportType: r.reportType,
        status: r.status,
        progress: r.progress,
        stage: r.stage,
        hasDownload: !!r.s3Url,
        fileName: r.fileName,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        failedAt: r.failedAt?.toISOString() ?? null,
        errorCode: r.errorCode,
      })),
    };
  }

  /**
   * List all sessions for the current admin, with optional filtering.
   */
  public async listSessions(
    adminUser: AdminUser,
    query: { status?: SessionStatus; userId?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      adminId: adminUser.role === 'SUPER_ADMIN' ? undefined : adminUser.id,
    };
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;

    // SUPER_ADMIN sees all sessions; other roles see only their own
    if (adminUser.role === 'SUPER_ADMIN') {
      delete where.adminId; // no filter by admin
    }

    const [total, sessions] = await Promise.all([
      (prisma as any).consultationSession.count({ where }),
      (prisma as any).consultationSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { notes: true, observations: true } },
        },
      }),
    ]);

    // Collect unique userIds to batch-fetch client names
    const userIds = [...new Set(sessions.map((s: any) => s.userId))];
    const users = await (prisma as any).user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    return {
      sessions: sessions.map((s: any) => {
        const client = userMap.get(s.userId) as any;
        return {
          ...this._formatSession(s),
          notesCount: s._count.notes,
          observationsCount: s._count.observations,
          clientName: client?.fullName || client?.email || s.userId,
          clientEmail: client?.email || null,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * End an active consultation session.
   */
  public async endSession(
    sessionId: string,
    adminUser: AdminUser,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const session = await (prisma as any).consultationSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { notes: true, observations: true } } },
    });

    if (!session) {
      throw new NotFoundError(`Session '${sessionId}' not found`);
    }
    if (session.adminId !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('You do not have permission to end this session');
    }
    if (session.status !== 'ACTIVE') {
      throw new ValidationError(`Session is already '${session.status}' — cannot end again`);
    }

    const endedAt = new Date();
    const durationSeconds = Math.round(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    const updated = await (prisma as any).consultationSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt,
        durationSeconds,
      },
    });

    return {
      session: this._formatSession(updated),
      summary: {
        durationSeconds,
        notesCount: session._count.notes,
        observationsCount: session._count.observations,
      },
    };
  }

  // ----------------------------------------------------------------
  // Notes
  // ----------------------------------------------------------------

  public async createNote(
    sessionId: string,
    input: { content: string; section?: string; subject?: string },
    adminUser: AdminUser
  ) {
    await this._requireActiveSession(sessionId, adminUser);

    if (!input.content || input.content.trim().length === 0) {
      throw new ValidationError('Note content cannot be empty');
    }
    if (input.content.length > 10000) {
      throw new ValidationError('Note content exceeds maximum length of 10,000 characters');
    }

    const note = await (prisma as any).consultationNote.create({
      data: {
        sessionId,
        adminId: adminUser.id,
        content: input.content.trim(),
        section: input.section ?? null,
        subject: input.subject?.trim() ?? null,
      },
    });

    return { note: this._formatNote(note) };
  }

  public async updateNote(
    sessionId: string,
    noteId: string,
    input: { content: string; section?: string; subject?: string },
    adminUser: AdminUser
  ) {
    const note = await (prisma as any).consultationNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.sessionId !== sessionId) {
      throw new NotFoundError(`Note '${noteId}' not found in session`);
    }
    if (note.adminId !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('You can only edit your own notes');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new ValidationError('Note content cannot be empty');
    }
    if (input.content.length > 10000) {
      throw new ValidationError('Note content exceeds maximum length of 10,000 characters');
    }

    const updated = await (prisma as any).consultationNote.update({
      where: { id: noteId },
      data: {
        content: input.content.trim(),
        section: input.section !== undefined ? input.section : note.section,
        subject: input.subject !== undefined ? input.subject?.trim() : note.subject,
        version: { increment: 1 },
      },
    });

    return { note: this._formatNote(updated) };
  }

  public async deleteNote(
    sessionId: string,
    noteId: string,
    adminUser: AdminUser
  ) {
    const note = await (prisma as any).consultationNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.sessionId !== sessionId) {
      throw new NotFoundError(`Note '${noteId}' not found in session`);
    }
    if (note.adminId !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('You can only delete your own notes');
    }

    await (prisma as any).consultationNote.delete({ where: { id: noteId } });
    return { message: 'Note deleted successfully' };
  }

  public async listNotes(sessionId: string, adminUser: AdminUser) {
    await this._requireSessionAccess(sessionId, adminUser);

    const notes = await (prisma as any).consultationNote.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return { notes: notes.map(this._formatNote) };
  }

  // ----------------------------------------------------------------
  // Observations
  // ----------------------------------------------------------------

  public async addObservation(
    sessionId: string,
    input: { tag: ObservationTag; note?: string; section?: string },
    adminUser: AdminUser
  ) {
    await this._requireActiveSession(sessionId, adminUser);

    if (!VALID_TAGS.includes(input.tag)) {
      throw new ValidationError(`Invalid observation tag. Must be one of: ${VALID_TAGS.join(', ')}`);
    }

    const obs = await (prisma as any).sessionObservation.create({
      data: {
        sessionId,
        adminId: adminUser.id,
        tag: input.tag,
        note: input.note?.trim() ?? null,
        section: input.section ?? null,
      },
    });

    return { observation: this._formatObservation(obs) };
  }

  public async removeObservation(
    sessionId: string,
    observationId: string,
    adminUser: AdminUser
  ) {
    const obs = await (prisma as any).sessionObservation.findUnique({
      where: { id: observationId },
    });

    if (!obs || obs.sessionId !== sessionId) {
      throw new NotFoundError(`Observation '${observationId}' not found`);
    }
    if (obs.adminId !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('You can only remove your own observations');
    }

    await (prisma as any).sessionObservation.delete({ where: { id: observationId } });
    return { message: 'Observation removed successfully' };
  }

  // ----------------------------------------------------------------
  // Session History for a client
  // ----------------------------------------------------------------

  public async getClientSessionHistory(userId: string, adminUser: AdminUser) {
    // Anyone with live_sessions:read can see client history
    const sessions = await (prisma as any).consultationSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        _count: { select: { notes: true, observations: true } },
      },
    });

    return {
      sessions: sessions.map((s: any) => ({
        ...this._formatSession(s),
        notesCount: s._count.notes,
        observationsCount: s._count.observations,
        astrologerEmail: s.adminEmail,
      })),
    };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private async _requireActiveSession(sessionId: string, adminUser: AdminUser) {
    const session = await (prisma as any).consultationSession.findUnique({
      where: { id: sessionId },
      select: { id: true, adminId: true, status: true },
    });
    if (!session) {
      throw new NotFoundError(`Session '${sessionId}' not found`);
    }
    if (session.adminId !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('You do not have access to this session');
    }
    if (session.status !== 'ACTIVE') {
      throw new ValidationError('This session has ended and is now read-only');
    }
  }

  private async _requireSessionAccess(sessionId: string, adminUser: AdminUser) {
    const session = await (prisma as any).consultationSession.findUnique({
      where: { id: sessionId },
      select: { id: true, adminId: true, status: true },
    });
    if (!session) {
      throw new NotFoundError(`Session '${sessionId}' not found`);
    }
    if (session.adminId !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('You do not have access to this session');
    }
  }

  private _formatSession(s: any) {
    return {
      id: s.id,
      adminId: s.adminId,
      adminEmail: s.adminEmail,
      userId: s.userId,
      birthProfileId: s.birthProfileId,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      durationSeconds: s.durationSeconds ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private _formatNote(n: any) {
    return {
      id: n.id,
      sessionId: n.sessionId,
      adminId: n.adminId,
      content: n.content,
      section: n.section ?? null,
      subject: n.subject ?? null,
      version: n.version,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  private _formatObservation(o: any) {
    return {
      id: o.id,
      sessionId: o.sessionId,
      adminId: o.adminId,
      tag: o.tag,
      note: o.note ?? null,
      section: o.section ?? null,
      createdAt: o.createdAt.toISOString(),
    };
  }
}

export const liveSessionService = new LiveSessionService();
