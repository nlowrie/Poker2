import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Cache for user information to avoid repeated API calls
 */
const userCache = new Map<string, { name: string; initials: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get a consistent display name for a user, handling anonymous users gracefully
 */
export function getUserDisplayName(user: SupabaseUser | null): string {
  if (!user) {
    return 'Anonymous';
  }

  // Try to get the full name from user metadata
  const fullName = user.user_metadata?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  // Try to get name from email (before @)
  const email = user.email;
  if (email) {
    const emailName = email.split('@')[0];
    if (emailName && emailName.length > 0) {
      return emailName;
    }
  }

  // Try to get name from phone number
  const phone = user.phone;
  if (phone) {
    return `User ${phone.slice(-4)}`; // Show last 4 digits
  }

  // Fallback to anonymous with user ID suffix for uniqueness
  const userIdSuffix = user.id.slice(-4);
  return `Anonymous-${userIdSuffix}`;
}

/**
 * Get the initials for a user's display name
 */
export function getUserInitials(displayName: string): string {
  if (!displayName || displayName.trim() === '') {
    return '?';
  }

  const trimmedName = displayName.trim();
  
  // Handle Anonymous users
  if (trimmedName.toLowerCase().startsWith('anonymous')) {
    return 'A';
  }

  // Split name into words and get first letter of each
  const words = trimmedName.split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  // Take first letter of first and last word
  const firstInitial = words[0].charAt(0).toUpperCase();
  const lastInitial = words[words.length - 1].charAt(0).toUpperCase();
  
  return firstInitial + lastInitial;
}

/**
 * Check if a user is considered anonymous (no meaningful identifying information)
 */
export function isAnonymousUser(user: SupabaseUser | null): boolean {
  if (!user) {
    return true;
  }

  const fullName = user.user_metadata?.full_name?.trim();
  const email = user.email;
  
  return !fullName && !email;
}

/**
 * Get user display information by user ID (simplified version)
 */
export function getUserInfoById(userId: string): { name: string; initials: string } {
  // Check cache first
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { name: cached.name, initials: cached.initials };
  }

  // Create a consistent display name from user ID
  const fallbackName = `User ${userId.slice(-4)}`;
  const initials = getUserInitials(fallbackName);
  
  // Cache the result
  userCache.set(userId, {
    name: fallbackName,
    initials,
    timestamp: Date.now()
  });
  
  return { name: fallbackName, initials };
}
