export class ScoringException extends Error {
    constructor(message) {
        super(message);
        this.name = "ScoringException";
    }
}

export class RunOutException extends Error {
    constructor(message) {
        super(message);
        this.name = "RunOutException";
    }
}
