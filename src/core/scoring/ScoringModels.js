export class Player {
    constructor({ id, name, role, isActive = true }) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.isActive = isActive;
    }
}

export class Team {
    constructor({ id, name, playingXI = [] }) {
        this.id = id;
        this.name = name;
        this.playingXI = playingXI; // Array of Player
    }
}
