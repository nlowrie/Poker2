export const FIBONACCI_SEQUENCE = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

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
  89: '89'
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
} {
  if (votes.length === 0) {
    return { consensus: null, average: 0, hasConsensus: false };
  }

  let numericVotes: number[];
  
  if (estimationType === 'tshirt') {
    numericVotes = votes.map(vote => 
      typeof vote === 'string' ? TSHIRT_VALUES[vote] || 0 : vote as number
    );
  } else {
    numericVotes = votes.map(vote => {
      if (typeof vote === 'number') return vote;
      if (typeof vote === 'string') {
        const numValue = parseFloat(vote);
        return isNaN(numValue) ? 0 : numValue;
      }
      return 0;
    });
  }

  const average = numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length;
  const uniqueVotes = new Set(votes);
  
  // Consensus if all votes are the same or within acceptable range
  const hasConsensus = uniqueVotes.size === 1 || 
    (uniqueVotes.size === 2 && isAdjacentEstimate(Array.from(uniqueVotes), estimationType));
  
  let consensus: number | string | null = null;
  if (hasConsensus) {
    if (estimationType === 'tshirt') {
      // Find the closest T-shirt size to the average
      const closestValue = Object.entries(TSHIRT_VALUES)
        .reduce((prev, curr) => 
          Math.abs(curr[1] - average) < Math.abs(prev[1] - average) ? curr : prev
        );
      consensus = closestValue[0];
    } else {
      consensus = Math.round(average);
    }
  }
  
  return { consensus, average, hasConsensus };
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