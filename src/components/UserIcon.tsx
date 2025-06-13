import { useState } from 'react';
import { LogOut, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserIconProps {
  className?: string;
}

export default function UserIcon({ className = '' }: UserIconProps) {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const userRole = user.user_metadata?.role || 'Team Member';
  const isModerator = userRole === 'Moderator';

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        {/* Avatar with initials */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          {getInitials(displayName)}
        </div>
        
        {/* User info */}
        <div className="text-left hidden sm:block">          <div className="flex items-center space-x-1">            <span className="text-sm font-medium text-gray-900">{displayName}</span>
            {isModerator && (
              <div title="Moderator">
                <Crown className="w-4 h-4 text-yellow-500" />
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500">{userRole}</span>
        </div>
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-2">
            {/* User info section */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">                  {getInitials(displayName)}
                </div>
                <div>                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-gray-900">{displayName}</span>
                    {isModerator && (
                      <div title="Moderator">
                        <Crown className="w-4 h-4 text-yellow-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{userRole}</span>
                  <span className="text-xs text-gray-400 block">{user.email}</span>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
