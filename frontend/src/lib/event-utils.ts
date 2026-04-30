import type { Game, GenderId, Player } from "@/api/types";

export function eventPlayerIds(event: Game): number[] {
  const ids: number[] = [];
  for (const p of event.teamless) ids.push(p.id);
  for (const team of event.teams) for (const p of team.players) ids.push(p.id);
  return ids;
}

export function isPlayerAttending(playerId: number, event: Game): boolean {
  return eventPlayerIds(event).includes(playerId);
}

export interface GenderTotal {
  count: number;
  max: number;
  percentage: number;
}

export function getTotalsByGender(
  event: Game,
  genderIds: GenderId[],
): Record<number, GenderTotal> {
  const totals: Record<number, GenderTotal> = {};
  for (const g of genderIds) {
    const max = event.type.amountByGender?.[String(g)] ?? 0;
    const count = playersByPredicate(event, (p) => p.genderId === g).length;
    totals[g] = {
      count,
      max,
      percentage: max ? Math.min(100, Math.round((count / max) * 100)) : 0,
    };
  }
  return totals;
}

export function playersByPredicate(
  event: Game,
  predicate: (p: Player) => boolean,
): Player[] {
  const results: Player[] = [];
  for (const p of event.teamless) if (predicate(p)) results.push(p);
  for (const team of event.teams)
    for (const p of team.players) if (predicate(p)) results.push(p);
  return results;
}
