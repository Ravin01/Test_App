/**
 * Utility functions for displaying relative time ("time ago") across the application
 * Handles timezone conversions properly to avoid incorrect time displays
 */

/**
 * Converts a date string to a proper Date object, handling timezone issues
 * @param dateString - The date string from the backend
 * @returns A valid Date object
 */
export const parseDate = (dateString: string): Date => {
  // Ensure the date string is treated as UTC if it doesn't have timezone info
  let date: Date;
  
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-')) {
    // Already has timezone info
    date = new Date(dateString);
  } else {
    // Assume UTC if no timezone specified
    date = new Date(dateString + 'Z');
  }
  
  // Validate date and fallback if invalid
  if (isNaN(date.getTime())) {
    date = new Date(dateString);
  }
  
  return date;
};

/**
 * Formats a date as relative time (e.g., "5 minutes ago", "Yesterday", etc.)
 * @param dateString - The date string to format
 * @returns A human-readable relative time string
 */
export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = parseDate(dateString);
  
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  // Reset time to midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff = Math.floor((today.getTime() - notifDate.getTime()) / 86400000);
  
  // Just now (< 1 minute)
  if (diffMins < 1) {
    return 'just now';
  }
  
  // Few minutes ago (< 5 minutes)
  if (diffMins < 5) {
    return 'few minutes ago';
  }
  
  // X minutes ago (< 60 minutes)
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  
  // X hours ago (< 24 hours and same day)
  if (daysDiff === 0 && diffHours < 24) {
    if (diffHours < 1) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  // Today (same day but show time)
  if (daysDiff === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  }
  
  // Yesterday
  if (daysDiff === 1) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  }
  
  // This Week (2-6 days ago)
  if (daysDiff <= 6) {
    return `${date.toLocaleDateString('en-US', { weekday: 'long' })} at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  }
  
  // This Month (within current month)
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  }
  
  // Older notifications - show full date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
};

/**
 * Formats a date as short relative time (e.g., "5m ago", "2h ago", "3d ago")
 * Used for compact displays like social media posts
 * @param dateString - The date string to format
 * @returns A short relative time string
 */
export const formatShortTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = parseDate(dateString);
  
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
};

/**
 * Gets the section category for grouping (e.g., "Today", "Yesterday", "This Week")
 * Used for sectioned lists in notifications
 * @param dateString - The date string to categorize
 * @returns The section category string
 */
export const getSectionCategory = (dateString: string): string => {
  const now = new Date();
  const date = parseDate(dateString);
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff = Math.floor((today.getTime() - notifDate.getTime()) / 86400000);
  
  // Today
  if (daysDiff === 0) {
    return 'Today';
  }
  
  // Yesterday
  if (daysDiff === 1) {
    return 'Yesterday';
  }
  
  // This Week (2-6 days ago)
  if (daysDiff <= 6) {
    return 'This Week';
  }
  
  // This Month (within current month)
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return 'This Month';
  }
  
  // Older notifications
  return 'Older';
};
