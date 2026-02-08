const STORAGE_KEY = "voting_history";
const MAX_ITEMS = 10;

export type VotingHistoryItem = {
  id: string;
  title: string;
  visitedAt: number;
};

export function getVotingHistory(): VotingHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is VotingHistoryItem =>
          x != null &&
          typeof x === "object" &&
          typeof (x as VotingHistoryItem).id === "string" &&
          typeof (x as VotingHistoryItem).title === "string" &&
          typeof (x as VotingHistoryItem).visitedAt === "number"
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addToVotingHistory(item: { id: string; title: string }): void {
  if (typeof window === "undefined") return;
  try {
    const list = getVotingHistory().filter((x) => x.id !== item.id);
    const next: VotingHistoryItem = {
      id: item.id,
      title: item.title,
      visitedAt: Date.now(),
    };
    const updated = [next, ...list].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function removeFromVotingHistory(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = getVotingHistory().filter((x) => x.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
