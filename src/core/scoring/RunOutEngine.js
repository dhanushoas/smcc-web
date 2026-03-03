import { DeliveryType, WhoIsOut } from './ScoringEnums';
import { RunOutException } from './Exceptions';

export class RunOutEngine {
    /**
     * 1. Complete algorithm function
     */
    static processRunOut(currentState, event) {
        RunOutEngine._validateEvent(currentState, event);

        let nextState = currentState.copyWith();

        let extraRuns = 0;
        let isLegalDelivery = false;

        switch (event.ballType) {
            case DeliveryType.WIDE:
            case DeliveryType.NO_BALL:
                extraRuns = 1;
                isLegalDelivery = false;
                break;
            case DeliveryType.NORMAL:
            case DeliveryType.BYE:
            case DeliveryType.LEG_BYE:
                isLegalDelivery = true;
                break;
        }

        nextState.totalRuns += event.runsCompleted + extraRuns;
        nextState.lastDeliveryType = event.ballType;

        if (nextState.isFreeHit) {
            if (event.ballType === DeliveryType.NORMAL ||
                event.ballType === DeliveryType.BYE ||
                event.ballType === DeliveryType.LEG_BYE) {
                nextState.isFreeHit = false;
            }
        } else {
            if (event.ballType === DeliveryType.NO_BALL) {
                nextState.isFreeHit = true;
            }
        }

        let overCompleted = false;
        if (isLegalDelivery) {
            nextState.ball += 1;
            if (nextState.ball === 6) {
                overCompleted = true;
                nextState.ball = 0;
                nextState.over += 1;
            }
        }

        nextState.wickets += 1;
        if (nextState.wickets === 10) {
            nextState.inningsCompleted = true;
        }

        const provisionalStrikeSwap = (event.runsCompleted % 2 !== 0);

        let survivor;
        if (event.whoIsOut === WhoIsOut.STRIKER) {
            survivor = currentState.nonStriker;
        } else {
            survivor = currentState.striker;
        }

        let survivorAtStrikerEndProvisional = false;

        if (event.whoIsOut === WhoIsOut.STRIKER) {
            survivorAtStrikerEndProvisional = provisionalStrikeSwap;
        } else {
            survivorAtStrikerEndProvisional = !provisionalStrikeSwap;
        }

        if (event.isCrossed) {
            survivorAtStrikerEndProvisional = !survivorAtStrikerEndProvisional;
        }

        if (survivorAtStrikerEndProvisional) {
            nextState.striker = survivor;
            nextState.nonStriker = event.newBatsman;
        } else {
            nextState.striker = event.newBatsman;
            nextState.nonStriker = survivor;
        }

        if (overCompleted) {
            const temp = nextState.striker;
            nextState.striker = nextState.nonStriker;
            nextState.nonStriker = temp;
        }

        return nextState;
    }

    /**
     * 2. Validation function
     */
    static _validateEvent(state, event) {
        if (state.isPaused) throw new RunOutException('Match is paused. Cannot process run out.');
        if (state.isMatchCompleted) throw new RunOutException('Match is completed. Cannot process run out.');
        if (state.inningsCompleted) throw new RunOutException('Innings is completed. Cannot process run out.');
        if (state.wickets >= 10) throw new RunOutException('Team is already all out (10 wickets).');
        if (!event.fielder || event.fielder.trim() === '') throw new RunOutException('Fielder is required for a run out.');
        if (event.runsCompleted < 0) throw new RunOutException('Runs completed cannot be negative.');
        // Optional requirement constraint
        if (event.runsCompleted > 4) throw new RunOutException('Runs completed exceeds realistic boundary (max 4).');
        if (event.runsCompleted === 0 && event.isCrossed) throw new RunOutException('Cannot cross if 0 runs have been completed. (Invalid case: 0 runs + crossed true)');
        if (!event.newBatsman || event.newBatsman.trim() === '') throw new RunOutException('New batsman must be identified.');
    }
}
