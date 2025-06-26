export const FIBONACCI_SEQUENCE = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, -1, -2];

export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Special card values for Fibonacci sequence
export const SPECIAL_CARDS = {
  NEED_INFO: -1,
  TOO_BIG: -2
} as const;

export const CARD_LABELS: { [key: number]: string } = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  5: '5',
  8: '8',
  13: '13',
  21: '21',
  34: '34',
  55: '55',
  89: '89',
  [-1]: 'Need Info',
  [-2]: 'Too Big'
};

export const TSHIRT_VALUES: { [key: string]: number } = {
  'XS': 1,
  'S': 2,
  'M': 3,
  'L': 5,
  'XL': 8,
  'XXL': 13
};

export function calculateConsensus(votes: (number | string)[], estimationType: 'fibonacci' | 'tshirt'): {
  consensus: number | string | null;
  average: number;
  hasConsensus: boolean;
  hasSpecialCards: boolean;
  specialCardCounts: { needInfo: number; tooBig: number };
  validVotesCount: number;
} {
  if (votes.length === 0) {
    return { 
      consensus: null, 
      average: 0, 
      hasConsensus: false,
      hasSpecialCards: false,
      specialCardCounts: { needInfo: 0, tooBig: 0 },
      validVotesCount: 0
    };
  }

  // Count special cards
  const needInfoCount = votes.filter(vote => vote === SPECIAL_CARDS.NEED_INFO).length;
  const tooBigCount = votes.filter(vote => vote === SPECIAL_CARDS.TOO_BIG).length;
  const hasSpecialCards = needInfoCount > 0 || tooBigCount > 0;

  // Filter out special cards for consensus calculation
  const validVotes = votes.filter(vote => 
    vote !== SPECIAL_CARDS.NEED_INFO && vote !== SPECIAL_CARDS.TOO_BIG
  );

  let numericVotes: number[];
  
  if (estimationType === 'tshirt') {
    // Use index-based mapping for t-shirt sizes
    numericVotes = validVotes.map(vote => {
      if (typeof vote === 'string') {
        const idx = TSHIRT_SIZES.indexOf(vote);
        return idx !== -1 ? idx : -1;
      }
      return -1;
    }).filter(idx => idx !== -1);
  } else {
    numericVotes = validVotes.map(vote => {
      if (typeof vote === 'number') return vote;
      if (typeof vote === 'string') {
        const numValue = parseFloat(vote);
        return isNaN(numValue) ? 0 : numValue;
      }
      return 0;
    });
  }

  // Calculate average only from valid votes
  const average = numericVotes.length > 0 
    ? numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length 
    : 0;
  
  const uniqueValidVotes = new Set(validVotes);
  
  // Consensus if all valid votes are the same or within acceptable range
  // No consensus if there are special cards
  const hasConsensus = !hasSpecialCards && 
    (uniqueValidVotes.size === 1 || 
    (uniqueValidVotes.size === 2 && isAdjacentEstimate(Array.from(uniqueValidVotes), estimationType)));
  
  let consensus: number | string | null = null;
  if (estimationType === 'tshirt' && validVotes.length > 0) {
    // Always show consensus for t-shirt sizes based on average index
    const indices = validVotes.map(vote => {
      if (typeof vote === 'string') {
        const idx = TSHIRT_SIZES.indexOf(vote);
        return idx !== -1 ? idx : -1;
      }
      return -1;
    }).filter(idx => idx !== -1);
    const avgIndex = indices.length > 0 ? indices.reduce((a, b) => a + b, 0) / indices.length : 0;
    const ceilIndex = Math.ceil(avgIndex);
    consensus = TSHIRT_SIZES[Math.min(Math.max(ceilIndex, 0), TSHIRT_SIZES.length - 1)];
  } else if (hasConsensus && validVotes.length > 0) {
    consensus = Math.round(average);
  }
  
  return { 
    consensus, 
    average, 
    hasConsensus,
    hasSpecialCards,
    specialCardCounts: { needInfo: needInfoCount, tooBig: tooBigCount },
    validVotesCount: validVotes.length
  };
}

function isAdjacentEstimate(votes: (number | string)[], estimationType: 'fibonacci' | 'tshirt'): boolean {
  if (votes.length !== 2) return false;
  
  if (estimationType === 'tshirt') {
    const sizes = TSHIRT_SIZES;
    const indices = votes.map(vote => sizes.indexOf(vote as string)).filter(i => i !== -1);
    return indices.length === 2 && Math.abs(indices[0] - indices[1]) === 1;
  } else {
    const [a, b] = (votes as number[]).sort((x, y) => x - y);
    const aIndex = FIBONACCI_SEQUENCE.indexOf(a);
    const bIndex = FIBONACCI_SEQUENCE.indexOf(b);
    
    return aIndex !== -1 && bIndex !== -1 && Math.abs(aIndex - bIndex) === 1;
  }
}

export function generateSampleBacklog(): any[] {
  return [
    {
      id: '1',
      title: 'User Authentication System',
      description: 'Implement secure login and registration functionality with email verification and password reset capabilities',
      acceptanceCriteria: [
        'Users can register with email and password',
        'Email verification required before login',
        'Password reset functionality available',
        'Session management with auto-logout',
        'Two-factor authentication support'
      ],
      priority: 'High' as const,
      status: 'Pending' as const
    },
    {
      id: '2',
      title: 'Dashboard Analytics',
      description: 'Create comprehensive dashboard with key metrics, data visualizations, and real-time updates',
      acceptanceCriteria: [
        'Display key performance indicators',
        'Interactive charts and graphs',
        'Filter by date range',
        'Export data functionality',
        'Real-time data updates',
        'Mobile responsive design'
      ],
      priority: 'Medium' as const,
      status: 'Pending' as const
    },
    {
      id: '3',
      title: 'Mobile App Notifications',
      description: 'Implement comprehensive push notification system for mobile application with customizable preferences',
      acceptanceCriteria: [
        'Push notification setup',
        'Notification preferences management',
        'Badge count management',
        'Deep linking from notifications',
        'Notification history',
        'Silent hours configuration'
      ],
      priority: 'High' as const,
      status: 'Pending' as const
    },
    {
      id: '4',
      title: 'Advanced Search Functionality',
      description: 'Implement powerful search with filters, sorting, and auto-complete suggestions',
      acceptanceCriteria: [
        'Full-text search capability',
        'Advanced filtering options',
        'Auto-complete suggestions',
        'Search result sorting',
        'Search history',
        'Saved search queries'
      ],
      priority: 'Medium' as const,
      status: 'Pending' as const
    },
    {
      id: '5',
      title: 'API Rate Limiting',
      description: 'Implement rate limiting for API endpoints to prevent abuse and ensure fair usage',
      acceptanceCriteria: [
        'Rate limiting per user/IP',
        'Different limits for different endpoints',
        'Rate limit headers in responses',
        'Graceful error handling',
        'Admin override capabilities'
      ],
      priority: 'Low' as const,
      status: 'Pending' as const
    },
    {
      id: '6',
      title: 'File Upload System',
      description: 'Create secure file upload system with virus scanning and file type validation',
      acceptanceCriteria: [
        'Multiple file upload support',
        'File type validation',
        'File size limits',
        'Virus scanning integration',
        'Progress indicators',
        'Drag and drop interface'
      ],
      priority: 'Critical' as const,
      status: 'Pending' as const
    }
  ];
}