import { ScoringEngine } from './ScoringEngine';

export class MatchSession {
    constructor(currentState, deliveryHistory = []) {
        this.currentState = currentState;
        this.deliveryHistory = deliveryHistory;
    }

    copyWith({ currentState, deliveryHistory }) {
        return new MatchSession(
            currentState !== undefined ? currentState : this.currentState,
            deliveryHistory !== undefined ? deliveryHistory : this.deliveryHistory
        );
    }

    /** 1️⃣ REVERSE LAST ACTION FIX */
    reverseLastAction() {
        if (this.deliveryHistory.length === 0) return this;

        const historyCopy = [...this.deliveryHistory];
        const previousState = historyCopy.pop();

        return this.copyWith({
            currentState: previousState,
            deliveryHistory: historyCopy,
        });
    }

    /** 6️⃣ APPLY DELIVERY */
    applyDelivery(runs, type) {
        const historyCopy = [...this.deliveryHistory];
        historyCopy.push(this.currentState.copyWith());

        const nextState = ScoringEngine.scoreRuns(this.currentState, runs, type);

        return this.copyWith({
            currentState: nextState,
            deliveryHistory: historyCopy,
        });
    }

    /** 3️⃣ OVERTHROW FIX */
    applyOverthrow(extraRuns) {
        const historyCopy = [...this.deliveryHistory];
        historyCopy.push(this.currentState.copyWith());

        const nextState = ScoringEngine.applyOverthrow(this.currentState, extraRuns);

        return this.copyWith({
            currentState: nextState,
            deliveryHistory: historyCopy,
        });
    }

    /** 2️⃣ TEMPORARY PAUSE FIX */
    pauseMatch() {
        return this.copyWith({
            currentState: ScoringEngine.pauseMatch(this.currentState),
        });
    }

    resumeMatch() {
        return this.copyWith({
            currentState: ScoringEngine.resumeMatch(this.currentState),
        });
    }
}
