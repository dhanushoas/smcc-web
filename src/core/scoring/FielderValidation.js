import { WicketType, PlayerRole } from './ScoringEnums';
import { ScoringException } from './Exceptions';

export class FielderValidationException extends Error {
    constructor(message) {
        super(message);
        this.name = "FielderValidationException";
    }
}

export class FielderValidationService {
    /**
     * 1. FIELDER DROPDOWN SOURCE
     * Returns an array of valid active fielders from the bowling team.
     */
    static getAvailableFielders(matchState) {
        if (!matchState.bowlingTeam || !Array.isArray(matchState.bowlingTeam.playingXI)) {
            return [];
        }

        // Show ONLY bowlingTeam.playingXI where player.isActive == true
        // Automatically excludes batting team, substituted, or retired players
        return matchState.bowlingTeam.playingXI.filter(player => player.isActive === true);
    }

    /**
     * 2. WICKET TYPE VALIDATION & 3. VALIDATION RULES
     */
    static validateWicketFielders(
        matchState,
        wicketType,
        primaryFielder,
        assistFielder = null,
        isDirectHit = false
    ) {
        const availableFielders = FielderValidationService.getAvailableFielders(matchState);

        const isValidFielder = (player) => {
            if (!player || !player.id) return false;
            return availableFielders.some(f => f.id === player.id);
        };

        switch (wicketType) {
            case WicketType.BOWLED:
            case WicketType.LBW:
            case WicketType.HIT_WICKET:
            case WicketType.RETIRED:
                // D. BOWLED (and similar unassisted dismissals): Disable fielder field. No fielder required.
                break;

            case WicketType.CAUGHT:
                // B. CAUGHT: Fielder is mandatory. Show all bowling team players.
                if (!primaryFielder) {
                    throw new FielderValidationException('A catcher (fielder) is mandatory for a Caught dismissal.');
                }
                if (!isValidFielder(primaryFielder)) {
                    throw new FielderValidationException('Selected catcher must be an active player in the bowling team.');
                }
                break;

            case WicketType.STUMPED:
                // C. STUMPED: Fielder mandatory. Any player can keep wickets (relaxed).
                if (!primaryFielder) {
                    throw new FielderValidationException('A defined fielder is mandatory for a Stumped dismissal.');
                }
                if (!isValidFielder(primaryFielder)) {
                    throw new FielderValidationException('Selected fielder must be an active player in the bowling team.');
                }
                break;

            case WicketType.RUN_OUT:
                // A. RUN OUT: Fielder mandatory, keeper included.
                if (!primaryFielder) {
                    throw new FielderValidationException('A primary fielder is mandatory for a Run Out dismissal.');
                }
                if (!isValidFielder(primaryFielder)) {
                    throw new FielderValidationException('Selected primary fielder must be an active player in the bowling team.');
                }

                if (isDirectHit) {
                    // If Direct Hit == true: Only one fielder required. Disable assist fielder.
                    if (assistFielder) {
                        throw new FielderValidationException('Assist fielder cannot be selected when Direct Hit is true.');
                    }
                } else {
                    // If Direct Hit == false: Allow optional assist fielder
                    if (assistFielder) {
                        if (!isValidFielder(assistFielder)) {
                            throw new FielderValidationException('Selected assist fielder must be an active player in the bowling team.');
                        }
                        if (assistFielder.id === primaryFielder.id) {
                            throw new FielderValidationException('Assist fielder cannot be the same as the primary fielder.');
                        }
                    }
                }
                break;

            default:
                break;
        }
    }
}
