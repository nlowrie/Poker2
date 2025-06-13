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
git
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