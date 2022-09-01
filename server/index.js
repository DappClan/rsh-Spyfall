const Session = require("./session");
const Client = require("./client");
// const SpyGame = require("./spy");

const http = require("http").createServer();

const corsOptions = {
  cors: {
    origin: [
      "https://spyfall-reach.vercel.app",
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

    if(data.playerType == 'Admin') {
      session = createSession(data.sessionWager,data.sessionNumP,data.sessionRounds);
    } else if (data.playerType === 'Player'){
      session = getSession(data.sessionId)
    }
    const sessionData = {
      sessionId: session.id,
      sessionCtc: session.ctc,
      sessionWager: session.wager,
      sessionNumP: session.numPlayers,
      sessionRounds: session.rounds,
      sessionEvents: session.events,
      sessionGameCtc: session.gameCtc,
      participants: session.participants,
      playerType: data.playerType,
      playerContract: data.playerContract,
    }
    try{
      client.send("session-created", sessionData);
    } catch(e) {
      console.log([`error:`, e])
    }
    if (session) {
      client.id = data.participants;
      client.name = data.playerName;
      client.type = data.playerType;
      client.contract = data.playerContract;
      if (session.join(client)) {
        session.broadcastPeers();
      } else {
        socket.disconnect();
      }
    }
  });

  socket.on("set-ctc", async (data) => {
    if(!session) {
      session.disconnect();
    } else {
      if(!session.ctc) {
        await session.setCtc(data.ctc)
      }
    }
  })
  // Each Player
  socket.on("set-player-ctc", async (data) => {
    if(!session) {
      session.disconnect()
    } else {
      if(!client.contract) {
        client.contract = data.playerContract;
      }
    }
  })
  // On admin 
  socket.on("set-game-ctc", async (data) => {
    if(!session) {
      session.disconnect()
    } else {
      if(!session.gameCtc) {
        session.gameCtc = data.gameContract
      }
    }
  })
  // on admin
  socket.on("set-reach-events", async (data) => {
    if(!session){
      session.disconnect()
    } else {
      if(!session.events) {
        session.events = data.events;
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

  socket.on("vote-event", (data) => {
    if (!session) {
      socket.disconnect();
    } else {
      client.voted = true;
      let win;
      if (data.isSpy) {
        //check if location is correct and send whether won or lost
        win = session.currentLocation == data.vote;
      } else {
        //check if spy is correct and send whether won or lost
        win = session.spyId == data.vote;
      }

      if(win) {
        session.addWinner(client.id)
      }
      // const allVoted = Array.from(session.clients).reduce(
      //   (acc, cli) => acc && cli.voted,
      //   true
      // );
      client.send('vote-result', {
        client: client,
        winLose: win
      });    
    }
  })

  socket.on("player-ready", (data) => {
    if (!session) {
      socket.disconnect();
    } else {
      client.ready = data.ready;
      session.broadcastPeers();
    }
  });

  socket.on("start-game", async () => {
    if (!session) {
      socket.disconnect();
    } else {
      // const allReady = Array.from(session.clients).reduce(
      //   (acc, cli) => acc && cli.ready,
      //   true
      // );
      //join
      const clientsArray = Array.from(session.clients)
      clientsArray.forEach(async (cli) => {
        if(session.success === false) {
          const data = {
            events: session.events,
            cliName: cli.name,
            playerContract: cli.contract
          }
          cli.send("reach-callback", data);
          socket.on("reach-success", async (data) => {
            if(!session){
              session.disconnect();
            } else {
              await session.reachSuccess(data.response)
            }
          })
          session.success = false;
        }
      });
      // if (allReady) {
      //   SpyGame.startGame(session);
      // } else {
      //   client.send("chat-event", {
      //     message: "All players must be ready",
      //     color: "red",
      //   });
      // }
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
