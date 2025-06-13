import { supabase } from '../supabaseClient';

// Start a new planning session (Product Manager)
export async function startPlanningSession(name: string, started_by: string) {
  const { data, error } = await supabase
    .from('planning_sessions')
    .insert([{ name, started_by, is_active: true }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Get all active planning sessions (for developers to join)
export async function getActivePlanningSessions() {
  const { data, error } = await supabase
    .from('planning_sessions')
    .select('*')
    .eq('is_active', true)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Submit an estimation for a backlog item in a session
export async function submitEstimation(session_id: string, backlog_item_id: string, user_id: string, value: string | number) {
  // First, try to get existing estimation
  const { data: existing, error: selectError } = await supabase
    .from('estimations')
    .select('id')
    .eq('session_id', session_id)
    .eq('backlog_item_id', backlog_item_id)
    .eq('user_id', user_id)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Error checking existing estimation:', selectError);
    // If the select fails, try to proceed with insert anyway
  }

  if (existing) {
    // Update existing estimation
    const { data, error } = await supabase
      .from('estimations')
      .update({ 
        value: value.toString(), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Insert new estimation with both backlog_item_id and issue_id for compatibility
    const { data, error } = await supabase
      .from('estimations')
      .insert([{ 
        session_id, 
        backlog_item_id, 
        issue_id: backlog_item_id, // Keep for backward compatibility
        user_id, 
        value: value.toString() 
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// Get all estimations for a specific backlog item in a session
export async function getEstimationsForItem(session_id: string, backlog_item_id: string) {
  try {
    // First try with user_profiles join
    const { data, error } = await supabase
      .from('estimations')
      .select(`
        *,
        user_profiles(full_name, role)
      `)
      .eq('session_id', session_id)
      .eq('backlog_item_id', backlog_item_id);
    
    if (error) {
      console.warn('User profiles join failed, using fallback:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.warn('Error fetching estimations with profiles, trying fallback:', error);
    
    // Fallback: try without user_profiles join
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('estimations')
        .select('*')
        .eq('session_id', session_id)
        .eq('backlog_item_id', backlog_item_id);
      
      if (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        throw fallbackError;
      }
      
      console.log('Using fallback data (without user profiles):', fallbackData);
      return fallbackData;
    } catch (fallbackError) {
      console.error('Both queries failed:', fallbackError);
      return [];
    }
  }
}

// Get user's vote for a specific backlog item
export async function getUserVote(session_id: string, backlog_item_id: string, user_id: string) {
  const { data, error } = await supabase
    .from('estimations')
    .select('*')
    .eq('session_id', session_id)
    .eq('backlog_item_id', backlog_item_id)
    .eq('user_id', user_id)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  return data;
}

// Get all estimations for a session (for session management)
export async function getEstimationsForSession(session_id: string) {
  try {
    const { data, error } = await supabase
      .from('estimations')
      .select(`
        *,
        backlog_items!inner(title),
        user_profiles!inner(full_name, role)
      `)
      .eq('session_id', session_id);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching session estimations with profiles:', error);
    
    // Fallback without joins
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('estimations')
        .select('*')
        .eq('session_id', session_id);
      
      if (fallbackError) throw fallbackError;
      return fallbackData;
    } catch (fallbackError) {
      console.error('Fallback session query also failed:', fallbackError);
      return [];
    }
  }
}

// Delete a planning session (Product Manager only)
export async function deletePlanningSession(session_id: string) {
  const { error } = await supabase
    .from('planning_sessions')
    .delete()
    .eq('id', session_id);
  if (error) throw error;
}

// Backlog Items Management
export async function createBacklogItem(item: {
  title: string;
  description: string;
  priority: string;
  acceptanceCriteria: string[];
}) {
  const { data, error } = await supabase
    .from('backlog_items')
    .insert([{
      title: item.title,
      description: item.description,
      priority: item.priority,
      acceptance_criteria: item.acceptanceCriteria
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllBacklogItems() {
  const { data, error } = await supabase
    .from('backlog_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateBacklogItem(id: string, updates: {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  story_points?: string;
  estimation_type?: string;
  acceptance_criteria?: string[];
}) {
  const { data, error } = await supabase
    .from('backlog_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBacklogItem(id: string) {
  const { error } = await supabase
    .from('backlog_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Update session items to use UUIDs instead of string IDs
// Add item to session with duplicate check
export async function addItemToSession(session_id: string, item_id: string) {
  // Try to insert directly, let the unique constraint handle duplicates
  const { data, error } = await supabase
    .from('session_items')
    .insert([{ session_id, item_id }])
    .select()
    .single();
  
  if (error) {
    // Check if it's a unique constraint violation (duplicate)
    if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
      // Item already exists, just return success
      return { message: 'Item already in session' };
    }
    throw error;
  }
  return data;
}

export async function getSessionItems(session_id: string) {
  const { data, error } = await supabase
    .from('session_items')
    .select(`
      item_id,
      backlog_items!inner (
        id,
        title,
        description,
        priority,
        status,
        story_points,
        estimation_type,
        acceptance_criteria
      )
    `)
    .eq('session_id', session_id);
  if (error) throw error;
  return data || [];
}

// Get all items that are assigned to any session
export async function getAssignedItems() {
  const { data, error } = await supabase
    .from('session_items')
    .select('item_id');
  if (error) throw error;
  return data?.map(item => item.item_id) || [];
}

// Remove item from session
export async function removeItemFromSession(session_id: string, item_id: string) {
  const { error } = await supabase
    .from('session_items')
    .delete()
    .eq('session_id', session_id)
    .eq('item_id', item_id);
  if (error) throw error;
}

// =============================================
// CHAT MESSAGE FUNCTIONS
// =============================================

// Save a chat message to the database
export async function saveChatMessage(chatMessage: {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: Date;
  itemId?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        id: chatMessage.id,
        session_id: chatMessage.sessionId,
        user_id: chatMessage.userId,
        user_name: chatMessage.userName,
        user_role: chatMessage.userRole,
        message: chatMessage.message,
        backlog_item_id: chatMessage.itemId || null,
        created_at: chatMessage.timestamp.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}

// Load chat messages for a session
export async function loadChatMessages(sessionId: string, limit: number = 100) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Transform database format to ChatMessage format
    return data?.map(msg => ({
      id: msg.id,
      sessionId: msg.session_id,
      userId: msg.user_id,
      userName: msg.user_name,
      userRole: msg.user_role,
      message: msg.message,
      timestamp: new Date(msg.created_at),
      itemId: msg.backlog_item_id,
      isEdited: msg.is_edited || false,
      isDeleted: msg.is_deleted || false,
      editCount: msg.edit_count || 0,
      originalMessage: msg.original_message,
      editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
      deletedAt: msg.deleted_at ? new Date(msg.deleted_at) : undefined
    })) || [];
  } catch (error) {
    console.error('Error loading chat messages:', error);
    return []; // Return empty array on error to avoid breaking the UI
  }
}

// Load chat messages for a specific backlog item in a session
export async function loadChatMessagesForItem(sessionId: string, itemId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('backlog_item_id', itemId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data?.map(msg => ({
      id: msg.id,
      sessionId: msg.session_id,
      userId: msg.user_id,
      userName: msg.user_name,
      userRole: msg.user_role,
      message: msg.message,
      timestamp: new Date(msg.created_at),
      itemId: msg.backlog_item_id
    })) || [];
  } catch (error) {
    console.error('Error loading chat messages for item:', error);
    return [];
  }
}

// Edit a chat message (users can only edit their own messages)
export async function editChatMessage(messageId: string, userId: string, newMessage: string) {
  try {
    // First get the current message to preserve original content
    const { data: currentMessage, error: fetchError } = await supabase
      .from('chat_messages')
      .select('message, original_message, edit_count, is_edited')
      .eq('id', messageId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!currentMessage) throw new Error('Message not found or not owned by user');

    // Prepare update data
    const updateData: any = {
      message: newMessage.trim(),
      is_edited: true,
      edit_count: (currentMessage.edit_count || 0) + 1,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };    // Store original message if this is the first edit
    if (!currentMessage.is_edited) {
      updateData.original_message = currentMessage.message;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .update(updateData)
      .eq('id', messageId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    // Transform database format to ChatMessage format
    return {
      id: data.id,
      sessionId: data.session_id,
      userId: data.user_id,
      userName: data.user_name,
      userRole: data.user_role,
      message: data.message,
      timestamp: new Date(data.created_at),
      itemId: data.backlog_item_id,
      isEdited: data.is_edited || false,
      isDeleted: data.is_deleted || false,
      editCount: data.edit_count || 0,
      originalMessage: data.original_message,
      editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined
    };
  } catch (error) {
    console.error('Error editing chat message:', error);
    throw error;
  }
}

// Soft delete a chat message (users can only delete their own messages)
export async function deleteChatMessage(messageId: string, userId: string) {
  console.log('deleteChatMessage called with:', { messageId, userId });
  
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    // Transform database format to ChatMessage format
    return {
      id: data.id,
      sessionId: data.session_id,
      userId: data.user_id,
      userName: data.user_name,
      userRole: data.user_role,
      message: data.message,
      timestamp: new Date(data.created_at),
      itemId: data.backlog_item_id,
      isEdited: data.is_edited || false,
      isDeleted: data.is_deleted || false,
      editCount: data.edit_count || 0,
      originalMessage: data.original_message,
      editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined
    };
  } catch (error) {
    console.error('Error deleting chat message:', error);
    throw error;
  }
}

// Hard delete a chat message (for admin use or permanent removal)
export async function permanentlyDeleteChatMessage(messageId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error permanently deleting chat message:', error);
    throw error;
  }
}

// Get chat statistics for a session (optional - for analytics)
export async function getChatStatistics(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('user_id, user_name, created_at')
      .eq('session_id', sessionId);

    if (error) throw error;

    const stats = {
      totalMessages: data?.length || 0,
      uniqueParticipants: new Set(data?.map(msg => msg.user_id)).size,
      messagesByUser: data?.reduce((acc: any, msg) => {
        acc[msg.user_name] = (acc[msg.user_name] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    return stats;
  } catch (error) {
    console.error('Error getting chat statistics:', error);
    return { totalMessages: 0, uniqueParticipants: 0, messagesByUser: {} };
  }
}
