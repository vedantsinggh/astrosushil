// apps/admin/lib/live-session-context.tsx
// Phase 4 – Production-Hardened Live Session Context

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { apiFetch } from './api-client';

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface ClientInfo {
  id: string;
  name: string;
  email: string;
  hasPhone?: boolean;
}

export interface BirthProfileInfo {
  id: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  location: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type ObservationTag = 'IMPORTANT' | 'FOLLOW_UP' | 'DISCUSSED' | 'REPORT_NEEDED';

export interface ConsultationSession {
  id: string;
  adminId: string;
  adminEmail: string;
  userId: string;
  birthProfileId: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationNote {
  id: string;
  sessionId: string;
  adminId: string;
  content: string;
  section: string | null;
  subject: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionObservation {
  id: string;
  sessionId: string;
  adminId: string;
  tag: ObservationTag;
  note: string | null;
  section: string | null;
  createdAt: string;
}

export interface ReportInfo {
  id: string;
  reportType: string;
  status: string;
  progress: number;
  stage: string | null;
  hasDownload: boolean;
  fileName: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
}

export interface PreviousSession {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  astrologerEmail: string;
  notesCount: number;
  observationsCount: number;
}

export interface OtherProfile {
  id: string;
  name: string;
  dateOfBirth: string;
}

export interface RecentSection {
  key: string;
  label: string;
  visitedAt: number;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface NoteDraft {
  content: string;
  subject?: string;
  section?: string;
  savedAt: number;
}

// -------------------------------------------------------
// Context Value
// -------------------------------------------------------

export interface LiveSessionContextValue {
  // Session data
  session: ConsultationSession | null;
  client: ClientInfo | null;
  birthProfile: BirthProfileInfo | null;
  notes: ConsultationNote[];
  observations: SessionObservation[];
  reports: ReportInfo[];
  previousSessions: PreviousSession[];
  otherProfiles: OtherProfile[];
  loading: boolean;
  error: string | null;
  isAuthExpired: boolean;
  refresh: () => Promise<void>;

  // Timer
  elapsedSeconds: number;

  // Notes management
  saveState: SaveState;
  saveNote: (noteId: string | null, data: { content: string; section?: string; subject?: string }) => Promise<ConsultationNote | null>;
  deleteNote: (noteId: string) => Promise<void>;

  // Draft safety
  draftNote: NoteDraft | null;
  saveDraftNote: (draft: { content: string; subject?: string; section?: string }) => void;
  clearDraftNote: () => void;

  // Observations
  addObservation: (tag: ObservationTag, noteTxt?: string, section?: string) => Promise<void>;
  removeObservation: (observationId: string) => Promise<void>;

  // Navigation tracking
  recentSections: RecentSection[];
  recordSectionVisit: (key: string, label: string) => void;
  activeSection: string;
  setActiveSection: (key: string) => void;

  // Unsaved changes protection
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (val: boolean) => void;

  // Session end
  endSession: () => Promise<{ durationSeconds: number; notesCount: number; observationsCount: number } | null>;
}

// -------------------------------------------------------
// Context
// -------------------------------------------------------

const LiveSessionContext = createContext<LiveSessionContextValue | undefined>(undefined);

// -------------------------------------------------------
// Provider
// -------------------------------------------------------

interface LiveSessionProviderProps {
  children: ReactNode;
  sessionId: string;
}

export function LiveSessionProvider({ children, sessionId }: LiveSessionProviderProps) {
  const [session, setSession] = useState<ConsultationSession | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [birthProfile, setBirthProfile] = useState<BirthProfileInfo | null>(null);
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [observations, setObservations] = useState<SessionObservation[]>([]);
  const [reports, setReports] = useState<ReportInfo[]>([]);
  const [previousSessions, setPreviousSessions] = useState<PreviousSession[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<OtherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthExpired, setIsAuthExpired] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [recentSections, setRecentSections] = useState<RecentSection[]>([]);
  const [activeSection, setActiveSection] = useState('birth-chart');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftNote, setDraftNote] = useState<NoteDraft | null>(null);

  // Timer: store start time in sessionStorage so it survives remounts
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeKey = `consultation_start_${sessionId}`;
  const draftKey = `astrosushil_note_draft_${sessionId}`;

  // Restore draft note on mount if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(draftKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setDraftNote(parsed);
          setHasUnsavedChanges(true);
        }
      } catch {
        // Ignore JSON parse errors for drafts
      }
    }
  }, [draftKey]);

  // -------------------------------------------------------
  // Fetch session data with client isolation
  // -------------------------------------------------------

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsAuthExpired(false);
    try {
      const data = await apiFetch<any>(`/api/v1/admin/live-sessions/${sessionId}`);
      setSession(data.session);
      setClient(data.client);
      setBirthProfile(data.birthProfile);
      setNotes(data.notes || []);
      setObservations(data.observations || []);
      setReports(data.reports || []);
      setPreviousSessions(data.previousSessions || []);
      setOtherProfiles(data.otherProfiles || []);
    } catch (err: any) {
      if (err?.status === 401) {
        setIsAuthExpired(true);
        setError('Your authentication session has expired. Please re-login to continue.');
      } else {
        setError(err?.message || 'Failed to load consultation session');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // Reset state on session change to guarantee isolation
    setSession(null);
    setClient(null);
    setBirthProfile(null);
    setNotes([]);
    setObservations([]);
    setReports([]);
    setPreviousSessions([]);
    setOtherProfiles([]);
    setRecentSections([]);
    setActiveSection('birth-chart');

    fetchSession();
  }, [sessionId, fetchSession]);

  // -------------------------------------------------------
  // Timer: survives component remounts via sessionStorage
  // -------------------------------------------------------

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!sessionStorage.getItem(startTimeKey)) {
        sessionStorage.setItem(startTimeKey, Date.now().toString());
      }
    }

    const tick = () => {
      if (typeof window === 'undefined') return;
      const stored = sessionStorage.getItem(startTimeKey);
      if (stored) {
        const diff = Math.floor((Date.now() - parseInt(stored, 10)) / 1000);
        setElapsedSeconds(diff);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimeKey]);

  // Stop timer when session ends
  useEffect(() => {
    if (session?.status !== 'ACTIVE' && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [session?.status]);

  // -------------------------------------------------------
  // Draft management & safety
  // -------------------------------------------------------

  const saveDraftNote = useCallback((draft: { content: string; subject?: string; section?: string }) => {
    const payload: NoteDraft = { ...draft, savedAt: Date.now() };
    setDraftNote(payload);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(draftKey, JSON.stringify(payload));
    }
    setHasUnsavedChanges(true);
  }, [draftKey]);

  const clearDraftNote = useCallback(() => {
    setDraftNote(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(draftKey);
    }
    setHasUnsavedChanges(false);
  }, [draftKey]);

  // -------------------------------------------------------
  // Notes management
  // -------------------------------------------------------

  const saveNote = useCallback(
    async (
      noteId: string | null,
      data: { content: string; section?: string; subject?: string }
    ): Promise<ConsultationNote | null> => {
      setSaveState('saving');
      try {
        let result: { note: ConsultationNote };
        if (noteId) {
          result = await apiFetch<any>(`/api/v1/admin/live-sessions/${sessionId}/notes/${noteId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
          setNotes((prev) => prev.map((n) => (n.id === noteId ? result.note : n)));
        } else {
          result = await apiFetch<any>(`/api/v1/admin/live-sessions/${sessionId}/notes`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          setNotes((prev) => [...prev, result.note]);
        }
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
        clearDraftNote();
        return result.note;
      } catch (err: any) {
        setSaveState('error');
        if (err?.status === 401) {
          setIsAuthExpired(true);
          // Preserve draft in case of auth expiry
          saveDraftNote(data);
        }
        throw err;
      }
    },
    [sessionId, clearDraftNote, saveDraftNote]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      await apiFetch(`/api/v1/admin/live-sessions/${sessionId}/notes/${noteId}`, {
        method: 'DELETE',
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    },
    [sessionId]
  );

  // -------------------------------------------------------
  // Observations
  // -------------------------------------------------------

  const addObservation = useCallback(
    async (tag: ObservationTag, noteTxt?: string, section?: string) => {
      const result = await apiFetch<any>(
        `/api/v1/admin/live-sessions/${sessionId}/observations`,
        {
          method: 'POST',
          body: JSON.stringify({ tag, note: noteTxt, section }),
        }
      );
      setObservations((prev) => [...prev, result.observation]);
    },
    [sessionId]
  );

  const removeObservation = useCallback(
    async (observationId: string) => {
      await apiFetch(
        `/api/v1/admin/live-sessions/${sessionId}/observations/${observationId}`,
        { method: 'DELETE' }
      );
      setObservations((prev) => prev.filter((o) => o.id !== observationId));
    },
    [sessionId]
  );

  // -------------------------------------------------------
  // Navigation tracking
  // -------------------------------------------------------

  const recordSectionVisit = useCallback((key: string, label: string) => {
    setRecentSections((prev) => {
      const filtered = prev.filter((s) => s.key !== key);
      const updated = [{ key, label, visitedAt: Date.now() }, ...filtered].slice(0, 8);
      return updated;
    });
  }, []);

  // -------------------------------------------------------
  // Session end
  // -------------------------------------------------------

  const endSession = useCallback(async () => {
    try {
      const result = await apiFetch<any>(
        `/api/v1/admin/live-sessions/${sessionId}/end`,
        { method: 'PATCH' }
      );
      setSession(result.session);
      clearDraftNote();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(startTimeKey);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      return result.summary;
    } catch (err: any) {
      if (err?.status === 401) {
        setIsAuthExpired(true);
      }
      throw err;
    }
  }, [sessionId, startTimeKey, clearDraftNote]);

  const value: LiveSessionContextValue = {
    session,
    client,
    birthProfile,
    notes,
    observations,
    reports,
    previousSessions,
    otherProfiles,
    loading,
    error,
    isAuthExpired,
    refresh: fetchSession,
    elapsedSeconds,
    saveState,
    saveNote,
    deleteNote,
    draftNote,
    saveDraftNote,
    clearDraftNote,
    addObservation,
    removeObservation,
    recentSections,
    recordSectionVisit,
    activeSection,
    setActiveSection,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    endSession,
  };

  return <LiveSessionContext.Provider value={value}>{children}</LiveSessionContext.Provider>;
}

export function useLiveSession() {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) {
    throw new Error('useLiveSession must be used within LiveSessionProvider');
  }
  return ctx;
}
