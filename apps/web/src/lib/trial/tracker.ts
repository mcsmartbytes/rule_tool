const STORAGE_KEY = 'rule_tool_trial_count';
const TRIAL_LIMIT = 3;

export function getEstimateCount(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementEstimateCount(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const current = getEstimateCount();
    const newCount = current + 1;
    localStorage.setItem(STORAGE_KEY, String(newCount));
    return newCount;
  } catch {
    return 0;
  }
}

export function hasTrialRemaining(): boolean {
  return getEstimateCount() < TRIAL_LIMIT;
}

export function getTrialRemaining(): number {
  const used = getEstimateCount();
  return Math.max(0, TRIAL_LIMIT - used);
}

export function resetTrialCount(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

export const TRIAL_CONFIG = {
  limit: TRIAL_LIMIT,
  storageKey: STORAGE_KEY,
};
