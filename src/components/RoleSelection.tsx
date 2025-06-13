import { useState } from 'react';
import { User, Users, Crown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

interface RoleSelectionProps {
  onRoleSelected: (role: 'Moderator' | 'Team Member') => void;
}

export default function RoleSelection({ onRoleSelected }: RoleSelectionProps) {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'Moderator' | 'Team Member'>('Team Member');
  const [loading, setLoading] = useState(false);

  const handleRoleSelection = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update user metadata with selected role
      const { error } = await supabase.auth.updateUser({
        data: { role: selectedRole }
      });
      
      if (error) throw error;
      
      // Also update the user_profiles table if it exists
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          role: selectedRole
        });
      
      onRoleSelected(selectedRole);
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Role</h1>
            <p className="text-gray-600">Select how you'll participate in planning sessions</p>
          </div>

          <div className="space-y-4 mb-8">
            <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
              selectedRole === 'Moderator' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="role"
                value="Moderator"
                checked={selectedRole === 'Moderator'}
                onChange={(e) => setSelectedRole(e.target.value as 'Moderator')}
                className="sr-only"
              />
              <User className={`w-5 h-5 mr-3 ${selectedRole === 'Moderator' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className={`font-medium ${selectedRole === 'Moderator' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Moderator
                </div>
                <div className={`text-sm ${selectedRole === 'Moderator' ? 'text-blue-700' : 'text-gray-500'}`}>
                  Create sessions, manage backlog, facilitate voting
                </div>
              </div>
              {selectedRole === 'Moderator' && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </label>

            <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
              selectedRole === 'Team Member' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="role"
                value="Team Member"
                checked={selectedRole === 'Team Member'}
                onChange={(e) => setSelectedRole(e.target.value as 'Team Member')}
                className="sr-only"
              />
              <Users className={`w-5 h-5 mr-3 ${selectedRole === 'Team Member' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className={`font-medium ${selectedRole === 'Team Member' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Team Member
                </div>
                <div className={`text-sm ${selectedRole === 'Team Member' ? 'text-blue-700' : 'text-gray-500'}`}>
                  Participate in voting and estimation sessions
                </div>
              </div>
              {selectedRole === 'Team Member' && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </label>
          </div>

          <button
            onClick={handleRoleSelection}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Setting up...
              </div>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
