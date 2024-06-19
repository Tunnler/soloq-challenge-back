const express = require('express');
const fs = require('fs');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 3001;

const RIOT_API_KEY = 'RGAPI-e3f8d747-148c-48e1-9702-bfe7f4fe058f'; // Reemplaza esto con tu clave de API de Riot ;)
const players = [
  { streamer: 'Gangbang182', username: 'RedSight182', tag: 'LAN', rol: 'jungle', encryptedSummonerId: '-h5W5FeGdwpHEsK4SYqLfB5C770TsBUsefmH_qJtNY5ek9I' },
  { streamer: 'Greddyy', username: 'The Peanut King', tag: 'LAN', rol: 'mid', encryptedSummonerId: 'xe34R0laIY4Ef9ceHYUlqYN5G2cvj7hJ3xwY1rP7dfh1-zo' },
  { streamer: 'Dritzh', username: 'Dritzh', tag: '098', rol: 'adc', encryptedSummonerId: 'wsveOgMMhhZRM5kw6jxD3cQlc6YgW0C1qf6Z4vYv898HQ0w' },
  { streamer: 'Pause', username: 'pause', tag: 'LAN', rol: 'mid', encryptedSummonerId: 'aDYZmUnrK35qumhnvt_PUMRPyxEEBv6yVdJKcDyhP2JgnVg' },
  { streamer: 'IDFK05', username: 'Sleeper', tag: '9905', rol: 'top', encryptedSummonerId: 'lKnlcsCy61GUY5SDss1Sqwyfd3N3Vm1nImL5viqieWTW8IY' },
  { streamer: 'Gerson', username: 'Gërsön', tag: 'LAN', rol: 'supp', encryptedSummonerId: '6il2Mx74qzX2vGlaKkUnNauV1pRtc4_jLm4rqXid2CI5ntg' },
  { streamer: 'Peregrino', username: 'PP3R3GRIN0', tag: '2000', rol: 'adc', encryptedSummonerId: 'rdL7trZShZiunVeHHZMY_4DhnX-_n0qyDvTnEsdfhmOk6Uk' },
  { streamer: 'xKeven', username: 'Get Cachorred', tag: 'FNTIC', rol: 'adc', encryptedSummonerId: 'zTDA_2w3d5KbftYfq8Hjfdt8W_S-95NSzN25h3tLL1wKBQ' },
];

const getSummonerBySummonerId = async (summonerId) => {
  const response = await axios.get(`https://la1.api.riotgames.com/lol/summoner/v4/summoners/${summonerId}?api_key=${RIOT_API_KEY}`);
  return response.data;
};

const getRankedStatsBySummonerId = async (summonerId) => {
  const response = await axios.get(`https://la1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${RIOT_API_KEY}`);
  return response.data;
};

const fetchPlayerStats = async () => {
  const statsPromises = players.map(async player => {
    const summoner = await getSummonerBySummonerId(player.encryptedSummonerId);
    const stats = await getRankedStatsBySummonerId(player.encryptedSummonerId);
    const soloStats = stats.find(stat => stat.queueType === 'RANKED_SOLO_5x5');
    return {
      streamer: player.streamer,
      summonerName: player.username,
      tag: player.tag,
      encryptedSummonerId: player.encryptedSummonerId,
      rol: player.rol,
      profileIconId: summoner.profileIconId,
      summonerLevel: summoner.summonerLevel,
      rankedStats: soloStats || null
    };
  });

  return Promise.all(statsPromises);
};

const updatePlayerStats = async () => {
  try {
    const playerStats = await fetchPlayerStats();
    fs.writeFileSync('playerStats.json', JSON.stringify(playerStats, null, 2));
    console.log('Player stats updated successfully.');
  } catch (error) {
    console.error('Error updating player stats:', error.message);
  }
};

// Actualizar datos cada 5 minutos
cron.schedule('*/5 * * * *', updatePlayerStats);

// Ruta para obtener las estadísticas (ahora será la ruta principal)
app.get('/', (req, res) => {
  fs.readFile('playerStats.json', 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read data' });
    }
    res.json(JSON.parse(data));
  });
});

// Ruta para servir riot.txt
app.get('//riot.txt', (req, res) => {
  fs.readFile('riot.txt', 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer riot.txt:', err);
      return res.status(500).send('Error interno del servidor');
    }
    res.send(data);
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  updatePlayerStats(); // Actualizar datos al iniciar el servidor
});
