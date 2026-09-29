// ============================================
// Trust Level Calculator
// Determines how much a character "trusts" the user
// based on interaction depth, not just volume
// ============================================

export function calculateTrustLevel(params: {
  messageCount: number;
  daysSinceFirst: number;
  emotionalMomentCount: number;
  userInitiatedCount: number;
}): number {
  const { messageCount, daysSinceFirst, emotionalMomentCount, userInitiatedCount } = params;

  let trust = 0;

  // Volume contribution (max 3) — more messages = more familiarity
  trust += Math.min(messageCount / 15, 3);

  // Time span contribution (max 2) — friendship needs time
  trust += Math.min(daysSinceFirst / 3, 2);

  // Emotional depth contribution (max 2.5) — deep conversations build trust faster
  trust += Math.min(emotionalMomentCount / 2, 2.5);

  // User initiative contribution (max 2.5) — user reaching out shows investment
  trust += Math.min(userInitiatedCount / 5, 2.5);

  // Cap at 10
  return Math.min(Math.round(trust * 10) / 10, 10);
}

export function getTrustLabel(trustLevel: number): string {
  if (trustLevel < 1) return 'Stranger';
  if (trustLevel < 3) return 'Acquaintance';
  if (trustLevel < 5) return 'Friend';
  if (trustLevel < 7) return 'Close Friend';
  if (trustLevel < 9) return 'Best Friend';
  return 'Soulmate';
}
