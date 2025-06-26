import React, { useState, useEffect, useRef } from 'react';
import { BacklogItem, User, SessionSummary } from '../types';
import { Plus, FileText, AlertCircle, CheckCircle, Upload, Trash2, Edit3, Save, X, Calendar, Users, Play, Share, StopCircle, Search, BarChart3, Clock, Target } from 'lucide-react';
import { generateSampleBacklog } from '../utils/planningPoker';
import { getActivePlanningSessions, startPlanningSession, deletePlanningSession, addItemToSession, getSessionItems, createBacklogItem, getAllBacklogItems, updateBacklogItem, deleteBacklogItem, getAssignedItems, removeItemFromSession, endPlanningSession, getCompletedPlanningSessions } from '../utils/planningSession';
import VotingSession from './VotingSession';
import SessionInvite from './SessionInvite';
import SessionSummaryModal from './SessionSummaryModal';
import UserIcon from './UserIcon';
import { supabase } from '../supabaseClient';

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
  const [sessionsWithItems, setSessionsWithItems] = useState<{[key: string]: BacklogItem[]}>({});  const [inviteSession, setInviteSession] = useState<any | null>(null);  const [showDevPanel, setShowDevPanel] = useState(false);
  const [endingSession, setEndingSession] = useState<string | null>(null);
  
  // Phase 2: Enhanced session management
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [selectedSessionSummary, setSelectedSessionSummary] = useState<SessionSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'participants' | 'stories'>('date');
  
  // Notification system state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    show: boolean;
  }>({ type: 'info', message: '', show: false });
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  // Ref to track current sessions for real-time callbacks
  const sessionsRef = useRef<any[]>([]);
  
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
  });  useEffect(() => {
    loadSessions();
    loadBacklogItems();
    loadAssignedItems();
    loadCompletedSessions();
  }, []);

  // Real-time subscriptions for dashboard updates
  useEffect(() => {
    console.log('🔄 Setting up dashboard real-time subscriptions');

    // Create channel for dashboard updates
    const dashboardChannel = supabase.channel('dashboard-updates')
      // Listen for backlog item changes (story points updates)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'backlog_items' 
        }, 
        (payload) => {
          console.log('📝 Backlog item updated:', payload);
          // Reload backlog items to get the latest data
          loadBacklogItems();
        }
      )      // Listen for new planning sessions
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'planning_sessions' 
        }, 
        async (payload) => {
          console.log('🆕 New planning session created:', payload);
          console.log('🔄 Current sessions before reload:', sessionsRef.current.length);
          
          // Add a delay to ensure the database transaction is committed
          setTimeout(async () => {
            try {
              await loadSessions();
              console.log('✅ Sessions reloaded after new session creation');
            } catch (error) {
              console.error('❌ Error reloading sessions:', error);
            }
          }, 500);
        }
      )// Listen for planning session updates (like status changes)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'planning_sessions' 
        }, 
        (payload) => {
          console.log('📋 Planning session updated:', payload);
          loadSessions();
        }
      )
      // Listen for planning session deletions
      .on('postgres_changes', 
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'planning_sessions' 
        }, 
        (payload) => {
          console.log('🗑️ Planning session deleted:', payload);
          loadSessions();
        }
      )      // Listen for session item assignments/removals
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'session_items' 
        }, 
        (payload) => {
          console.log('🔗 Session items changed:', payload);
          console.log('🔗 Event type:', payload.eventType);
          console.log('🔗 New record:', payload.new);
          console.log('🔗 Old record:', payload.old);
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ Item was added to a session');
          } else if (payload.eventType === 'DELETE') {
            console.log('➖ Item was removed from a session (back to backlog)');
          } else if (payload.eventType === 'UPDATE') {
            console.log('🔄 Session item was updated');
          }
          
          // Reload assigned items and session data
          console.log('🔄 Reloading assigned items due to session_items change...');
          loadAssignedItems();
          
          // Also reload backlog items to ensure filtering works correctly
          console.log('🔄 Reloading backlog items due to session_items change...');
          loadBacklogItems();
          
          // Use ref to avoid stale closure
          if (sessionsRef.current.length > 0) {
            console.log('🔄 Reloading sessions with items...');
            loadSessionsWithItems();
          }
          
          // Show a notification to participants about the change
          if (payload.eventType === 'INSERT') {
            console.log('📢 Item moved to session - should disappear from backlog');
          } else if (payload.eventType === 'DELETE') {
            console.log('📢 Item returned to backlog - should reappear in backlog');
          }
        }
      ).subscribe((status) => {
        console.log('📡 Dashboard subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to dashboard real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Dashboard subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Dashboard subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Dashboard subscription closed');
        }
      });// Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up dashboard subscriptions');
      dashboardChannel.unsubscribe();
    };
  }, []); // No dependencies needed since we use refs
  // Also refresh data when user returns to dashboard (e.g., from voting session)
  // And add periodic polling as fallback for real-time updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Dashboard became visible - refreshing data');
        loadBacklogItems();
        loadSessions();
        loadAssignedItems();
      }
    };    // Add frequent polling every 1 second to ensure data stays synchronized
    const pollInterval = setInterval(() => {
      console.log('🔄 Auto-refresh (1s) - updating all data');
      loadSessions();
      loadBacklogItems();
      loadAssignedItems(); // This is crucial for session item assignments
    }, 1000); // 1 second for immediate synchronization

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, []);
  const loadSessions = async () => {
    try {
      const activeSessions = await getActivePlanningSessions();
      console.log('🧵 Raw activeSessions from DB:', activeSessions);
      if (!activeSessions || activeSessions.length === 0) {
        console.warn('⚠️ No active sessions returned. Possible reasons:');
        console.warn('- Row Level Security (RLS) policy is blocking access');
        console.warn('- No sessions with is_active=true');
        console.warn('- Database error or misconfiguration');
      } else {
        // Optionally log each session's key fields
        activeSessions.forEach((s, i) => {
          console.log(`Session[${i}]:`, {
            id: s.id,
            name: s.name,
            is_active: s.is_active,
            status: s.status,
            started_by: s.started_by,
            started_at: s.started_at
          });
        });
      }
      setSessions(activeSessions);
      sessionsRef.current = activeSessions;
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
      console.log('📋 Loading assigned items...');
      const assignedIds = await getAssignedItems();
      console.log('📋 Assigned item IDs received:', assignedIds);
      setAssignedItemIds(assignedIds);
      console.log('📋 Assigned item IDs state updated');
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
        acceptanceCriteria: newItem.acceptanceCriteria.split('\n').filter(c => c.trim()),
        created_by: currentUser.id
      });
      console.log('createBacklogItem result:', dbItem); // Debug log
      if (!dbItem || !dbItem.id) {
        showNotification('error', 'Failed to add item to the product backlog.');
        return;
      }
      setNewItem({ title: '', description: '', priority: 'Medium', acceptanceCriteria: '' });
      showNotification('success', 'Backlog item added successfully!');
      await loadBacklogItems(); // Always reload from DB after insert
    } catch (error) {
      const message = (error instanceof Error) ? error.message : String(error);
      console.error('Error adding item:', error);
      showNotification('error', 'Error adding item: ' + message);
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

  // Helper functions for notifications and confirmations
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };
  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, show: false }));
      },
      onCancel: () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
      }
    });
  };

  // Phase 2: Load completed sessions
  const loadCompletedSessions = async () => {
    try {
      const completed = await getCompletedPlanningSessions();
      setCompletedSessions(completed || []);
    } catch (error) {
      console.error('Error loading completed sessions:', error);
    }
  };

  // Enhanced session summary viewer
  const viewSessionSummary = async (session: any) => {
    try {
      if (session.summary) {
        setSelectedSessionSummary(session.summary);
        setShowSummaryModal(true);
      } else {
        showNotification('info', 'Session summary not available');
      }
    } catch (error) {
      console.error('Error viewing session summary:', error);
      showNotification('error', 'Failed to load session summary');
    }
  };

  // Filter and sort functions
  const getFilteredSessions = (sessions: any[]) => {
    let filtered = sessions;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(session => 
        session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.started_by.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date filter
    if (filterDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date(now);
      
      switch (filterDateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.ended_at || session.started_at);
        return sessionDate >= filterDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.ended_at || b.started_at).getTime() - new Date(a.ended_at || a.started_at).getTime();
        case 'duration':
          const aDuration = a.summary?.duration || 0;
          const bDuration = b.summary?.duration || 0;
          return bDuration - aDuration;
        case 'participants':
          const aParticipants = a.summary?.participants?.length || 0;
          const bParticipants = b.summary?.participants?.length || 0;
          return bParticipants - aParticipants;
        case 'stories':
          const aStories = a.summary?.stories?.length || 0;
          const bStories = b.summary?.stories?.length || 0;
          return bStories - aStories;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;
    try {
      console.log('🚀 Creating new session:', sessionName);
      const session = await startPlanningSession(sessionName, currentUser.id, currentUser.name);
      console.log('✅ Session created successfully:', session);
      
      // Immediately update local state for the user who created the session
      const updatedSessions = [...sessions, session];
      setSessions(updatedSessions);
      sessionsRef.current = updatedSessions;
      setSessionName('');
      
      console.log('📊 Local sessions updated, count:', updatedSessions.length);
      
      // Force a refresh of all sessions to ensure consistency
      setTimeout(async () => {
        try {
          console.log('🔄 Force refreshing sessions after creation...');
          const refreshedSessions = await getActivePlanningSessions();
          setSessions(refreshedSessions);
          sessionsRef.current = refreshedSessions;
          console.log('✅ Sessions force-refreshed, count:', refreshedSessions.length);
        } catch (error) {
          console.error('❌ Error force-refreshing sessions:', error);
        }
      }, 1000); // Delay to ensure database commit
      
      // The real-time subscription should also trigger for other users
    } catch (error) {
      console.error('❌ Error creating session:', error);
    }
  };  const handleDeleteSession = async (sessionId: string) => {
    try {
      console.log('[DeleteSession] Attempting to delete session:', sessionId);
      await deletePlanningSession(sessionId);
      console.log('[DeleteSession] Successfully called deletePlanningSession');
      await loadSessions(); // Always reload from DB after deletion
      console.log('[DeleteSession] Sessions reloaded after deletion');
    } catch (error) {
      console.error('[DeleteSession] Error deleting session:', error);
    }
  };  const handleEndSession = async (sessionId: string) => {
    // Fetch session items to check for unestimated stories
    let unestimatedCount = 0;
    try {
      const items = await getSessionItems(sessionId);
      const sessionBacklogItems = items
        .filter((item: any) => item.backlog_items)
        .map((item: any) => ({
          id: item.backlog_items.id,
          title: item.backlog_items.title,
          storyPoints: item.backlog_items.story_points,
        }));
      unestimatedCount = sessionBacklogItems.filter(item => item.storyPoints === null || item.storyPoints === undefined || item.storyPoints === '' || item.storyPoints === 'Not estimated').length;
    } catch (e) {
      // If error, fallback to no warning
      unestimatedCount = 0;
    }
    let message = 'Are you sure you want to end this session? This will generate a summary and move it to completed sessions.';
    if (unestimatedCount > 0) {
      message += `\n\n⚠️ There are ${unestimatedCount} unestimated stories. These will be moved back to the backlog.`;
    }
    showConfirmDialog(
      'End Session',
      message,
      async () => {
        try {
          setEndingSession(sessionId);
          console.log('🔚 Ending session:', sessionId);
          
          const summary = await endPlanningSession(sessionId, currentUser.id);
          console.log('✅ Session ended successfully, summary:', summary);
          
          // Show success notification with basic summary info
          showNotification('success', 
            `Session ended successfully! Duration: ${Math.round(summary.duration)} minutes, ` +
            `Stories: ${summary.stories.length}, Participants: ${summary.participants.length}`
          );
            // Refresh sessions to remove the ended session from active list
          await loadSessions();
          await loadCompletedSessions();
          
        } catch (error) {
          console.error('❌ Failed to end session:', error);
          showNotification('error', 'Failed to end session. Please try again.');
        } finally {
          setEndingSession(null);
        }
      }
    );
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
      // Check if the dragged item exists in the current backlogItems
      const existsInBacklog = backlogItems.some(item => item.id === draggedItem.id);
      if (!existsInBacklog) {
        showNotification('error', `Cannot assign item: Backlog item with id ${draggedItem.id} is missing from the backlog. Please refresh or re-add the item.`);
        setDraggedItem(null);
        return;
      }
      try {
        console.log('🎯 Dropping item:', draggedItem.title, 'to session:', sessionId);
        // First, remove item from any existing session
        for (const [existingSessionId, items] of Object.entries(sessionsWithItems)) {
          if (items.some(item => item.id === draggedItem.id)) {
            console.log(`🗑️ Removing item ${draggedItem.title} from existing session ${existingSessionId}`);
            await removeItemFromSession(existingSessionId, draggedItem.id);
            console.log(`✅ Removed item ${draggedItem.title} from session ${existingSessionId}`);
            break;
          }
        }
        // Then add to the new session
        console.log(`➕ Adding item ${draggedItem.title} to session ${sessionId}`);
        const result = await addItemToSession(sessionId, draggedItem.id);
        console.log('📡 Item added to session - this should trigger real-time INSERT event:', result);
        if (result.message === 'Item already in session') {
          console.log(`"${draggedItem.title}" is already in this session.`);
        } else {
          console.log(`✅ Successfully moved "${draggedItem.title}" to session!`);
        }
        setDraggedItem(null);
        // Refresh assigned items and sessions
        console.log('🔄 Refreshing local data after item move...');
        await refreshAllData();
        console.log(`🎉 Successfully moved "${draggedItem.title}" to session!`);
      } catch (error: any) {
        console.error('❌ Error moving item to session:', error);
        setDraggedItem(null);
      }
    }
  };
  const handleDropToBacklog = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedItem) {      try {
        console.log('🔄 Dropping item back to backlog:', draggedItem.title);
        
        // Find which session this item belongs to and remove it
        for (const [sessionId, items] of Object.entries(sessionsWithItems)) {
          if (items.some(item => item.id === draggedItem.id)) {
            console.log(`🗑️ Removing item ${draggedItem.title} from session ${sessionId}`);
            await removeItemFromSession(sessionId, draggedItem.id);
            console.log(`✅ Successfully removed item ${draggedItem.title} from session ${sessionId}`);
            console.log('📡 This should trigger a real-time DELETE event for all participants');
            break;
          }
        }
          setDraggedItem(null);
        // Refresh assigned items and sessions
        console.log('🔄 Refreshing local data after item removal...');
        await refreshAllData();
        console.log(`🎉 Successfully returned "${draggedItem.title}" to backlog!`);
      } catch (error: any) {
        console.error('❌ Error removing item from session:', error);
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
          acceptanceCriteria: item.acceptanceCriteria || [],
          created_by: currentUser.id // Fix: add required field
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
      const message = (error instanceof Error) ? error.message : String(error);
      console.error('Error loading sample data:', error);
      showNotification('error', 'Error loading sample data: ' + message);
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
              </h2>                <div className="space-y-4 max-h-96 overflow-y-auto">
                {(() => {
                  const unassignedItems = backlogItems.filter(item => !assignedItemIds.includes(item.id));
                  console.log('🔍 Filtering backlog items:');
                  console.log('🔍 Total backlog items:', backlogItems.length);
                  console.log('🔍 Assigned item IDs:', assignedItemIds);
                  console.log('🔍 Unassigned items after filter:', unassignedItems.length);
                  return unassignedItems;
                })().map((item) => (
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
          </div>          {/* Planning Sessions with Tabs */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              {/* Header with Analytics Overview */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Planning Sessions
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    {sessions.length} Active
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {completedSessions.length} Completed
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'active'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" />
                    Active Sessions ({sessions.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'completed'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Completed Sessions ({completedSessions.length})
                  </div>
                </button>
              </div>

              {/* Active Sessions Tab */}
              {activeTab === 'active' && (
                <div>
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"                        />
                        <button
                          onClick={handleCreateSession}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Sessions List */}
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 bg-gradient-to-r from-green-50 to-blue-50"
                      >
                        <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                          <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
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
                              Join
                            </button>
                            {currentUser.role === 'Moderator' && (
                              <>
                                <button
                                  onClick={() => handleEndSession(session.id)}
                                  disabled={endingSession === session.id}
                                  className="bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {endingSession === session.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  ) : (
                                    <StopCircle className="w-3 h-3" />
                                  )}
                                  {endingSession === session.id ? 'Ending...' : 'End'}
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors duration-200"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 truncate max-w-xs w-full mt-2 text-center">{session.name}</h3>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                          <Users className="w-3 h-3" />
                          Started by: {session.started_by_name || session.started_by}
                        </div>

                        {/* Session Items */}
                        {sessionsWithItems[session.id] && sessionsWithItems[session.id].length > 0 ? (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Assigned Items ({sessionsWithItems[session.id].length})
                            </h4>
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
              )}

              {/* Completed Sessions Tab */}
              {activeTab === 'completed' && (
                <div>
                  {/* Search and Filter Controls */}
                  <div className="mb-4 space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search sessions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <select
                        value={filterDateRange}
                        onChange={(e) => setFilterDateRange(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="date">Sort by Date</option>
                        <option value="duration">Sort by Duration</option>
                        <option value="participants">Sort by Participants</option>
                        <option value="stories">Sort by Stories</option>
                      </select>
                    </div>
                  </div>

                  {/* Completed Sessions List */}
                  <div className="space-y-3">
                    {getFilteredSessions(completedSessions).map((session) => (
                      <div
                        key={session.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 bg-gradient-to-r from-gray-50 to-green-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{session.name}</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewSessionSummary(session)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1"
                            >
                              <BarChart3 className="w-3 h-3" />
                              View Summary
                            </button>
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Started by: {session.started_by_name || session.started_by}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Duration: {session.summary?.duration ? `${Math.round(session.summary.duration)}m` : 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Stories: {session.summary?.stories?.length || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Participants: {session.summary?.participants?.length || 0}
                          </div>
                        </div>

                        {session.summary && (
                          <div className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Session Summary</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                session.summary.consensusReached 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {session.summary.consensusReached ? 'Consensus Reached' : 'Partial Consensus'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {getFilteredSessions(completedSessions).length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {searchQuery || filterDateRange !== 'all' ? 'No sessions match your filters' : 'No completed sessions yet'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>        {/* Session Invite Modal */}
        {inviteSession && (
          <SessionInvite
            sessionId={inviteSession.id}
            sessionName={inviteSession.name}
            onClose={() => setInviteSession(null)}
          />
        )}

        {/* Enhanced Session Summary Modal */}
        {showSummaryModal && selectedSessionSummary && (
          <SessionSummaryModal
            summary={selectedSessionSummary}
            onClose={() => {
              setShowSummaryModal(false);
              setSelectedSessionSummary(null);
            }}
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
                <p className="text-sm text-gray-600 mt-1">Started by: {previewSession.started_by_name || previewSession.started_by}</p>
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
                </div>              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`rounded-lg p-4 shadow-lg border-l-4 max-w-md ${
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            'bg-blue-50 border-blue-500 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {notification.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={confirmDialog.onCancel}></div>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 relative z-10 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
