'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LiveSessionProvider } from '../../../lib/live-session-context';
import { ConsultationWorkspace } from './ConsultationWorkspace';

export default function LiveSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  if (!sessionId) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--badge-danger-text)' }}>Invalid session ID.</p>
      </div>
    );
  }

  return (
    <LiveSessionProvider sessionId={sessionId}>
      <ConsultationWorkspace />
    </LiveSessionProvider>
  );
}
