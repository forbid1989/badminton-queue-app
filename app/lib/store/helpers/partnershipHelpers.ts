import { Player } from "../../../components/types/Player";

/**
 * Logs partnership warnings for players on a court
 * Checks for excessive partnerships (positions 0&2, 1&3) and oppositions
 */
export function logPartnershipWarnings(
  zoneId: string,
  players: Player[]
): void {
  if (players.length < 2) {
    return;
  }

  const warnings: string[] = [];
  let hasExcessivePartnerships = false;
  let hasExcessiveOppositions = false;

  // Check partnerships between positions 0&2 and 1&3
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const player1 = players[i];
      const player2 = players[j];

      // Check if they're teammates (positions 0&2 or 1&3)
      const areTeammates =
        (i === 0 && j === 2) || // positions 0,2
        (i === 1 && j === 3); // positions 1,3

      // Check if they're opponents (positions 0,1 vs 2,3)
      const areOpponents =
        (i === 0 && (j === 2 || j === 3)) || // pos 0 vs pos 2,3
        (i === 1 && (j === 2 || j === 3)) || // pos 1 vs pos 2,3
        (i === 2 && (j === 0 || j === 1)) || // pos 2 vs pos 0,1
        (i === 3 && (j === 0 || j === 1)); // pos 3 vs pos 0,1

      if (areTeammates) {
        const count1 = (player1.matchHistory || []).filter(
          (match) => match.partner?.id === player2.id
        ).length;
        const count2 = (player2.matchHistory || []).filter(
          (match) => match.partner?.id === player1.id
        ).length;
        const maxCount = Math.max(count1, count2);

        if (maxCount >= 2) {
          hasExcessivePartnerships = true;
          warnings.push(
            `PARTNERSHIP: ${player1.name} & ${player2.name} have partnered ${maxCount} times`
          );
        }
      }

      if (areOpponents) {
        const count1 = (player1.matchHistory || []).filter((match) =>
          match.opponents.some((opp) => opp.id === player2.id)
        ).length;
        const count2 = (player2.matchHistory || []).filter((match) =>
          match.opponents.some((opp) => opp.id === player1.id)
        ).length;
        const maxCount = Math.max(count1, count2);

        if (maxCount >= 2) {
          hasExcessiveOppositions = true;
          warnings.push(
            `OPPOSITION: ${player1.name} vs ${player2.name} have faced each other ${maxCount} times`
          );
        }
      }
    }
  }

  if (hasExcessivePartnerships || hasExcessiveOppositions) {
    console.warn(`⚠️ REPEAT DETECTION WARNING on ${zoneId}:`);
    warnings.forEach((warning) => console.warn(`   ${warning}`));
  }
}
