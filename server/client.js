class Client {
  constructor(socket) {
    this.socket = socket;
    this.avatar = null;
    this.type = null;
    this.name = null;
    this.ready = false;
  }

  joinRoom(id,ctc,wager) {
    this.socket.join(id,ctc,wager);
  }

  send(type, data) {
    data.type = type;
    this.socket.send(data);
  }
}

module.exports = Client;
