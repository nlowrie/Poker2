import { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { User, ArrowLeft, Users, Calendar, Vote } from 'lucide-react';

interface AuthPageProps {
  onBack?: () => void;
  redirectTo?: string;
  mode?: 'signin' | 'signup';
}

export default function AuthPage({ onBack, redirectTo, mode = 'signin' }: AuthPageProps) {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(mode);
  const [showTestUsers, setShowTestUsers] = useState(false);
  const createTestUser = async (email: string, role: 'Moderator' | 'Team Member') => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: 'testpassword123',
        options: {
          data: {
            role: role,
            full_name: role === 'Moderator' ? 'Test Moderator' : 'Test Team Member'
          }
        }
      });
      
      if (error) {
        console.error('Error creating test user:', error);
        alert(`Error: ${error.message}`);
      } else {
        alert(`Test user created: ${email}\nPassword: testpassword123\nRole: ${role}`);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    // User is authenticated, redirect will be handled by parent component
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex gap-8">
        {/* Features Section */}
        <div className="flex-1 hidden lg:flex flex-col justify-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Agile Planning Made Simple
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Streamline your team's story point estimation with our collaborative planning poker tool.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Team Collaboration</h3>
                <p className="text-gray-600">Invite team members to join planning sessions with shareable links</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Session Management</h3>
                <p className="text-gray-600">Create and manage multiple planning sessions with backlog items</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Vote className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real-time Voting</h3>
                <p className="text-gray-600">Vote on story points using Fibonacci or T-shirt sizing methods</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          <div className="text-center mb-6">
            <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Planning Poker
            </h1>
            <p className="text-lg text-gray-700 mb-4">
              Collaborative Story Point Estimation
            </p>
            <p className="text-gray-600 text-sm">
              {authMode === 'signin' 
                ? 'Sign in to access your planning sessions and collaborate with your team' 
                : 'Create your account to join planning sessions and estimate story points together'
              }
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                  }
                }
              }
            }}
            providers={[]}
            redirectTo={redirectTo || window.location.origin}
            view={authMode === 'signin' ? 'sign_in' : 'sign_up'}
            showLinks={false}
          />

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {authMode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Development/Testing Section */}
          <div className="mt-8">
            <button
              onClick={() => setShowTestUsers(!showTestUsers)}
              className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition-colors duration-200 mb-4"
            >
              {showTestUsers ? 'Hide' : 'Show'} Test User Options
            </button>

            {showTestUsers && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                <div>
                  <p className="text-sm text-blue-800 mb-2 font-medium">
                    Quick Sign In (if users exist)
                  </p>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => supabase.auth.signInWithPassword({
                        email: 'testmod@example.com',
                        password: 'testpassword123'
                      })}
                      className="flex-1 bg-green-600 text-white rounded-lg py-2 hover:bg-green-700 transition-colors duration-200 text-sm"
                    >
                      Sign In as Moderator
                    </button>
                    <button
                      onClick={() => supabase.auth.signInWithPassword({
                        email: 'testuser@example.com',
                        password: 'testpassword123'
                      })}
                      className="flex-1 bg-purple-600 text-white rounded-lg py-2 hover:bg-purple-700 transition-colors duration-200 text-sm"
                    >
                      Sign In as Team Member
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-blue-800 mb-2 font-medium">
                    Create New Test Users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => createTestUser('testmod@example.com', 'Moderator')}
                      className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition-colors duration-200 text-sm"
                    >
                      Create Test Moderator
                    </button>
                    <button
                      onClick={() => createTestUser('testuser@example.com', 'Team Member')}
                      className="flex-1 bg-orange-600 text-white rounded-lg py-2 hover:bg-orange-700 transition-colors duration-200 text-sm"
                    >
                      Create Test Team Member
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                  <strong>Tip:</strong> Use different browsers or incognito mode to test both users simultaneously.
                  <br />
                  <strong>Credentials:</strong> testmod@example.com / testuser@example.com (password: testpassword123)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
