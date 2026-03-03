import { LiveMatchIntegrityService } from './LiveMatchIntegrity';

export const AdminRole = {
    UMPIRE: 'UMPIRE',
    SCORER: 'SCORER',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN'
};

export class CorrectionAuditLog {
    constructor(action, details, timestamp = new Date().toISOString()) {
        this.action = action;
        this.details = details;
        this.timestamp = timestamp;
    }
}

export class AdvancedCorrectionValidator {
    static validateSuperAdmin(role) {
        if (role !== AdminRole.SUPER_ADMIN) {
            throw new Error(`Access Denied: Advanced corrections require ${AdminRole.SUPER_ADMIN} role.`);
        }
    }

    static validateRuns(runs) {
        if (!Number.isInteger(runs) || runs < 0 || runs > 999) {
            throw new Error("Runs must be an integer between 0 and 999.");
        }
    }

    static validateWickets(wickets, dismissedPlayersCount = 0) {
        if (!Number.isInteger(wickets) || wickets < 0 || wickets > 10) {
            throw new Error("Wickets must be between 0 and 10.");
        }
        if (wickets < dismissedPlayersCount) {
            throw new Error("Wickets cannot be less than the number of recorded dismissed players.");
        }
    }

    static validateOvers(over, ball, maxOvers) {
        if (!Number.isInteger(over) || !Number.isInteger(ball)) {
            throw new Error("Over and ball must be integers. Do not use floating point math.");
        }
        if (ball < 0 || ball > 5) {
            throw new Error("Ball must be between 0 and 5.");
        }
        if (over > maxOvers || (over === maxOvers && ball > 0)) {
            throw new Error(`Total overs cannot exceed match limit of ${maxOvers}.`);
        }
    }

    static validateText(text, minLength = 0, maxLength = 100, fieldName = "Text") {
        if (!text || typeof text !== 'string') throw new Error(`${fieldName} cannot be empty.`);
        const stripped = text.replace(/(<([^>]+)>)/gi, "").trim(); // Strip HTML
        if (stripped.length < minLength || stripped.length > maxLength) {
            throw new Error(`${fieldName} length must be between ${minLength} and ${maxLength} characters.`);
        }
        return stripped;
    }

    static validateBatters(striker, nonStriker, battingTeamPlayers) {
        if (!striker || !nonStriker) throw new Error("Striker and Non-Striker are required.");
        if (striker === nonStriker) throw new Error("Striker and Non-Striker cannot be the same player.");

        const validIds = battingTeamPlayers.map(p => p.id || p.name || p);
        if (!validIds.includes(striker) || !validIds.includes(nonStriker)) {
            throw new Error("Batters must belong to the active batting team squad.");
        }
    }

    static validateBowler(bowler, bowlingTeamPlayers) {
        if (!bowler) throw new Error("Bowler is required.");
        const validIds = bowlingTeamPlayers.map(p => p.id || p.name || p);
        if (!validIds.includes(bowler)) {
            throw new Error("Bowler must belong to the active bowling team squad.");
        }
    }

    static validatePOTM(potm, isCompleted) {
        if (!isCompleted) throw new Error("Player of the Match can only be selected after match completion.");
    }

    static validateDateTime(dateStr, timeStr) {
        if (!timeStr.match(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s(AM|PM)$/i)) {
            throw new Error("Time must be in 12-hour format (hh:mm AM/PM).");
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) throw new Error("Invalid Date format.");
    }
}

export class AdvancedCorrectionService {
    constructor(session, adminRole, auditLogs = []) {
        AdvancedCorrectionValidator.validateSuperAdmin(adminRole);
        this.session = session;
        this.auditLogs = auditLogs;
    }

    _logAction(action, details) {
        const log = new CorrectionAuditLog(action, details);
        this.auditLogs.push(log);
        console.warn(`[AUDIT_LOG] ${log.timestamp} | ${log.action}: ${log.details}`);
    }

