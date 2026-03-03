import { DeliveryType, WicketType } from './ScoringEnums';
import { ScoringException } from './Exceptions';

export class ValidationService {
    /**
     * 13. MATCH STATE VALIDATION & 9. TEMPORARY PAUSE VALIDATION
     */
    static validateCanScore(state) {
        if (state.isPaused) {
            throw new ScoringException('Match is paused. Cannot process actions.');
        }
        if (state.isMatchCompleted) {
            throw new ScoringException('Match is completed. Cannot process actions.');
        }
        if (state.inningsCompleted) {
            throw new ScoringException('Innings is completed. Cannot process actions.');
        }
        if (state.target !== null && state.totalRuns >= state.target) {
            throw new ScoringException('Target achieved. Match should be marked complete.');
        }
        if (state.wickets >= 10) {
            throw new ScoringException('10 wickets have already fallen.');
        }
    }

    /**
     * 4. WICKET LOGIC & 🎯 CRITICAL VALIDATION LIST
     */
    static validateWicket(state, type) {
        ValidationService.validateCanScore(state);

        if (state.isFreeHit) {
            if (type !== WicketType.RUN_OUT) {
                throw new ScoringException('On a Free Hit, only a Run Out is permitted.');
            }
        }
    }

    /**
     * 11. BOWLER CHANGE VALIDATION
     */
    static validateBowlerChange(state, isInjury = false) {
        if (state.isMatchCompleted || state.inningsCompleted) {
            throw new ScoringException('Cannot change bowler. Innings is complete.');
        }

        // Allow bowler change only at over completion OR if bowler injured/retired.
        if (state.ball !== 0 && !isInjury) {
            throw new ScoringException('Cannot change bowler mid-over unless due to injury.');
        }
    }

    /**
     * 6. LEG BYE / BYE VALIDATION
     */
    static validateByeOrLegBye(state, type) {
        if (type === DeliveryType.NO_BALL || type === DeliveryType.WIDE) {
            throw new ScoringException('Cannot combine Leg Bye/Bye with Wide or No Ball delivery type.');
        }
    }

    /**
     * 12. RETIRE BATTER
     */
    static validateBatterRetire(state, batterId, wicketFallenOnBall = false) {
        if (state.striker !== batterId && state.nonStriker !== batterId) {
            throw new ScoringException('Player is neither the striker nor non-striker.');
        }
        if (wicketFallenOnBall) {
            throw new ScoringException('Cannot retire if a wicket has already fallen on this delivery.');
        }
    }

    /**
     * 8. DLS BUTTON VALIDATION
     */
    static validateDLSAccess(state, rainInterruptionFlagged, oversReduced) {
        if (!state.isPaused) {
            throw new ScoringException('DLS can only be evaluated when the match is paused.');
        }
        if (!rainInterruptionFlagged) {
            throw new ScoringException('DLS requires a rain interruption flag.');
        }
        if (!oversReduced) {
            throw new ScoringException('DLS requires overs to be reduced to activate.');
        }
    }

    /**
     * 10. STRIKE CHANGE RULES
     */
    static validateManualStrikeChange(state, isMidDelivery) {
        if (state.isPaused) {
            throw new ScoringException('Match is paused. Cannot change strike manually.');
        }
        if (isMidDelivery) {
            throw new ScoringException('Cannot manually change strike before the delivery is registered.');
        }
    }

    /**
     * 3. OVERTHROW VALIDATION FIX
     */
    static validateOverthrow(state) {
        if (state.isPaused) {
            throw new ScoringException('Match is paused. Cannot process overthrow.');
        }
        if (state.inningsCompleted) {
            throw new ScoringException('Innings is completed. Cannot process overthrow.');
        }
        if (state.lastDeliveryType === null) {
            throw new ScoringException('No last delivery found. Overthrow cannot exist independently.');
        }
    }
}
