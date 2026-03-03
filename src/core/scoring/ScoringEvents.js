export class RunOutDetails {
    constructor({ runsCompleted, isCrossed, isStrikerOut, newBatsmanId }) {
        this.runsCompleted = runsCompleted;
        this.isCrossed = isCrossed;
        this.isStrikerOut = isStrikerOut;
        this.newBatsmanId = newBatsmanId;
    }
}

export class RunOutEvent {
    constructor({ runsCompleted, isCrossed, whoIsOut, ballType, fielder, newBatsman }) {
        this.runsCompleted = runsCompleted;
        this.isCrossed = isCrossed;
        this.whoIsOut = whoIsOut;
        this.ballType = ballType;
        this.fielder = fielder;
        this.newBatsman = newBatsman;
    }
}
