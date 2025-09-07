// src/hooks/usePartnershipWarnings.ts

import { useState, useCallback, useMemo } from "react";
import { Player } from "../../components/types/Player";
import {
  analyzeCourtConfiguration,
  getWarningLevel,
} from "../../lib/utils/partnershipAnalysis";
import { PartnershipWarning } from "../../components/PartnershipWarningSnackbar";

interface UsePartnershipWarningsProps {
  maxPartnershipCount?: number;
  maxOpponentCount?: number;
  enableWarnings?: boolean;
}

interface PartnershipWarningsReturn {
  warnings: PartnershipWarning[];
  dismissWarning: (warningId: string) => void;
  dismissAllWarnings: () => void;
  checkPlayers: (players: Player[], zone: string) => boolean;
  getPlayerWarningLevel: (
    playerId: string,
    players: Player[]
  ) => "none" | "warning" | "critical";
  clearWarnings: () => void;
}

export const usePartnershipWarnings = ({
  maxPartnershipCount = 2,
  maxOpponentCount = 2,
  enableWarnings = true,
}: UsePartnershipWarningsProps = {}): PartnershipWarningsReturn => {
  const [warnings, setWarnings] = useState<PartnershipWarning[]>([]);

  // Generate unique warning ID
  const generateWarningId = useCallback(() => {
    return `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Check players for partnership/opponent frequency issues
  const checkPlayers = useCallback(
    (players: Player[], zone: string): boolean => {
      if (!enableWarnings || players.length < 2) {
        return false; // No warnings
      }

      const analysis = analyzeCourtConfiguration(
        players,
        maxPartnershipCount,
        maxOpponentCount
      );

      if (analysis.hasWarnings) {
        const newWarnings: PartnershipWarning[] = [];

        // Group warnings by type
        const partnershipWarnings = analysis.warnings.filter((w) =>
          w.includes("partners")
        );
        const opponentWarnings = analysis.warnings.filter((w) =>
          w.includes("opponents")
        );

        if (partnershipWarnings.length > 0) {
          // Extract player names from partnership warnings
          const playerNames = Array.from(
            new Set(
              partnershipWarnings.flatMap((warning) => {
                const match = warning.match(
                  /^(\w+(?:\s+\w+)*)\s+and\s+(\w+(?:\s+\w+)*)\s+have/
                );
                return match ? [match[1], match[2]] : [];
              })
            )
          );

          const partnershipCount = Math.max(
            ...partnershipWarnings.map((warning) => {
              const match = warning.match(/(\d+)\s+times/);
              return match ? parseInt(match[1]) : 0;
            })
          );

          newWarnings.push({
            id: generateWarningId(),
            type: "partnership",
            severity:
              partnershipCount > maxPartnershipCount + 1 ? "error" : "warning",
            message: `Players have been partners ${partnershipCount} times (limit: ${maxPartnershipCount})`,
            details: partnershipWarnings,
            timestamp: Date.now(),
            playerNames,
            zone: zone.replace(
              /^(court|queue)-(\d+)$/,
              (_, type, num) =>
                `${type.charAt(0).toUpperCase() + type.slice(1)} ${
                  parseInt(num) + 1
                }`
            ),
          });
        }

        if (opponentWarnings.length > 0) {
          // Extract player names from opponent warnings
          const playerNames = Array.from(
            new Set(
              opponentWarnings.flatMap((warning) => {
                const match = warning.match(
                  /^(\w+(?:\s+\w+)*)\s+and\s+(\w+(?:\s+\w+)*)\s+have/
                );
                return match ? [match[1], match[2]] : [];
              })
            )
          );

          const opponentCount = Math.max(
            ...opponentWarnings.map((warning) => {
              const match = warning.match(/(\d+)\s+times/);
              return match ? parseInt(match[1]) : 0;
            })
          );

          newWarnings.push({
            id: generateWarningId(),
            type: "opponent",
            severity:
              opponentCount > maxOpponentCount + 1 ? "error" : "warning",
            message: `Players have been opponents ${opponentCount} times (limit: ${maxOpponentCount})`,
            details: opponentWarnings,
            timestamp: Date.now(),
            playerNames,
            zone: zone.replace(
              /^(court|queue)-(\d+)$/,
              (_, type, num) =>
                `${type.charAt(0).toUpperCase() + type.slice(1)} ${
                  parseInt(num) + 1
                }`
            ),
          });
        }

        // Add new warnings to state
        setWarnings((prev) => [...prev, ...newWarnings]);
        return true; // Has warnings
      }

      return false; // No warnings
    },
    [enableWarnings, maxPartnershipCount, maxOpponentCount, generateWarningId]
  );

  // Get warning level for a specific player in a group
  const getPlayerWarningLevel = useCallback(
    (playerId: string, players: Player[]): "none" | "warning" | "critical" => {
      if (!enableWarnings || players.length < 2) {
        return "none";
      }

      const player = players.find((p) => p.id === playerId);
      if (!player) {
        return "none";
      }

      let maxPartnershipCount = 0;
      let maxOpponentCount = 0;

      // Check against all other players in the group
      players.forEach((otherPlayer) => {
        if (otherPlayer.id === playerId) return;

        // Analyze relationship with this player
        if (player.matchHistory) {
          const partnerships = player.matchHistory.filter(
            (match) => match.partner === otherPlayer.name
          ).length;

          const opponentMatches = player.matchHistory.filter((match) =>
            match.opponents.includes(otherPlayer.name)
          ).length;

          maxPartnershipCount = Math.max(maxPartnershipCount, partnerships);
          maxOpponentCount = Math.max(maxOpponentCount, opponentMatches);
        }
      });

      return getWarningLevel(
        maxPartnershipCount,
        maxOpponentCount,
        maxPartnershipCount,
        maxOpponentCount
      );
    },
    [enableWarnings, maxPartnershipCount, maxOpponentCount]
  );

  // Dismiss a specific warning
  const dismissWarning = useCallback((warningId: string) => {
    setWarnings((prev) => prev.filter((w) => w.id !== warningId));
  }, []);

  // Dismiss all warnings
  const dismissAllWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  // Clear all warnings
  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  // Memoized current warnings (remove old ones)
  const currentWarnings = useMemo(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return warnings.filter((warning) => warning.timestamp > fiveMinutesAgo);
  }, [warnings]);

  return {
    warnings: currentWarnings,
    dismissWarning,
    dismissAllWarnings,
    checkPlayers,
    getPlayerWarningLevel,
    clearWarnings,
  };
};
