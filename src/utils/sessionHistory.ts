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

      // Get session items
      const { data: sessionItems, error: itemsError } = await supabase
        .from('session_items')
        .select(`
          backlog_items (
            id,
            title,
            story_points,
            status
          )
        `)
        .eq('session_id', sessionId);

      if (itemsError) {
        console.error('❌ Failed to get session items:', itemsError);
        throw itemsError;
      }

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
        createdBy: session.started_by,
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
  }

  /**
   * Calculate participant statistics
   */
  private async calculateParticipantStats(participantIds: string[], estimations: any[]) {
    const stats = [];

    for (const userId of participantIds) {
      // Get user info - you might need to adjust this based on your user table structure
      const userEstimations = estimations.filter(e => e.user_id === userId);
      const totalVotes = userEstimations.length;

      // Calculate participation rate based on total stories in session
      const totalStories = [...new Set(estimations.map(e => e.backlog_item_id))].length;
      const participationRate = totalStories > 0 ? (totalVotes / totalStories) * 100 : 0;

      stats.push({
        userId,
        username: `User ${userId}`, // You might want to get actual username from users table
        totalVotes,
        participationRate: Math.round(participationRate)
      });
    }

    return stats;
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

      storyStats.push({
        storyId: story.id,
        title: story.title,
        finalEstimate: story.story_points?.toString() || 'Not estimated',
        votingRounds: 1, // You might want to track this separately
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
   * Calculate average voting time
   */
  private calculateAverageVotingTime(estimations: any[]): number {
    if (estimations.length === 0) return 0;

    // This is a simplified calculation - you might want to track actual voting times
    const totalTime = estimations.length * 30; // Assume 30 seconds per vote
    return Math.round(totalTime / estimations.length);
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
          created_by: summary.createdBy,
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
