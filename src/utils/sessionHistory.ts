import { supabase } from '../supabaseClient';
import { SessionSummary, PlanningSession } from '../types';

export class SessionHistoryService {
  /**
   * End a session and generate a summary
   */
  async endSession(sessionId: string, userId: string): Promise<SessionSummary> {
    try {
      console.log('🔚 Ending session:', sessionId);
      
      // First, get the session details
      const { data: session, error: sessionError } = await supabase
        .from('planning_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('❌ Failed to get session:', sessionError);
        throw new Error('Session not found');
      }

      // Check if user has permission to end session
      if (session.started_by !== userId) {
        throw new Error('Only session creator can end the session');
      }

      console.log('[DEBUG] session.started_by:', session.started_by);
      console.log('[DEBUG] session.started_by_name:', session.started_by_name);

      const endTime = new Date();
      const startTime = new Date(session.started_at);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

      // Get all estimations for this session
      const { data: estimations, error: estimationsError } = await supabase
        .from('estimations')
        .select(`
          *,
          backlog_items (
            id,
            title,
            story_points
          )
        `)
        .eq('session_id', sessionId);

      if (estimationsError) {
        console.error('❌ Failed to get estimations:', estimationsError);
        throw estimationsError;
      }

      // --- Move unestimated stories back to backlog ---
      let sessionItems = (await supabase
        .from('session_items')
        .select(`
          backlog_items (
            id,
            title,
            story_points,
            status
          )
        `)
        .eq('session_id', sessionId)).data;
      if (!sessionItems) sessionItems = [];
      const unestimatedStories = sessionItems.filter(item => {
        const story = (item.backlog_items && !Array.isArray(item.backlog_items)) ? item.backlog_items as { id: string; story_points: any; } : null;
        return story && (story.story_points === null || story.story_points === undefined);
      });
      for (const item of unestimatedStories) {
        const story = (item.backlog_items && !Array.isArray(item.backlog_items)) ? item.backlog_items as { id: string; story_points: any; } : null;
        if (!story) continue;
        // Remove from session_items (fix: use item_id, not backlog_item_id)
        await supabase
          .from('session_items')
          .delete()
          .eq('session_id', sessionId)
          .eq('item_id', story.id);
        // Optionally update backlog item status to 'backlog' or similar
        await supabase
          .from('backlog_items')
          .update({ status: 'backlog' })
          .eq('id', story.id);
      }
      // --- End move unestimated stories ---

      // Re-fetch session items for summary (only estimated stories remain)
      sessionItems = (await supabase
        .from('session_items')
        .select(`
          backlog_items (
            id,
            title,
            story_points,
            status
          )
        `)
        .eq('session_id', sessionId)).data;
      if (!sessionItems) sessionItems = [];

      // Get unique participants
      const participantIds = [...new Set(estimations?.map(e => e.user_id) || [])];
      const participantStats = await this.calculateParticipantStats(participantIds, estimations || []);

      // Calculate story statistics
      const storyStats = this.calculateStoryStats(sessionItems || [], estimations || []);

      // Calculate overall statistics
      const totalVotes = estimations?.length || 0;
      const consensusReachedCount = storyStats.filter(s => s.consensusReached).length;
      const consensusReached = consensusReachedCount > 0;

      // Create session summary
      const sessionSummary: SessionSummary = {
        sessionId: session.id,
        title: session.name,
        startTime,
        endTime,
        duration,
        totalVotes,
        consensusReached,
        participants: participantStats,
        stories: storyStats,
        averageVotingTime: this.calculateAverageVotingTime(estimations || []),
        createdBy: session.started_by_name || session.started_by,
        createdByName: session.started_by_name || undefined,
        roomCode: session.room_code,
        status: 'completed'
      };

      // Update session status to completed and store summary
      const { error: updateError } = await supabase
        .from('planning_sessions')
        .update({
          is_active: false,
          status: 'completed',
          ended_at: endTime.toISOString(),
          summary: sessionSummary
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('❌ Failed to update session:', updateError);
        throw updateError;
      }

      // Store in session history table
      await this.storeSessionHistory(sessionSummary);

      console.log('✅ Session ended successfully');
      return sessionSummary;
    } catch (error) {
      console.error('❌ Error ending session:', error);
      throw error;
    }
  }

  /**
   * Get session history for a user
   */
  async getSessionHistory(userId: string): Promise<SessionSummary[]> {
    try {
      const { data, error } = await supabase
        .from('session_history')
        .select('*')
        .or(`created_by.eq.${userId},participants.cs.${JSON.stringify([{userId}])}`)
        .order('end_time', { ascending: false });

      if (error) {
        console.error('❌ Failed to get session history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching session history:', error);
      throw error;
    }
  }

  /**
   * Get completed sessions for dashboard
   */
  async getCompletedSessions(): Promise<PlanningSession[]> {
    try {
      const { data, error } = await supabase
        .from('planning_sessions')
        .select('*')
        .eq('status', 'completed')
        .order('ended_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to get completed sessions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching completed sessions:', error);
      throw error;
    }
  }

  /**
   * Get session summary by ID
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    try {
      const { data, error } = await supabase
        .from('planning_sessions')
        .select('summary')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('❌ Failed to get session summary:', error);
        throw error;
      }

      return data?.summary || null;
    } catch (error) {
      console.error('❌ Error fetching session summary:', error);
      throw error;
    }
  }  /**
   * Calculate participant statistics
   */
  private async calculateParticipantStats(participantIds: string[], estimations: any[]) {
    const stats = [];

    for (const userId of participantIds) {
      const userEstimations = estimations.filter(e => e.user_id === userId);
      const totalVotes = userEstimations.length;

      // Calculate participation rate based on total stories in session
      const totalStories = [...new Set(estimations.map(e => e.backlog_item_id))].length;
      const participationRate = totalStories > 0 ? totalVotes / totalStories : 0;

      // Try to get username from session context or use User ID as fallback
      // In a real app, you'd want to store user names or have a users table
      const username = this.getUsernameFromContext(userId) || `User ${userId.slice(-6)}`;

      stats.push({
        userId,
        username,
        totalVotes,
        participationRate // Keep as decimal (0-1) for consistency with types
      });
    }

    return stats;
  }
  /**
   * Get username from context (can be enhanced to query a users table)
   */
  private getUsernameFromContext(_userId: string): string | null {
    // This is a placeholder - in a real app you'd query a users table
    // For now, we'll use a simplified approach
    return null;
  }
  /**
   * Calculate story statistics
   */
  private calculateStoryStats(sessionItems: any[], estimations: any[]) {
    const storyStats = [];

    for (const item of sessionItems) {
      const story = item.backlog_items;
      if (!story) continue;

      const storyEstimations = estimations.filter(e => e.backlog_item_id === story.id);
      const uniqueVotes = [...new Set(storyEstimations.map(e => e.value))];
      const consensusReached = uniqueVotes.length === 1 && storyEstimations.length > 1;
      
      // Calculate voting rounds based on estimation patterns
      const votingRounds = this.calculateVotingRounds(storyEstimations);

      storyStats.push({
        storyId: story.id,
        title: story.title,
        finalEstimate: story.story_points?.toString() || 'Not estimated',
        votingRounds,
        consensusReached,
        votes: storyEstimations.map(e => ({
          userId: e.user_id,
          vote: e.value
        }))
      });
    }

    return storyStats;
  }

  /**
   * Calculate voting rounds for a story based on estimation timestamps
   */
  private calculateVotingRounds(storyEstimations: any[]): number {
    if (storyEstimations.length === 0) return 0;
    
    // Group estimations by time windows to detect rounds
    // If there are updates within short time periods, it suggests multiple rounds
    const timeWindows = [];
    const sortedEstimations = storyEstimations.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let currentWindow = [sortedEstimations[0]];
    for (let i = 1; i < sortedEstimations.length; i++) {
      const currentTime = new Date(sortedEstimations[i].created_at).getTime();
      const lastTime = new Date(sortedEstimations[i-1].created_at).getTime();
      
      // If more than 5 minutes apart, consider it a new round
      if (currentTime - lastTime > 5 * 60 * 1000) {
        timeWindows.push(currentWindow);
        currentWindow = [sortedEstimations[i]];
      } else {
        currentWindow.push(sortedEstimations[i]);
      }
    }
    timeWindows.push(currentWindow);

    return Math.max(1, timeWindows.length);
  }
  /**
   * Calculate average voting time
   */
  private calculateAverageVotingTime(estimations: any[]): number {
    if (estimations.length === 0) return 0;

    // Calculate actual voting times if timestamps are available
    let totalVotingTime = 0;
    let votingTimeCount = 0;

    for (const estimation of estimations) {
      if (estimation.created_at && estimation.updated_at) {
        const createdTime = new Date(estimation.created_at).getTime();
        const updatedTime = new Date(estimation.updated_at).getTime();
        const votingTime = (updatedTime - createdTime) / 1000; // Convert to seconds
        
        if (votingTime > 0 && votingTime < 300) { // Ignore outliers (> 5 minutes)
          totalVotingTime += votingTime;
          votingTimeCount++;
        }
      }
    }

    // If we have actual voting times, use them
    if (votingTimeCount > 0) {
      return Math.round(totalVotingTime / votingTimeCount);
    }

    // Fallback: estimate based on session duration and number of votes
    return 30; // Default 30 seconds per vote
  }

  /**
   * Store session history in dedicated table
   */
  private async storeSessionHistory(summary: SessionSummary) {
    try {
      const { error } = await supabase
        .from('session_history')
        .insert([{
          session_id: summary.sessionId,
          title: summary.title,
          start_time: summary.startTime.toISOString(),
          end_time: summary.endTime.toISOString(),
          duration: summary.duration,
          total_votes: summary.totalVotes,
          consensus_reached: summary.consensusReached,
          participants: summary.participants,
          stories: summary.stories,
          average_voting_time: summary.averageVotingTime,
          created_by: summary.createdBy && summary.createdBy.match(/^[\w-]{36}$/) ? summary.createdBy : null, // Only set if UUID
          created_by_name: summary.createdByName || null, // Always set from summary
          room_code: summary.roomCode,
          status: summary.status
        }]);

      if (error) {
        console.error('❌ Failed to store session history:', error);
        // Don't throw error here as the main session ending was successful
      }
    } catch (error) {
      console.error('❌ Error storing session history:', error);
    }
  }
}

export const sessionHistoryService = new SessionHistoryService();
