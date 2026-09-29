// ============================================
// Time Context Utility
// Makes characters time-aware for realistic responses
// ============================================

export function getTimeContext(): {
  timeOfDay: string;
  greeting: string;
  mood: string;
  activity: string;
} {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 5 && hour < 9) {
    return {
      timeOfDay: 'early morning',
      greeting: 'morning',
      mood: 'groggy/just waking up',
      activity: 'probably just woke up, having chai or getting ready',
    };
  } else if (hour >= 9 && hour < 12) {
    return {
      timeOfDay: 'morning',
      greeting: 'morning',
      mood: 'alert and active',
      activity: 'at work/college, busy but can text',
    };
  } else if (hour >= 12 && hour < 14) {
    return {
      timeOfDay: 'afternoon',
      greeting: 'hey',
      mood: 'lunch break energy',
      activity: 'lunch break, relaxed, can chat',
    };
  } else if (hour >= 14 && hour < 17) {
    return {
      timeOfDay: 'afternoon',
      greeting: 'hey',
      mood: 'post-lunch sluggish',
      activity: 'at work/college, might be drowsy',
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      timeOfDay: 'evening',
      greeting: 'evening',
      mood: 'winding down, more relaxed',
      activity: 'done with work, commuting or chilling',
    };
  } else if (hour >= 20 && hour < 23) {
    return {
      timeOfDay: 'night',
      greeting: 'yo',
      mood: 'relaxed, casual, chatty',
      activity: 'at home, watching something, free to talk',
    };
  } else {
    return {
      timeOfDay: 'late night',
      greeting: 'bro you\'re still up?',
      mood: 'deep talk hours, vulnerable, philosophical',
      activity: 'can\'t sleep, scrolling phone, open to deep conversations',
    };
  }
}

export function getDaysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getLastSeenText(lastActive: Date): string {
  const days = getDaysSince(lastActive);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return 'a while ago';
}
