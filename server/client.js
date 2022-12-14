class Client {
  constructor(socket) {
    this.id =  0;
    this.socket = socket;
    this.avatar = null;
    this.type = null;
    // this.contract = null;
    this.name = null;
    this.playerAddress = null;

    this.ready = false;
    this.isSpy = false;
    this.voted = false;
  }

  joinRoom(id) {
    this.socket.join(id);
  }

  send(type, data) {
    data.type = type;
    this.socket.send(data);
  }
}

module.exports = Client;