    _recalculateAndSync() {
        // Calculate Runs, Wickets, from actual events vs current state
        const historyRuns = LiveMatchIntegrityService.calculateTotalRuns(this.session);
        const historyWickets = LiveMatchIntegrityService.calculateWickets(this.session);

        if (this.session.currentState.totalRuns !== historyRuns) {
            console.error(`CRITICAL: Overridden totalRuns (${this.session.currentState.totalRuns}) decoupled from mathematical history (${historyRuns}). SUPER ADMIN Overrided.`);
        }
        if (this.session.currentState.wickets !== historyWickets) {
            console.error(`CRITICAL: Overridden wickets (${this.session.currentState.wickets}) decoupled from mathematical history (${historyWickets}). SUPER ADMIN Overrided.`);
        }
    }

    overrideScore(newRuns, newWickets, newOver, newBall, totalOversLimit = 20) {
        AdvancedCorrectionValidator.validateRuns(newRuns);
        AdvancedCorrectionValidator.validateWickets(newWickets);
        AdvancedCorrectionValidator.validateOvers(newOver, newBall, totalOversLimit);

        let newState = this.session.currentState.copyWith({
            totalRuns: newRuns,
            wickets: newWickets,
            over: newOver,
            ball: newBall
        });

        if (newWickets === 10) {
            newState = newState.copyWith({ inningsCompleted: true });
        }

        this.session.currentState = newState;
        this._logAction('OVERRIDE_SCORE', `Runs: ${newRuns}, Wickets: ${newWickets}, Overs: ${newOver}.${newBall}`);
        this._recalculateAndSync();
        return this.session;
    }

    overrideActivePlayers(striker, nonStriker, bowler, batSquad, bowlSquad) {
        AdvancedCorrectionValidator.validateBatters(striker, nonStriker, batSquad);
        AdvancedCorrectionValidator.validateBowler(bowler, bowlSquad);

        this.session.currentState = this.session.currentState.copyWith({
            striker,
            nonStriker,
            bowler
        });

        this._logAction('OVERRIDE_PLAYERS', `Striker: ${striker}, NonStriker: ${nonStriker}, Bowler: ${bowler}`);
        this._recalculateAndSync();
        return this.session;
    }

    overridePOTM(potm) {
        AdvancedCorrectionValidator.validatePOTM(potm, this.session.currentState.isMatchCompleted);
        this._logAction('OVERRIDE_POTM', `POTM set to ${potm}`);
        return this.session;
    }

    forceEndInnings() {
        this.session.currentState = this.session.currentState.copyWith({
            inningsCompleted: true
        });
        this._logAction('FORCE_END_INNINGS', 'Admin forced end of innings.');
        return this.session;
    }

    clearCurrentOverLog() {
        const currentOverNum = this.session.currentState.over;

        // Remove exactly 1 over's worth of event balls by popping until we hit the last over decrement
        for (let i = 0; i < 6; i++) {
            if (this.session.eventHistory.length > 0) {
                this.session.eventHistory.pop();
            }
        }

        this._logAction('CLEAR_OVER_LOG', `Admin stripped recent ball history logs for Over ${currentOverNum}`);
        this._recalculateAndSync();
        return this.session;
    }

    purgeAllHistory(adminPassword) {
        if (adminPassword !== "CONFIRM_PURGE") {
            throw new Error("Invalid admin password for purge operation.");
        }

        this.session.eventHistory = [];
        this.session.deliveryHistory = [];
        this.session.currentState = this.session.currentState.copyWith({
            totalRuns: 0,
            wickets: 0,
            over: 0,
            ball: 0,
            inningsCompleted: false,
            isMatchCompleted: false
        });

        this._logAction('PURGE_ALL_HISTORY', 'COMPLETE MATCH STATE PURGED BY SUPER ADMIN');
        this._recalculateAndSync();
        return this.session;
    }
}
