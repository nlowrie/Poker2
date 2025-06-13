import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActivePlanningSessions } from '../utils/planningSession';
import AuthPage from './AuthPage';
import VotingSession from './VotingSession';
import { BacklogItem } from '../types';

interface SessionJoinProps {
  sessionId: string;
  backlogItems: BacklogItem[];
  onUpdateBacklog: (items: BacklogItem[]) => void;
}

export default function SessionJoin({ sessionId, backlogItems, onUpdateBacklog }: SessionJoinProps) {
  const { user, loading } = useAuth();
  const [session, setSession] = useState<any | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessions = await getActivePlanningSessions();
        const targetSession = sessions.find(s => s.id === sessionId);
        
        if (targetSession) {
          setSession(targetSession);
        } else {
          setError('Session not found or no longer active');
        }
      } catch (err) {
        setError('Failed to load session');
        console.error('Error loading session:', err);
      } finally {
        setSessionLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-md w-full">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage 
        redirectTo={`${window.location.origin}/join/${sessionId}`}
        mode="signup"
      />
    );
  }

  if (!session) {
    return null;
  }

  // Create a user object from Supabase auth user
  const currentUser = {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Team Member',
    role: 'Team Member' as const
  };

  return (
    <VotingSession
      backlogItems={backlogItems}
      currentUser={currentUser}
      onUpdateBacklog={onUpdateBacklog}
      onBackToBacklog={() => window.location.href = '/'}
      sessionId={sessionId}
    />
  );
}
