import { DeliveryType, WicketType } from './ScoringEnums';
import { ValidationService } from './ValidationService';
import { FreeHitStateMachine } from './FreeHitStateMachine';
import { StrikeRotationService } from './StrikeRotationService';

export class ScoringEngine {
    /**
     * Core Facade for Scoring Runs
     */
    static scoreRuns(currentState, runs, type) {
        ValidationService.validateCanScore(currentState);

        if (type === DeliveryType.BYE || type === DeliveryType.LEG_BYE) {
            ValidationService.validateByeOrLegBye(currentState, type);
        }

        let nextState = currentState.copyWith({
            lastDeliveryType: type,
            lastDeliveryRuns: runs,
        });

        let extras = 0;
        let isLegal = false;

        switch (type) {
            case DeliveryType.NORMAL:
            case DeliveryType.BYE:
            case DeliveryType.LEG_BYE:
                isLegal = true;
                break;
            case DeliveryType.WIDE:
            case DeliveryType.NO_BALL:
                extras += 1;
                isLegal = false;
                break;
            case DeliveryType.PENALTY:
                isLegal = false;
                break;
        }

        nextState = nextState.copyWith({
            totalRuns: nextState.totalRuns + runs + extras,
        });

        const nextFreeHit = FreeHitStateMachine.getNextFreeHitState(currentState.isFreeHit, type);
        nextState = nextState.copyWith({ isFreeHit: nextFreeHit });

        let overCompleted = false;

        if (isLegal) {
            let targetBall = nextState.ball + 1;

            if (targetBall === 6) {
                targetBall = 0;
                overCompleted = true;
                nextState = nextState.copyWith({
                    ball: targetBall,
                    over: nextState.over + 1,
                });
            } else {
                nextState = nextState.copyWith({ ball: targetBall });
            }
        }

        nextState = StrikeRotationService.evaluateStrikeRotation(nextState, runs);

        if (overCompleted) {
            nextState = StrikeRotationService.swapStrike(nextState);
        }

        return nextState;
    }

    /**
     * Core Facade for Wickets
     */
    static recordWicket(currentState, type, runOut = null, currentDeliveryType = DeliveryType.NORMAL) {
        ValidationService.validateWicket(currentState, type);

        let nextState = currentState.copyWith({
            lastDeliveryType: currentDeliveryType,
        });

        if (type === WicketType.RUN_OUT && runOut !== null) {
            nextState = nextState.copyWith({ totalRuns: nextState.totalRuns + runOut.runsCompleted });

            let survivorAtStrikerEnd = (runOut.runsCompleted % 2 !== 0);
            if (runOut.isCrossed) survivorAtStrikerEnd = !survivorAtStrikerEnd;

            const survivor = runOut.isStrikerOut ? nextState.nonStriker : nextState.striker;

            if (survivorAtStrikerEnd) {
                nextState = nextState.copyWith({ striker: survivor, nonStriker: runOut.newBatsmanId });
            } else {
                nextState = nextState.copyWith({ striker: runOut.newBatsmanId, nonStriker: survivor });
            }
        } else {
            if (type !== WicketType.RETIRED) {
                nextState = nextState.copyWith({ striker: 'Pending Batsman' });
            }
        }

        nextState = nextState.copyWith({ wickets: nextState.wickets + 1 });

        if (nextState.wickets >= 10) {
            nextState = nextState.copyWith({ inningsCompleted: true });
        }

        const nextFreeHit = FreeHitStateMachine.getNextFreeHitState(currentState.isFreeHit, currentDeliveryType);
        nextState = nextState.copyWith({ isFreeHit: nextFreeHit });

        const isLegal = (currentDeliveryType !== DeliveryType.WIDE && currentDeliveryType !== DeliveryType.NO_BALL);

        if (isLegal) {
            let targetBall = nextState.ball + 1;
            if (targetBall === 6) {
                targetBall = 0;
                nextState = nextState.copyWith({
                    ball: targetBall,
                    over: nextState.over + 1,
                });
                nextState = StrikeRotationService.swapStrike(nextState);
            } else {
                nextState = nextState.copyWith({ ball: targetBall });
            }
        }

        return nextState;
    }

    static changeBowler(currentState, newBowler, isInjury = false) {
        ValidationService.validateBowlerChange(currentState, isInjury);
        return currentState.copyWith({ bowler: newBowler });
    }

    static retireBatter(currentState, batterId, wicketFallenOnBall = false) {
        ValidationService.validateBatterRetire(currentState, batterId, wicketFallenOnBall);
        return ScoringEngine.recordWicket(currentState, WicketType.RETIRED);
    }

    static applyOverthrow(currentState, overthrowRuns) {
        ValidationService.validateCanScore(currentState);
        ValidationService.validateOverthrow(currentState);

        let nextState = currentState.copyWith({
            totalRuns: currentState.totalRuns + overthrowRuns,
        });

        if (overthrowRuns % 2 !== 0) {
            nextState = StrikeRotationService.swapStrike(nextState);
        }

        return nextState;
    }

    static pauseMatch(currentState) {
        return currentState.copyWith({ isPaused: true });
    }

    static resumeMatch(currentState) {
        return currentState.copyWith({ isPaused: false });
    }
}
