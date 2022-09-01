class Session {
  constructor(id, io, ctc, wager, numPlayers, rounds, timer,gameCtc, events) {
    this.id = id; 
    this.ctc = ctc; 
    this.wager = wager; 
    this.numPlayers = numPlayers; 
    this.io = io; 
    this.rounds = rounds; // Game logic
    this.timer = timer; // Game logic ...overlook
    this.gameCtc = gameCtc;
    this.events = events;

    this.clients = new Set();
    this.avatars = [
      "🐱",
      "🐶",
      "🦊",
      "🐭",
      "🐼",
      "🐧",
      "🐰",
      "🐯",
      "🦖",
      "🦉",
      "🐻",
      "🐠",
      "🦩",
      "🐢",
      "🐬",
      "🦆",
    ];

    this.currentLocation = undefined;
    this.spyId = undefined;
    this.winners = [];
  }

  //can be used to add multiple winners
  addWinner(winner) {
    this.winners.push(winner);
  }

  setLocationandSpy(location, spy) {
    this.currentLocation = location;
    this.spyId = spy;
  }

  join(client) {
    if (this.clients.has(client)) {
      console.log("Error: Client already in session");
      return false;
    }

    if (this.clients.size === this.numPlayers && this.avatars.length === 0) {
      console.error("The game is full or server is past client limit");
      return false;
    }

    this.clients.add(client);
    // Join the socket.io room
    client.joinRoom(this.id);

    const avatar = this.avatars.shift();
    client.avatar = avatar;
    client.name = `${avatar} ${client.name}`;

    client.send("session-created", {
      sessionId: this.id,
      sessionCtc: this.ctc,
      sessionWager: this.wager,
      sessionNumP: this.numPlayers,
      sessionRounds: this.rounds
    });
    return true;
  }

  async setCtc(ctc){
    this.ctc = ctc
  }

  leave(client) {
    this.clients.delete(client);
    this.avatars.push(client.avatar);
  }

  broadcast(type, data) {
    data.type = type;
    this.io.to(this.id).send(data);
  }

  broadcastPeers() {
    const clientsArray = Array.from(this.clients);
    const payload = {
      type: "session-broadcast",
      sessionId: this.id,
      peers: {
        clients: clientsArray.map((cli) => {
          return {
            id: cli.id,
            name: cli.name,
            ready: cli.ready,
          };
        }),
      },
    };
    this.io.to(this.id).send(payload);
  }

  reach() {

  }
}

module.exports = Session;
