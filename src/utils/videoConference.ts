import { supabase } from '../supabaseClient';

export interface VideoSession {
  id: string;
  session_id: string;
  started_by: string;
  started_at: string;
  ended_at?: string;
  participants_count: number;
  is_active: boolean;
}

// Start a video conference session
export async function startVideoSession(sessionId: string, userId: string) {
  const { data, error } = await supabase
    .from('video_sessions')
    .insert([
      {
        session_id: sessionId,
        started_by: userId,
        participants_count: 1,
        is_active: true,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error starting video session:', error);
    throw error;
  }

  return data;
}

// End a video conference session
export async function endVideoSession(videoSessionId: string) {
  const { data, error } = await supabase
    .from('video_sessions')
    .update({
      ended_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', videoSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error ending video session:', error);
    throw error;
  }

  return data;
}

// Update participant count
export async function updateVideoSessionParticipants(videoSessionId: string, count: number) {
  const { data, error } = await supabase
    .from('video_sessions')
    .update({ participants_count: count })
    .eq('id', videoSessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating video session participants:', error);
    throw error;
  }

  return data;
}

// Get active video session for a planning session
export async function getActiveVideoSession(sessionId: string) {
  const { data, error } = await supabase
    .from('video_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error getting active video session:', error);
    throw error;
  }

  return data;
}
