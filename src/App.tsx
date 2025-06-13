import { useState, useEffect } from 'react';
import { User, BacklogItem } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import UserSetup from './components/UserSetup';
import PlanningDashboard from './components/PlanningDashboard';
import SessionJoin from './components/SessionJoin';
import AuthPage from './components/AuthPage';
import RoleSelection from './components/RoleSelection';
import DatabaseTest from './components/DatabaseTest';
import ChatDebugger from './components/ChatDebugger';
import DatabaseTestSimple from './components/DatabaseTestSimple';

type AppView = 'setup' | 'dashboard' | 'auth' | 'role-selection' | 'debug';

function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [sessionIdToJoin, setSessionIdToJoin] = useState<string | null>(null);
  const { user, loading } = useAuth();

  // Check for invitation links in URL
  useEffect(() => {
    const path = window.location.pathname;
    const joinMatch = path.match(/^\/join\/(.+)$/);
    const urlParams = new URLSearchParams(window.location.search);
    
    if (joinMatch) {
      setSessionIdToJoin(joinMatch[1]);
    } else if (urlParams.get('debug') === 'true') {
      setCurrentView('debug');
    }
  }, []);

  // Handle authentication state
  useEffect(() => {
    if (!loading) {
      if (sessionIdToJoin) {
        // If there's a session to join, handle authentication for that
        if (!user) {
          setCurrentView('auth');
        } else {
          // User is authenticated, they'll be handled by SessionJoin component
        }
      } else if (!user) {
        // Show auth page for sign in/sign up
        setCurrentView('auth');
      } else {
        // User is authenticated, check if they have a role
        if (!user.user_metadata?.role) {
          // User needs to select their role
          setCurrentView('role-selection');
        } else {
          // User has a role, show dashboard
          const authUser: User = {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: user.user_metadata?.role || 'Team Member'
          };
          setCurrentUser(authUser);
          setCurrentView('dashboard');
        }
      }
    }
  }, [user, loading, sessionIdToJoin]);

  const handleRoleSelection = (role: 'Moderator' | 'Team Member') => {
    if (user) {
      const authUser: User = {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: role
      };
      setCurrentUser(authUser);
      setCurrentView('dashboard');
    }
  };

  const handleUserSetup = (userData: { name: string; role: 'Moderator' | 'Team Member' }) => {
    const user: User = {
      id: Date.now().toString(),
      name: userData.name,
      role: userData.role
    };
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle session join flow
  if (sessionIdToJoin) {
    if (!user) {
      return <AuthPage mode="signup" />;
    } else {
      return (
        <SessionJoin
          sessionId={sessionIdToJoin}
          backlogItems={backlogItems}
          onUpdateBacklog={setBacklogItems}
        />
      );
    }
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'setup':
        return <UserSetup onUserSetup={handleUserSetup} />;
      case 'dashboard':
        return (
          <PlanningDashboard
            backlogItems={backlogItems}
            onBacklogUpdate={setBacklogItems}
            currentUser={currentUser!}
          />
        );
      case 'auth':
        return <AuthPage />;
      case 'role-selection':
        return <RoleSelection onRoleSelected={handleRoleSelection} />;
      case 'debug':
        if (window.location.search.includes('chat=true')) {
          return <ChatDebugger />;
        } else if (window.location.search.includes('simple=true')) {
          return <DatabaseTestSimple />;
        } else {
          return <DatabaseTest />;
        }
      default:
        return <UserSetup onUserSetup={handleUserSetup} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;