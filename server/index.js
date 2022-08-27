const Session = require("./session");
const Client = require("./client");
const SpyGame = require("./spy");

const http = require("http").createServer();

const corsOptions = {
  cors: {
    origin: [
      "https://spyfall-reach.herokuapp.com",
    ],
    methods: ["GET", "POST"],
  },
};

const nodeEnv = process.env.NODE_ENV;
console.log(`NODE_ENV=${nodeEnv}`);

const localFrontEnd = "http://localhost:3000";
if (nodeEnv === "dev") {
  console.log(`Allowing cors for ${localFrontEnd}`);
  corsOptions.cors.origin.push(localFrontEnd);
}

// socket.io
const io = require("socket.io")(http, corsOptions);
const sessions = new Map();

function createId(len = 8, chars = "ABCDEFGHJKMNPQRSTWXYZ23456789") {
  let id = "";
  for (let i = 0; i < len; i++) {
    id += chars[(Math.random() * chars.length) | 0];
  }
  return id;
}

function createClient(socket) {
  return new Client(socket);
}

function createSession( wager, numPlayers, rounds, id = createId(5), ctc = null ) {
  if (sessions.has(id)) {
    console.error(`Session ${id} already exists`);
    return null;
  }
  const session = new Session(id, io, ctc, wager, numPlayers, rounds);
  sessions.set(id, session);
  return session;
}

function getSession(id) {
  return sessions.get(id);
}

io.on("connection", (socket) => {
  const client = createClient(socket);
  let session;

  socket.on("join-session", (data) => {
    if (session) {
      leaveSession(session, client);
    }
    if (data.sessionId) {
      session = getSession(data.sessionId) || createSession(data.sessionWager,data.sessionNumP,data.sessionRounds,data.sessionId);
    } else {
      session = createSession(data.sessionWager,data.sessionNumP,data.sessionRounds);
    }
    const sessionData = {
      sessionId: session.id,
      sessionCtc: session.ctc,
      sessionWager: session.wager,
      sessionNumP: session.numPlayers,
      sessionRounds: session.rounds 
    }
    client.send("session-created", sessionData);
    if (session) {
      console.log("Created session:", sessionData);
      client.name = data.playerName;
      if (session.join(client)) {
        session.broadcastPeers();
      } else {
        socket.disconnect();
      }
    }
  });

  socket.on("chat-event", (data) => {
    if (!session) {
      socket.disconnect();
    } else {
      // TODO only broadcast to other clients
      session.broadcast("chat-event", {
        id: client.id,
        author: client.name,
        message: data.message,
      });
    }
  });

  socket.on("player-ready", (data) => {
    if (!session) {
      socket.disconnect();
    } else {
      client.ready = data.ready;
      session.broadcastPeers();
    }
  });

  socket.on("start-game", () => {
    if (!session) {
      socket.disconnect();
    } else {
      const allReady = Array.from(session.clients).reduce(
        (acc, cli) => acc && cli.ready,
        true
      );
      if (allReady) {
        SpyGame.startGame(session);
      } else {
        client.send("chat-event", {
          message: "All players must be ready",
          color: "red",
        });
      }
    }
  });

  socket.on("disconnect", () => {
    leaveSession(session, client);
  });
});

function leaveSession(session, client) {
  if (session) {
    session.leave(client);
    if (session.clients.size === 0) {
      sessions.delete(session.id);
      console.log("Sessions remaining:", sessions.size);
    } else {
      session.broadcastPeers();
    }
  }
}

const defaultPort = 8081;
const actualPort = process.env.PORT || defaultPort;
http.listen(actualPort, () => {
  console.log(`Listening for requests on http://localhost:${actualPort}`);
});
