const locations = [
  "âïžđș Airport",
  "đŠđ° Bank",
  "đ°đ” Casino",
  "đđż Cinema",
  "đŠžđŠč Cosplay Convention",
  "đłđ Cruise Ship",
  "âœïžđ Football Stadium",
  "đłđ Forest Camp",
  "đȘđ Grocery Store",
  "đ„đ§ââïž Hospital",
  "đšđ Hotel",
  "đđ§âđ Moon Colony",
  "đđŒ Museum",
  "đđž Rock Concert",
  "đđ€ Train Station",
  "đ«đ University",
];

const extendedLocations = [
  "đđ„„ Desert Island",
  "â°đ„Ÿ Mountain Hike",
  "đ€đź Post Office",
  "đœđ©âđł Restaurant",
];

function startGame(session, extendedMode,clientsArray) {
  const spyIndex = Math.floor(Math.random() * clientsArray.length);
  const firstQuestion =
    clientsArray[Math.floor(Math.random() * clientsArray.length)].name;

  const gameLocations = extendedMode
    ? [...locations, ...extendedLocations]
    : locations;
  const currentLocation =
    gameLocations[Math.floor(Math.random() * locations.length)];

  session.setLocationandSpy(currentLocation, spyIndex)

  clientsArray.forEach((client, index) => {
    client.isSpy = spyIndex === index;
    client.ready = false;
    client.send("start-game", {
      spy: client.isSpy,
      location: client.isSpy ? "?" : currentLocation,
      locations: gameLocations,
      first: firstQuestion,
    });
  });
  session.broadcastPeers();
}

module.exports = { startGame };
