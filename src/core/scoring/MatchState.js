export class MatchState {
    constructor(data = {}) {
        this.over = data.over || 0;
        this.ball = data.ball || 0;
        this.totalRuns = data.totalRuns || 0;
        this.wickets = data.wickets || 0;
        this.striker = data.striker || '';
        this.nonStriker = data.nonStriker || '';
        this.bowler = data.bowler || '';
        this.isFreeHit = data.isFreeHit || false;
        this.isPaused = data.isPaused || false;
        this.isMatchCompleted = data.isMatchCompleted || false;
        this.inningsCompleted = data.inningsCompleted || false;
        this.lastDeliveryType = data.lastDeliveryType || null;
        this.target = data.target || null;
        this.oversLimit = data.oversLimit || 20;

        // Teams
        this.battingTeam = data.battingTeam || null;
        this.bowlingTeam = data.bowlingTeam || null;

        // Internal state tracking
        this.isOverthrow = data.isOverthrow || false;
        this.lastDeliveryRuns = data.lastDeliveryRuns || 0;
    }

    copyWith(overrides = {}) {
        return new MatchState({ ...this, ...overrides });
    }

    get currentRunRate() {
        if (this.over === 0 && this.ball === 0) return 0.0;
        const oversBowled = this.over + (this.ball / 6.0);
        return this.totalRuns / oversBowled;
    }

    get requiredRunRate() {
        if (this.target === null) return null;
        const runsNeeded = this.target - this.totalRuns;
        if (runsNeeded <= 0) return 0.0;

        const totalBalls = this.oversLimit * 6;
        const ballsBowled = (this.over * 6) + this.ball;
        const ballsRemaining = totalBalls - ballsBowled;

        if (ballsRemaining <= 0) return null;

        return (runsNeeded / ballsRemaining) * 6.0;
    }

    get matchStatusTag() {
        if (this.isMatchCompleted) return 'COMPLETED';
        if (this.over === 0 && this.ball === 0 && this.totalRuns === 0 && this.wickets === 0) return 'UPCOMING';
        return 'LIVE';
    }
}
