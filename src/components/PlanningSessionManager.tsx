import React, { useState, useEffect } from 'react';
import { getActivePlanningSessions, startPlanningSession, deletePlanningSession, addItemToSession } from '../utils/planningSession';
import VotingSession from './VotingSession';
import { User, BacklogItem } from '../types';
import { Plus, X, Play } from 'lucide-react';

interface PlanningSessionManagerProps {
  currentUser: User;
  backlogItems: BacklogItem[];
  onUpdateBacklog: (items: BacklogItem[]) => void;
}

const PlanningSessionManager: React.FC<PlanningSessionManagerProps> = ({
  currentUser,
  backlogItems,
  onUpdateBacklog,
}) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    getActivePlanningSessions().then(setSessions);
  }, []);

  const handleStartSession = async () => {
    if (!sessionName.trim() || selectedItems.length === 0) return;
    
    setIsCreating(true);
    try {
      // Create the session
      console.log('[handleStartSession] Creating session with:', {
        sessionName,
        userId: currentUser.id,
        userName: currentUser.name
      });
      const session = await startPlanningSession(sessionName, currentUser.id, currentUser.name);
      console.log('[handleStartSession] Session created:', session);
      // Add selected items to the session
      for (const itemId of selectedItems) {
        await addItemToSession(session.id, itemId);
      }
      
      setSessions([...sessions, session]);
      setSessionName('');
      setSelectedItems([]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = (session: any) => {
    setActiveSession(session);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deletePlanningSession(sessionId);
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const availableItems = backlogItems.filter(item => item.status === 'Pending');

  if (activeSession) {
    return (
      <VotingSession
        backlogItems={backlogItems}
        currentUser={currentUser}
        onUpdateBacklog={onUpdateBacklog}
        onBackToBacklog={() => setActiveSession(null)}
        sessionId={activeSession.id}
      />
    );
  }  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Planning Sessions</h1>
        
        {/* Create Session Section */}
        {currentUser.role === 'Moderator' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Session</h2>
            
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Session
              </button>
            ) : (
              <div className="space-y-6">
                {/* Session Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter session name..."
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Backlog Items Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Backlog Items ({selectedItems.length} selected)
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                    {availableItems.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No pending backlog items available
                      </div>
                    ) : (
                      availableItems.map(item => (
                        <div
                          key={item.id}
                          className={`p-3 border-b border-gray-100 cursor-pointer transition-colors duration-200 ${
                            selectedItems.includes(item.id) 
                              ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleItemSelection(item.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                  item.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                  item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {item.priority}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={() => toggleItemSelection(item.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleStartSession}
                    disabled={!sessionName.trim() || selectedItems.length === 0 || isCreating}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {isCreating ? 'Creating...' : 'Create Session'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setSessionName('');
                      setSelectedItems([]);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Sessions */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Planning Sessions</h2>
          
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No active sessions</p>
              <p className="mt-1">
                {currentUser.role === 'Moderator' 
                  ? 'Create a new session to get started' 
                  : 'Wait for a moderator to create a session'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{session.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Created {new Date(session.started_at).toLocaleDateString()} at{' '}
                        {new Date(session.started_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJoinSession(session)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                      >
                        Join Session
                      </button>
                      {currentUser.role === 'Moderator' && (
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanningSessionManager;
