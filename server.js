const express = require("express");
const fs = require("fs");
const axios = require("axios");
const cron = require("node-cron");
const cors = require("cors"); 

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

const RIOT_API_KEY = "RGAPI-2ef0c92e-925b-4bf4-9988-6a6ff1e6898d"; // Reemplaza esto con tu clave de API de Riot ;)
const players = [
  { streamer: "Dritzh", username: "mwwvuywvg", tag: "O5DnN", rol: "adc" },
  { streamer: "Pause", username: "eikigdbh", tag: "NqeHu", rol: "mid" },
  { streamer: "Sleeper", username: "zvldcacoz", tag: "8xkci", rol: "top" },
  { streamer: "Gerson", username: "xnnal", tag: "gS0mW", rol: "supp" },
  { streamer: "xKeven", username: "ewecas", tag: "QHLjV", rol: "adc" },
  { streamer: "Tunnler", username: "zeapennxm", tag: "pF1rp", rol: "top" },
  { streamer: "Powa", username: "lguimzmml", tag: "s5BoK", rol: "jungle" },
  { streamer: "Bonkyi", username: "oefti", tag: "9cNRn", rol: "supp" },
  { streamer: "Sr.Lemon", username: "rydbamkju", tag: "MSBD1", rol: "jungle" },
  { streamer: "Diegogo", username: "ietsup", tag: "h1Fzo", rol: "supp" },
  { streamer: "Antmauricio", username: "rcwtrr", tag: "Wjluo", rol: "top" },
  { streamer: "Miracle", username: "jdrcbb", tag: "7CoCo", rol: "adc" },

];

const batchSize = 5; // Tamaño del lote de jugadores que se actualizarán cada vez
const updateInterval = 5000; // Intervalo de tiempo entre actualizaciones de lotes (en milisegundos)

const getPUUID = async (username, tag) => {
  const response = await axios.get(
    `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${username}/${tag}?api_key=${RIOT_API_KEY}`
  );
  return response.data.puuid;
};

const getSummonerByPUUID = async (puuid) => {
  const response = await axios.get(
    `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`
  );
  return response.data;
};

const getRankedStatsBySummonerId = async (summonerId) => {
  const response = await axios.get(
    `https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${RIOT_API_KEY}`
  );
  return response.data;
};

const fetchPlayerStats = async (batch) => {
  const statsPromises = batch.map(async (player) => {
    try {
      const puuid = await getPUUID(player.username, player.tag);
      const summoner = await getSummonerByPUUID(puuid);
      const stats = await getRankedStatsBySummonerId(summoner.id);
      const soloStats = stats.find(
        (stat) => stat.queueType === "RANKED_SOLO_5x5"
      );
      return {
        streamer: player.streamer,
        summonerName: player.username,
        tag: player.tag,
        encryptedSummonerId: player.encryptedSummonerId,
        rol: player.rol,
        profileIconId: summoner.profileIconId,
        summonerLevel: summoner.summonerLevel,
        rankedStats: soloStats || null,
      };
    } catch (error) {
      console.error(
        `Error fetching stats for ${player.username}: ${error.message}`
      );
      return { summonerName: player.username, error: true };
    }
  });

  return Promise.all(statsPromises);
};

const updatePlayerStatsBatch = async (startIndex) => {
  const batch = players.slice(startIndex, startIndex + batchSize);
  const playerStats = await fetchPlayerStats(batch);
  return playerStats;
};

const updateAllPlayerStats = async () => {
  try {
    let startIndex = 0;
    const totalPlayers = players.length;
    const allPlayerStats = [];

    while (startIndex < totalPlayers) {
      const playerStats = await updatePlayerStatsBatch(startIndex);
      allPlayerStats.push(...playerStats);
      startIndex += batchSize;

      // Espera un tiempo antes de actualizar el siguiente lote
      await new Promise((resolve) => setTimeout(resolve, updateInterval));
    }

    fs.writeFileSync(
      "playerStats.json",
      JSON.stringify(allPlayerStats, null, 2)
    );
    console.log(
      "Todos los datos de los jugadores se han actualizado correctamente."
    );
  } catch (error) {
    console.error(
      "Error al actualizar las estadísticas del jugador:",
      error.message
    );
  }
};

// Actualizar datos al iniciar el servidor
updateAllPlayerStats();

// Actualizar datos cada 5 minutos
cron.schedule("*/5 * * * *", updateAllPlayerStats);

// Ruta para obtener las estadísticas (ahora será la ruta principal)
app.get("/", (req, res) => {
  fs.readFile("playerStats.json", "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read data" });
    }
    res.json(JSON.parse(data));
  });
});

// Ruta para servir riot.txt
app.get("//riot.txt", (req, res) => {
  fs.readFile("riot.txt", "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer riot.txt:", err);
      return res.status(500).send("Error interno del servidor");
    }
    res.send(data);
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
