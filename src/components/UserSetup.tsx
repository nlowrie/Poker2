import React, { useState } from 'react';
import { User, Plus, Users } from 'lucide-react';

interface UserSetupProps {
  onUserSetup: (user: { name: string; role: 'Moderator' | 'Team Member' }) => void;
}

export default function UserSetup({ onUserSetup }: UserSetupProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Moderator' | 'Team Member'>('Team Member');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onUserSetup({ name: name.trim(), role });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Planning Poker</h1>
            <p className="text-gray-600">Collaborative agile estimation tool</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-1 gap-3">
                <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  role === 'Moderator' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="Moderator"
                    checked={role === 'Moderator'}
                    onChange={(e) => setRole(e.target.value as 'Moderator')}
                    className="sr-only"
                  />
                  <User className={`w-5 h-5 mr-3 ${role === 'Moderator' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <div className={`font-medium ${role === 'Moderator' ? 'text-blue-900' : 'text-gray-900'}`}>
                      Moderator
                    </div>
                    <div className={`text-sm ${role === 'Moderator' ? 'text-blue-700' : 'text-gray-500'}`}>
                      Facilitate sessions and manage backlog items
                    </div>
                  </div>
                </label>

                <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  role === 'Team Member' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="Team Member"
                    checked={role === 'Team Member'}
                    onChange={(e) => setRole(e.target.value as 'Team Member')}
                    className="sr-only"
                  />
                  <Users className={`w-5 h-5 mr-3 ${role === 'Team Member' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <div className={`font-medium ${role === 'Team Member' ? 'text-blue-900' : 'text-gray-900'}`}>
                      Team Member
                    </div>
                    <div className={`text-sm ${role === 'Team Member' ? 'text-blue-700' : 'text-gray-500'}`}>
                      Vote on story points and participate
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Join Session
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}