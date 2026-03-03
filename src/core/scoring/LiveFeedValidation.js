import { LiveMatchIntegrityService } from './LiveMatchIntegrity';

export class LiveFeedValidationService {
    /** 2️⃣ LIVE BADGE VALIDATION */
    static shouldShowLiveBadge(state) {
        if (state.isMatchCompleted) return false;
        // Innings started if over > 0 or ball > 0 or totalRuns > 0 or wickets > 0
        if (state.over === 0 && state.ball === 0 && state.totalRuns === 0 && state.wickets === 0) return false;
        return true;
    }

    /** 6️⃣ MATCH IN PROGRESS INDICATOR */
    static isMatchInProgress(state) {
        if (state.isMatchCompleted) return false;
        if (LiveFeedValidationService.shouldShowLiveBadge(state) === false) return false;
        if (state.target !== null && state.totalRuns >= state.target) return false;
        return true;
    }

    /** 7️⃣ COMPLETED BADGE */
    static shouldShowCompletedBadge(state) {
        return state.isMatchCompleted;
    }

    /** 9️⃣ MAN OF THE MATCH */
    static shouldShowManOfTheMatch(state, momPlayer) {
        if (!state.isMatchCompleted) return false;
        if (!momPlayer || momPlayer.trim() === '') return false;
        return true;
    }
}

export class SafeScoreFormatter {
    /** 3️⃣ SCORE DISPLAY VALIDATION & FORMATTER */
    static formatScore(state) {
        const totalRuns = state.totalRuns >= 0 ? state.totalRuns : 0;
        const wickets = state.wickets <= 10 ? state.wickets : 10;

        let over = state.over;
        let ball = state.ball;

        if (ball > 5) ball = 5;
        if (ball < 0) ball = 0;

        return `${totalRuns} / ${wickets} (${over}.${ball} Overs)`;
    }
}

export class StrikerIconRenderer {
    /** 1️⃣ Replace striker '*' indicator with 🏏 bat icon. */
    static renderBatterName(state, batterId, batterName) {
        if (state.isMatchCompleted || state.inningsCompleted) return batterName;
        if (state.striker === batterId) {
            return `${batterName} 🏏`;
        }
        return batterName;
    }
}

export class ResultTextGenerator {
    /** 8️⃣ RESULT TEXT VALIDATION */
    static generateResultText(teamARuns, teamBRuns, teamBWickets, maxWickets, isSuperOver = false) {
        if (isSuperOver) {
            return 'WON VIA SUPER OVER';
        }

        if (teamARuns > teamBRuns) {
            const margin = teamARuns - teamBRuns;
            return `WON BY ${margin} RUNS`;
        } else if (teamBRuns > teamARuns) {
            let wicketsRemaining = maxWickets - teamBWickets;
            if (wicketsRemaining < 0) wicketsRemaining = 0;
            return `WON BY ${wicketsRemaining} WICKETS`;
        } else {
            return 'MATCH TIED';
        }
    }
}

export class DataIntegrityValidator {
    /** DATA INTEGRITY CHECK */
    static validateRenderData(session) {
        const state = session.currentState;

        // 1. Validate Total Runs
        const calculatedRuns = LiveMatchIntegrityService.calculateTotalRuns(session);
        if (state.totalRuns !== calculatedRuns) {
            console.error(`CRITICAL INTEGRITY ERROR: displayedTotalRuns (${state.totalRuns}) !== calculatedTotalRunsFromHistory (${calculatedRuns})`);
        }

        // 2. Validate Wickets
        const calculatedWickets = LiveMatchIntegrityService.calculateWickets(session);
        if (state.wickets !== calculatedWickets) {
            console.error(`CRITICAL INTEGRITY ERROR: displayedWickets (${state.wickets}) !== historyWickets (${calculatedWickets})`);
        }

        // 3. Current Batter Validation
        if (!state.isMatchCompleted && !state.inningsCompleted && state.over > 0) {
            if (!state.striker || !state.nonStriker) {
                console.error('CRITICAL INTEGRITY ERROR: Exactly 2 active batters must exist during active innings.');
            }
            if (state.striker === state.nonStriker && state.striker !== '') {
                console.error('CRITICAL INTEGRITY ERROR: Striker and nonStriker are duplicated.');
            }
        }

        // 4. Bowler Validation
        if (!state.isMatchCompleted && !state.inningsCompleted && state.over > 0) {
            if (!state.bowler) {
                console.error('CRITICAL INTEGRITY ERROR: Bowler is missing during active innings.');
            }
        }
    }
}
