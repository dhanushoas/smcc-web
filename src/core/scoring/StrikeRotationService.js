export class StrikeRotationService {
    /**
     * 10. STRIKE CHANGE RULES
     * Auto changes strike based on completed physical runs.
     */
    static evaluateStrikeRotation(currentState, runsCompleted, forceSwap = false) {
        let nextState = currentState.copyWith();
        let shouldSwap = forceSwap;

        // "Auto change strike if: 1 run, 3 runs, 5 runs"
        if (!forceSwap && runsCompleted > 0 && runsCompleted % 2 !== 0) {
            shouldSwap = true;
        }

        if (shouldSwap) {
            nextState = StrikeRotationService.swapStrike(nextState);
        }

        return nextState;
    }

    /**
     * Automatically swap strike. E.g., at end of over.
     */
    static swapStrike(currentState) {
        const nextState = currentState.copyWith();
        const temp = nextState.striker;
        nextState.striker = nextState.nonStriker;
        nextState.nonStriker = temp;
        return nextState;
    }
}
