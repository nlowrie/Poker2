import React, { useState, useEffect } from 'react';
import { BacklogItem, User } from '../types';
import { Plus, FileText, AlertCircle, CheckCircle, Upload, Trash2, Edit3, Save, X, Calendar, Users, Play, Share } from 'lucide-react';
import { generateSampleBacklog } from '../utils/planningPoker';
import { getActivePlanningSessions, startPlanningSession, deletePlanningSession, addItemToSession, getSessionItems, createBacklogItem, getAllBacklogItems, updateBacklogItem, deleteBacklogItem, getAssignedItems, removeItemFromSession } from '../utils/planningSession';
import VotingSession from './VotingSession';
import SessionInvite from './SessionInvite';
import UserIcon from './UserIcon';

interface PlanningDashboardProps {
  backlogItems: BacklogItem[];
  onBacklogUpdate: (items: BacklogItem[]) => void;
  currentUser: User;
}

export default function PlanningDashboard({ backlogItems, onBacklogUpdate, currentUser }: PlanningDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [draggedItem, setDraggedItem] = useState<BacklogItem | null>(null);
  const [previewSession, setPreviewSession] = useState<any | null>(null);
  const [sessionItems, setSessionItems] = useState<BacklogItem[]>([]);
  const [assignedItemIds, setAssignedItemIds] = useState<string[]>([]);
  const [sessionsWithItems, setSessionsWithItems] = useState<{[key: string]: BacklogItem[]}>({});
  const [inviteSession, setInviteSession] = useState<any | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [newItem, setNewItem] = useState<{
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    acceptanceCriteria: string;
  }>({
    title: '',
    description: '',
    priority: 'Medium',
    acceptanceCriteria: ''
  });

  useEffect(() => {
    loadSessions();
    loadBacklogItems();
    loadAssignedItems();
  }, []);

  const loadSessions = async () => {
    try {
      const activeSessions = await getActivePlanningSessions();
      setSessions(activeSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadBacklogItems = async () => {
    try {
      const items = await getAllBacklogItems();
      // Convert database format to component format
      const formattedItems = items.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: item.status,
        storyPoints: item.story_points,
        estimationType: item.estimation_type,
        acceptanceCriteria: item.acceptance_criteria || []
      }));
      onBacklogUpdate(formattedItems);
    } catch (error) {
      console.error('Error loading backlog items:', error);
    }
  };

  const loadAssignedItems = async () => {
    try {
      const assignedIds = await getAssignedItems();
      setAssignedItemIds(assignedIds);
    } catch (error) {
      console.error('Error loading assigned items:', error);
    }
  };

  const loadSessionsWithItems = async () => {
    try {
      const sessionsData: {[key: string]: BacklogItem[]} = {};
      for (const session of sessions) {
        const items = await getSessionItems(session.id);
        const sessionBacklogItems = items
          .filter((item: any) => item.backlog_items)
          .map((item: any) => ({
            id: item.backlog_items.id,
            title: item.backlog_items.title,
            description: item.backlog_items.description,
            priority: item.backlog_items.priority,
            status: item.backlog_items.status,
            storyPoints: item.backlog_items.story_points,
            estimationType: item.backlog_items.estimation_type,
            acceptanceCriteria: item.backlog_items.acceptance_criteria || []
          }));
        sessionsData[session.id] = sessionBacklogItems;
      }
      setSessionsWithItems(sessionsData);
    } catch (error) {
      console.error('Error loading sessions with items:', error);
    }
  };

  useEffect(() => {
    if (sessions.length > 0) {
      loadSessionsWithItems();
    }
  }, [sessions, assignedItemIds]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dbItem = await createBacklogItem({
        title: newItem.title,
        description: newItem.description,
        priority: newItem.priority,
        acceptanceCriteria: newItem.acceptanceCriteria.split('\n').filter(c => c.trim())
      });
      
      const formattedItem = {
        id: dbItem.id,
        title: dbItem.title,
        description: dbItem.description,
        priority: dbItem.priority,
        status: dbItem.status,
        acceptanceCriteria: dbItem.acceptance_criteria || []
      };
      
      onBacklogUpdate([...backlogItems, formattedItem]);
      setNewItem({ title: '', description: '', priority: 'Medium', acceptanceCriteria: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleEditItem = (item: BacklogItem) => {
    setEditingItem(item.id);
    setNewItem({
      title: item.title,
      description: item.description,
      priority: item.priority,
      acceptanceCriteria: item.acceptanceCriteria?.join('\n') || ''
    });
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBacklogItem(editingItem!, {
        title: newItem.title,
        description: newItem.description,
        priority: newItem.priority,
        acceptance_criteria: newItem.acceptanceCriteria.split('\n').filter(c => c.trim())
      });
      
      const updatedItems = backlogItems.map(item => 
        item.id === editingItem 
          ? {
              ...item,
              title: newItem.title,
              description: newItem.description,
              priority: newItem.priority,
              acceptanceCriteria: newItem.acceptanceCriteria.split('\n').filter(c => c.trim())
            }
          : item
      );
      onBacklogUpdate(updatedItems);
      setEditingItem(null);
      setNewItem({ title: '', description: '', priority: 'Medium', acceptanceCriteria: '' });
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteBacklogItem(id);
      onBacklogUpdate(backlogItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;
    try {
      const session = await startPlanningSession(sessionName, currentUser.id);
      setSessions([...sessions, session]);
      setSessionName('');
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deletePlanningSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleJoinSession = (session: any) => {
    setActiveSession(session);
  };
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: BacklogItem) => {
    console.log('Starting drag from backlog:', item.title);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, sessionId: string) => {
    e.preventDefault();
    if (draggedItem) {
      try {
        console.log('Dropping item:', draggedItem.title, 'to session:', sessionId);
        
        // First, remove item from any existing session
        for (const [existingSessionId, items] of Object.entries(sessionsWithItems)) {
          if (items.some(item => item.id === draggedItem.id)) {
            await removeItemFromSession(existingSessionId, draggedItem.id);
            console.log(`Removed item ${draggedItem.title} from session ${existingSessionId}`);
            break;
          }
        }
        
        // Then add to the new session
        const result = await addItemToSession(sessionId, draggedItem.id);
        console.log('Item added to session:', result);
        
        if (result.message === 'Item already in session') {
          console.log(`"${draggedItem.title}" is already in this session.`);
        } else {
          console.log(`Successfully moved "${draggedItem.title}" to session!`);
        }        
        setDraggedItem(null);
        // Refresh assigned items and sessions
        await refreshAllData();
        console.log(`Successfully moved "${draggedItem.title}" to session!`);
      } catch (error: any) {
        console.error('Error moving item to session:', error);
        setDraggedItem(null);
      }
    }
  };
  const handleDropToBacklog = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedItem) {
      try {
        console.log('Dropping item back to backlog:', draggedItem.title);
        
        // Find which session this item belongs to and remove it
        for (const [sessionId, items] of Object.entries(sessionsWithItems)) {
          if (items.some(item => item.id === draggedItem.id)) {
            await removeItemFromSession(sessionId, draggedItem.id);
            console.log(`Removed item ${draggedItem.title} from session ${sessionId}`);
            break;
          }
        }
          setDraggedItem(null);
        // Refresh assigned items and sessions
        await refreshAllData();
        console.log(`Successfully returned "${draggedItem.title}" to backlog!`);
      } catch (error: any) {
        console.error('Error removing item from session:', error);
        setDraggedItem(null);
      }
    }
  };
  const handleSessionItemDragStart = (e: React.DragEvent<HTMLDivElement>, item: BacklogItem) => {
    console.log('Starting drag from session:', item.title);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePreviewSession = async (session: any) => {
    try {
      const items = await getSessionItems(session.id);
      console.log('Session items from DB:', items); // Debug log
      
      const sessionBacklogItems = items
        .filter((item: any) => item.backlog_items) // Filter out null backlog_items
        .map((item: any) => ({
          id: item.backlog_items.id,
          title: item.backlog_items.title,
          description: item.backlog_items.description,
          priority: item.backlog_items.priority,
          status: item.backlog_items.status,
          storyPoints: item.backlog_items.story_points,
          estimationType: item.backlog_items.estimation_type,
          acceptanceCriteria: item.backlog_items.acceptance_criteria || []
        }));
      
      console.log('Formatted session items:', sessionBacklogItems); // Debug log
      setSessionItems(sessionBacklogItems);
      setPreviewSession(session);
    } catch (error) {
      console.error('Error loading session items:', error);
    }
  };

  const loadSampleData = async () => {
    try {
      const sampleItems = generateSampleBacklog();
      const createdItems = [];
      
      for (const item of sampleItems) {
        const dbItem = await createBacklogItem({
          title: item.title,
          description: item.description,
          priority: item.priority,
          acceptanceCriteria: item.acceptanceCriteria || []
        });
        
        createdItems.push({
          id: dbItem.id,
          title: dbItem.title,
          description: dbItem.description,
          priority: dbItem.priority,
          status: dbItem.status,
          acceptanceCriteria: dbItem.acceptance_criteria || []
        });
      }
      
      onBacklogUpdate([...backlogItems, ...createdItems]);
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  if (activeSession) {
    return (
      <VotingSession
        backlogItems={backlogItems}
        currentUser={currentUser}
        onUpdateBacklog={onBacklogUpdate}
        onBackToBacklog={() => setActiveSession(null)}
        sessionId={activeSession.id}
      />
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'Estimated': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Skipped': return <X className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Force refresh of all data after any drag/drop operation
  const refreshAllData = async () => {
    await loadAssignedItems();
    await loadSessionsWithItems();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Planning Dashboard</h1>            <div className="flex items-center gap-4">
              <UserIcon />
              {currentUser.role === 'Moderator' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              )}
              <button
                onClick={loadSampleData}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Load Sample Data
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Product Backlog */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Product Backlog
              </h2>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                {backlogItems
                  .filter(item => !assignedItemIds.includes(item.id)) // Hide assigned items
                  .map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-move bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1">{item.title}</h3>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>                        {item.storyPoints && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {item.storyPoints} SP
                          </span>
                        )}
                        {currentUser.role === 'Moderator' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                    <div className="text-xs text-gray-500">
                      Status: {item.status}
                      {item.estimationType && ` • Type: ${item.estimationType}`}
                    </div>
                  </div>
                ))}
                
                {/* Drop zone for returning items to backlog */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDropToBacklog}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 bg-gray-50"
                >
                  Drop items here to return to backlog
                </div>
                
                {backlogItems.filter(item => !assignedItemIds.includes(item.id)).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No unassigned backlog items. All items are assigned to sessions or add new items.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Planning Sessions */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Planning Sessions              </h2>

              {/* Create Session Form */}
              {currentUser.role === 'Moderator' && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Create New Session</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Session name"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleCreateSession}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}              {/* Active Sessions */}
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 bg-gradient-to-r from-green-50 to-blue-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{session.name}</h3>                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInviteSession(session)}
                          className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-1"
                        >
                          <Share className="w-3 h-3" />
                          Invite
                        </button>
                        <button
                          onClick={() => handlePreviewSession(session)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleJoinSession(session)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Join                        </button>
                        {currentUser.role === 'Moderator' && (
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors duration-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <Users className="w-3 h-3" />
                      Started by: {session.started_by}
                    </div>

                    {/* Session Items Table */}
                    {sessionsWithItems[session.id] && sessionsWithItems[session.id].length > 0 ? (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Items ({sessionsWithItems[session.id].length})</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {sessionsWithItems[session.id].map((item) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => handleSessionItemDragStart(e, item)}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 cursor-move text-sm"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-medium text-gray-900">{item.title}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                              </div>
                              {item.storyPoints && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                  {item.storyPoints} SP
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Items (0)</h4>
                      </div>
                    )}

                    {/* Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, session.id)}
                      className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      Drop backlog items here to assign to session
                    </div>
                  </div>
                ))}
                
                {sessions.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active planning sessions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Session Invite Modal */}
        {inviteSession && (
          <SessionInvite
            sessionId={inviteSession.id}
            sessionName={inviteSession.name}
            onClose={() => setInviteSession(null)}
          />
        )}

        {/* Session Preview Modal */}
        {previewSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Session: {previewSession.name}</h2>
                  <button
                    onClick={() => {
                      setPreviewSession(null);
                      setSessionItems([]);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">Started by: {previewSession.started_by}</p>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                <h3 className="font-semibold text-gray-900 mb-4">Backlog Items in This Session</h3>
                {sessionItems.length > 0 ? (
                  <div className="space-y-3">
                    {sessionItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{item.title}</h4>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                            {item.storyPoints && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                {item.storyPoints} SP
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No backlog items added to this session yet.</p>
                    <p className="text-sm mt-1">Drag and drop items from the backlog to add them.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setPreviewSession(null);
                      setSessionItems([]);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleJoinSession(previewSession);
                      setPreviewSession(null);
                      setSessionItems([]);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Join Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {(showAddForm || editingItem) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingItem ? 'Edit Backlog Item' : 'Add New Backlog Item'}
              </h2>
              <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({...newItem, priority: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Criteria (one per line)</label>
                  <textarea
                    value={newItem.acceptanceCriteria}
                    onChange={(e) => setNewItem({...newItem, acceptanceCriteria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter each criterion on a new line"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingItem ? 'Update' : 'Add'} Item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingItem(null);
                      setNewItem({ title: '', description: '', priority: 'Medium', acceptanceCriteria: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Development Panel */}
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowDevPanel(!showDevPanel)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            {showDevPanel ? 'Hide' : 'Dev'} Panel
          </button>
          
          {showDevPanel && (
            <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80">
              <h3 className="font-semibold text-gray-900 mb-3">Development Panel</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <strong>Current User:</strong> {currentUser.name}
                  <br />
                  <strong>Role:</strong> {currentUser.role}
                  <br />
                  <strong>ID:</strong> {currentUser.id}
                </div>
                
                <div className="bg-blue-50 p-2 rounded">
                  <strong>Testing Tips:</strong>
                  <ul className="text-xs mt-1 space-y-1">
                    <li>• Use different browsers for multiple users</li>
                    <li>• Share invite links via copy/paste</li>
                    <li>• Check TESTING_GUIDE.md for details</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-2 rounded">
                  <strong>Quick Actions:</strong>
                  <div className="mt-1 space-y-1">
                    <button
                      onClick={() => {
                        const url = window.location.origin;
                        navigator.clipboard.writeText(url);
                        alert('App URL copied to clipboard!');
                      }}
                      className="w-full bg-green-600 text-white text-xs py-1 rounded hover:bg-green-700"
                    >
                      Copy App URL
                    </button>
                    {sessions.length > 0 && (
                      <button
                        onClick={() => {
                          const inviteUrl = `${window.location.origin}/join/${sessions[0].id}`;
                          navigator.clipboard.writeText(inviteUrl);
                          alert('Latest session invite link copied!');
                        }}
                        className="w-full bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700"
                      >
                        Copy Latest Session Link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
