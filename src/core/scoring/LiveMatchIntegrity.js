import { DeliveryType } from './ScoringEnums';

export class LiveMatchIntegrityService {
    /**
     * 6️⃣ SAFE OVER/BALL FORMATTER
     */
    static formatOvers(over, ball) {
        if (ball < 0 || ball > 5) {
            throw new Error('Integrity Error: Ball must be strictly between 0 and 5.');
        }
        return `${over}.${ball} Overs`;
    }

    /**
     * 5️⃣ LAST BALL EVENTS VALIDATION
     */
    static getLastOverEvents(session) {
        const timeline = [];
        let legalCount = 0;

        for (let i = session.eventHistory.length - 1; i >= 0; i--) {
            const event = session.eventHistory[i];
            timeline.unshift(event.type);

            if (event.type === DeliveryType.NORMAL ||
                event.type === DeliveryType.BYE ||
                event.type === DeliveryType.LEG_BYE) {
                legalCount++;
            }

            if (legalCount >= 6) {
                break;
            }
        }
        return timeline;
    }

    /**
     * 1️⃣ SCORE VALIDATION (Calculate from true history)
     */
    static calculateTotalRuns(session) {
        let total = 0;
        for (const event of session.eventHistory) {
            total += event.totalRuns;
        }
        return total;
    }

    static calculateWickets(session) {
        let w = 0;
        for (const event of session.eventHistory) {
            if (event.isWicket) w += 1;
        }
        return w;
    }

    /**
     * 7️⃣ DATA CONSISTENCY CHECK
     */
    static validateLivePage(session) {
        const state = session.currentState;

        LiveMatchIntegrityService.validateTotalRuns(session);

        if (state.ball < 0 || state.ball > 5) {
            console.error('Integrity Error: Ball count out of bounds.');
        }
        if (state.wickets > 10) {
            console.error('Integrity Error: Wickets logically cannot exceed 10.');
        }

        const status = state.matchStatusTag;
        if (status !== 'UPCOMING' && status !== 'LIVE' && status !== 'COMPLETED') {
            console.error('Integrity Error: Invalid match status tag.');
        }

        if (status === 'LIVE') {
            if (!state.striker || !state.nonStriker) {
                console.error('Integrity Error: Exactly 2 active batters must exist during a live match.');
            }
            if (state.striker === state.nonStriker && state.striker !== '') {
                console.error('Integrity Error: Striker and nonStriker are duplicated to the same player.');
            }
            if (!state.bowler) {
                console.error('Integrity Error: Bowler is missing during a live match.');
            }
        }
    }

    static validateTotalRuns(session) {
        const calculatedRuns = LiveMatchIntegrityService.calculateTotalRuns(session);
        if (session.currentState.totalRuns !== calculatedRuns) {
            console.error(`CRITICAL INTEGRITY ERROR: displayedTotalRuns (${session.currentState.totalRuns}) !== calculatedTotalRunsFromHistory (${calculatedRuns})`);
        }

        const calculatedWickets = LiveMatchIntegrityService.calculateWickets(session);
        if (session.currentState.wickets !== calculatedWickets) {
            console.error(`CRITICAL INTEGRITY ERROR: displayedWickets (${session.currentState.wickets}) !== historyWickets (${calculatedWickets})`);
        }

        if (session.currentState.totalRuns < 0) {
            console.error('CRITICAL INTEGRITY ERROR: Total runs logically cannot be negative.');
        }
    }
}
