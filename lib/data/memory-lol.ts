// lib/data/memory-lol.ts

export type UsernameEntry = {
  handle: string;
  activeFrom: string | null;
  activeTo: string | null;
};

export type MemoryLolData = {
  userId: string | null;
  usernameHistory: UsernameEntry[];
  totalChanges: number;
};

export async function fetchUsernameHistory(handle: string): Promise<MemoryLolData> {
  const cleanHandle = handle.replace(/^@/, '');
  const empty: MemoryLolData = { userId: null, usernameHistory: [], totalChanges: 0 };

  try {
    const res = await fetch(
      `https://memory.lol/v1/tw/${encodeURIComponent(cleanHandle)}`,
      { next: { revalidate: 0 } }
    );
    if (res.status === 404) return empty;
    if (!res.ok) throw new Error(`memory.lol ${res.status}`);

    const json = await res.json() as Record<string, unknown>;

    const accounts = (json.accounts as Array<{ id?: string; usernames?: Array<[string, string?, string?]> }> | undefined) ?? [];
    if (!accounts.length) return empty;

    const account = accounts[0];
    const usernameHistory: UsernameEntry[] = (account.usernames ?? []).map(([h, from, to]) => ({
      handle: h,
      activeFrom: from ?? null,
      activeTo: to ?? null,
    }));

    return {
      userId: account.id ?? null,
      usernameHistory,
      totalChanges: Math.max(0, usernameHistory.length - 1),
    };
  } catch (err) {
    console.error('[memory.lol] fetch error:', (err as Error).message);
    return empty;
  }
}
