export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  storyPoints?: number | string;
  status: 'Pending' | 'Estimated' | 'Skipped';
  estimationType?: 'fibonacci' | 'tshirt';
  votingTimeLimit?: number; // in seconds
}

export interface User {
  id: string;
  name: string;
  role: 'Moderator' | 'Team Member';
}

export interface Vote {
  userId: string;
  userName: string;
  userRole: string;
  points: number | string;
  timestamp: Date;
  canEdit: boolean;
}

export interface VotingSession {
  currentItem: BacklogItem | null;
  votes: Vote[];
  isRevealed: boolean;
  isVotingComplete: boolean;
  estimationType: 'fibonacci' | 'tshirt';
  timeRemaining?: number; // in seconds
  timerActive: boolean;
}

export interface Estimation {
  id: string;
  session_id: string;
  backlog_item_id: string;
  user_id: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// Session management types
export interface SessionSummary {
  sessionId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  totalVotes: number;
  consensusReached: boolean;
  finalEstimate?: string;
  participants: {
    userId: string;
    username: string;
    totalVotes: number;
    participationRate: number;
  }[];
  stories: {
    storyId: string;
    title: string;
    finalEstimate: string;
    votingRounds: number;
    consensusReached: boolean;
    votes: { userId: string; vote: string }[];
  }[];
  averageVotingTime: number;
  createdBy: string;
  roomCode?: string;
  status: 'completed';
}

export interface PlanningSession {
  id: string;
  name: string;
  started_by: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  status: 'active' | 'completed';
  room_code?: string;
  summary?: SessionSummary;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: Date;
  itemId?: string; // Optional: tie message to specific backlog item
  status?: 'pending' | 'saved' | 'failed'; // Message persistence status
  isEdited?: boolean; // Whether message has been edited
  isDeleted?: boolean; // Whether message has been deleted (soft delete)
  editCount?: number; // Number of times message has been edited
  originalMessage?: string; // Original message content (for edit history)
  editedAt?: Date; // When message was last edited
  deletedAt?: Date; // When message was deleted
}

export interface AppState {
  user: User | null;
  backlogItems: BacklogItem[];
  currentSession: VotingSession;
  currentItemIndex: number;
  teamMembers: User[];
}

export interface VideoParticipant {
  id: string;
  name: string;
  role: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

export interface VideoConferenceState {
  isActive: boolean;
  participants: VideoParticipant[];
  localStream?: MediaStream;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

export interface VideoCallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'toggle-video' | 'toggle-audio';
  from: string;
  to?: string;
  data?: any;
  sessionId: string;
}