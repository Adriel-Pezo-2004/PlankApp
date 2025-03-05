const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const querystring = require('querystring');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const Fuse = require('fuse.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'plankapp'
};

// Credenciales de Spotify
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';

// Variable para almacenar el token de acceso
let spotifyToken = null;
let tokenExpirationTime = null;

// Conexión a la base de datos
async function getConnection() {
  try {
    return await mysql.createConnection(dbConfig);
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    throw error;
  }
}

// Función para obtener un token de Spotify
async function getSpotifyToken() {
  try {
    // Verificar si ya tenemos un token válido
    if (spotifyToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
      return spotifyToken;
    }

    // Si no hay token o expiró, obtenemos uno nuevo
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      data: querystring.stringify({
        grant_type: 'client_credentials'
      })
    });

    spotifyToken = response.data.access_token;
    // Guardar tiempo de expiración (tiempo actual + tiempo de expiración en ms)
    tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);
    return spotifyToken;
  } catch (error) {
    console.error('Error al obtener token de Spotify:', error);
    throw error;
  }
}

// Configuración Swagger
const swaggerOptions = {
  definition: {
      openapi: "3.0.0",
      info: {
          title: "PlankApp API",
          version: "1.0.0",
          description: "Documentación de API con Swagger en Node.js",
      },
      servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ["./server.js"], // Apuntar a este mismo archivo para leer los comentarios JSDoc
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
* @swagger
* /api/buscar-artista:
*   get:
*     summary: Buscar un artista en Spotify
*     parameters:
*       - in: query
*         name: q
*         required: true
*         description: Nombre del artista a buscar
*         schema:
*           type: string
*     responses:
*       200:
*         description: Lista de artistas encontrados
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 type: object
*       400:
*         description: Falta el parámetro de búsqueda
*       500:
*         description: Error en la búsqueda de Spotify
*/

// Ruta para buscar artistas en Spotify
app.get('/api/buscar-artista', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda' });
    }

    const token = await getSpotifyToken();
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        q,
        type: 'artist',
        limit: 50 // Obtener más resultados para aplicar la búsqueda difusa
      }
    });

    const artists = response.data.artists.items;

    // Verificar si hay una coincidencia exacta (sin variaciones en mayúsculas/minúsculas)
    const exactMatch = artists.find(artist => 
      artist.name.toLowerCase().trim() === q.toLowerCase().trim()
    );

    // Configurar Fuse.js para la búsqueda difusa con configuraciones más precisas
    const fuse = new Fuse(artists, {
      keys: ['name'],
      threshold: 0.3, // Umbral de similitud
      distance: 3, // Permite correcciones de hasta 3 letras
      includeScore: true // Incluir puntuación de similitud
    });

    // Realizar la búsqueda difusa
    const fuzzyResults = fuse.search(q);

    // Filtrar los resultados por similitud
    const topResults = fuzzyResults
      .filter(result => result.score <= 0.4) // Resultados muy similares
      .slice(0, 3) // Limitar a 3 resultados
      .map(result => result.item);

    return res.json({
      exactMatch: exactMatch || null,
      topResults
    });

  } catch (error) {
    console.error('Error al buscar artista:', error);
    res.status(500).json({ 
      error: 'Error al buscar artista en Spotify',
      details: error.response?.data || error.message 
    });
  }
});


// Nueva ruta para obtener detalles completos del artista
/**
* @swagger
* /api/artista-detalle/{id}:
*   get:
*     summary: Obtiene todos los álbumes y canciones de un artista
*     parameters:
*       - in: path
*         name: id
*         required: true
*         description: ID de Spotify del artista
*     responses:
*       200:
*         description: Detalles completos del artista
*       500:
*         description: Error al obtener datos
*/
app.get('/api/artista-detalle/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const token = await getSpotifyToken();
    
    // 1. Obtener información del artista
    const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // 2. Obtener todos los álbumes
    const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { include_groups: 'album,single,appears_on', limit: 50 }
    });

    // 3. Procesar álbumes con canciones
    const albumsWithTracks = await Promise.all(
      albumsResponse.data.items.map(async album => {
        const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 50 }
        });
        
        return {
          id: album.id,
          name: album.name,
          type: album.album_type,
          release_date: album.release_date,
          total_tracks: album.total_tracks,
          tracks: tracksResponse.data.items
        };
      })
    );

    // 4. Clasificar por tipo
    const categorized = {
      albums: albumsWithTracks.filter(a => a.type === 'album'),
      singles: albumsWithTracks.filter(a => a.type === 'single'),
      compilations: albumsWithTracks.filter(a => a.type === 'compilation'),
      appearances: albumsWithTracks.filter(a => a.type === 'appears_on')
    };

    res.json({
      artist: artistResponse.data,
      ...categorized
    });

  } catch (error) {
    console.error('Error en artista-detalle:', error);
    res.status(500).json({ error: 'Error al obtener datos del artista' });
  }
});

// Ruta para buscar álbumes de un artista
app.get('/api/albumes/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const token = await getSpotifyToken();
    
    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        include_groups: 'album,single',
        limit: 50
      }
    });

    res.json(response.data.items);
  } catch (error) {
    console.error('Error al obtener álbumes:', error);
    res.status(500).json({ error: 'Error al obtener álbumes de Spotify' });
  }
});

// Ruta para obtener canciones de un álbum
app.get('/api/canciones/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    const token = await getSpotifyToken();
    
    const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 50
      }
    });

    res.json(response.data.items);
  } catch (error) {
    console.error('Error al obtener canciones:', error);
    res.status(500).json({ error: 'Error al obtener canciones de Spotify' });
  }
});

// Ruta para guardar un artista en la base de datos
app.post('/api/artistas', async (req, res) => {
  const { nombre, spotify_id } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del artista es requerido' });
  }
  
  let connection;
  try {
    connection = await getConnection();
    
    // Verificar si el artista ya existe
    const [existingArtists] = await connection.execute('SELECT * FROM artistas WHERE nombre = ?', [nombre]);
    
    if (existingArtists.length > 0) {
      return res.json({ message: 'El artista ya existe', id: existingArtists[0].id });
    }
    
    // Insertar el nuevo artista
    const [result] = await connection.execute(
      'INSERT INTO artistas (nombre, spotify_id) VALUES (?, ?)',
      [nombre, spotify_id || null]
    );
    
    res.status(201).json({ 
      message: 'Artista guardado correctamente', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error al guardar artista:', error);
    res.status(500).json({ error: 'Error al guardar artista en la base de datos' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para guardar un álbum en la base de datos
app.post('/api/albumes', async (req, res) => {
  const { titulo, artista_id, año_lanzamiento, es_sencillo, spotify_id } = req.body;
  
  if (!titulo || !artista_id) {
    return res.status(400).json({ error: 'El título y el ID del artista son requeridos' });
  }
  
  let connection;
  try {
    connection = await getConnection();
    
    // Verificar si el álbum ya existe
    const [existingAlbums] = await connection.execute(
      'SELECT * FROM albumes WHERE titulo = ? AND artista_id = ?', 
      [titulo, artista_id]
    );
    
    if (existingAlbums.length > 0) {
      return res.json({ message: 'El álbum ya existe', id: existingAlbums[0].id });
    }
    
    // Insertar el nuevo álbum
    const [result] = await connection.execute(
      'INSERT INTO albumes (titulo, artista_id, año_lanzamiento, es_sencillo, spotify_id) VALUES (?, ?, ?, ?, ?)',
      [titulo, artista_id, año_lanzamiento || null, es_sencillo || false, spotify_id || null]
    );
    
    res.status(201).json({ 
      message: 'Álbum guardado correctamente', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error al guardar álbum:', error);
    res.status(500).json({ error: 'Error al guardar álbum en la base de datos' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para guardar una canción en la base de datos
app.post('/api/canciones', async (req, res) => {
  const { nombre, artista_id, album_id, duracion, spotify_id } = req.body;
  
  if (!nombre || !artista_id || !album_id || !duracion) {
    return res.status(400).json({ 
      error: 'El nombre, ID del artista, ID del álbum y duración son requeridos' 
    });
  }
  
  let connection;
  try {
    connection = await getConnection();
    
    // Verificar si la canción ya existe
    const [existingSongs] = await connection.execute(
      'SELECT * FROM canciones WHERE nombre = ? AND artista_id = ? AND album_id = ?', 
      [nombre, artista_id, album_id]
    );
    
    if (existingSongs.length > 0) {
      return res.json({ message: 'La canción ya existe', id: existingSongs[0].id });
    }
    
    // Insertar la nueva canción
    const [result] = await connection.execute(
      'INSERT INTO canciones (nombre, artista_id, album_id, duracion, spotify_id) VALUES (?, ?, ?, ?, ?)',
      [nombre, artista_id, album_id, duracion, spotify_id || null]
    );
    
    res.status(201).json({ 
      message: 'Canción guardada correctamente', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error al guardar canción:', error);
    res.status(500).json({ error: 'Error al guardar canción en la base de datos' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para añadir una canción a la lista ToDo de un usuario
app.post('/api/todo', async (req, res) => {
  const { usuario_id, cancion_id } = req.body;
  
  if (!usuario_id || !cancion_id) {
    return res.status(400).json({ error: 'El ID del usuario y el ID de la canción son requeridos' });
  }
  
  let connection;
  try {
    connection = await getConnection();
    
    // Verificar si la entrada ya existe
    const [existingEntries] = await connection.execute(
      'SELECT * FROM todo_canciones WHERE usuario_id = ? AND cancion_id = ?', 
      [usuario_id, cancion_id]
    );
    
    if (existingEntries.length > 0) {
      return res.json({ 
        message: 'La canción ya está en la lista ToDo del usuario', 
        id: existingEntries[0].id 
      });
    }
    
    // Insertar la nueva entrada
    const [result] = await connection.execute(
      'INSERT INTO todo_canciones (usuario_id, cancion_id) VALUES (?, ?)',
      [usuario_id, cancion_id]
    );
    
    res.status(201).json({ 
      message: 'Canción añadida a la lista ToDo correctamente', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error al añadir canción a la lista ToDo:', error);
    res.status(500).json({ error: 'Error al añadir canción a la lista ToDo' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para marcar una canción como completada
app.put('/api/todo/:id/completar', async (req, res) => {
  const { id } = req.params;
  
  let connection;
  try {
    connection = await getConnection();
    
    const [result] = await connection.execute(
      'UPDATE todo_canciones SET completado = TRUE, fecha_completado = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }
    
    res.json({ message: 'Canción marcada como completada' });
  } catch (error) {
    console.error('Error al marcar canción como completada:', error);
    res.status(500).json({ error: 'Error al marcar canción como completada' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para obtener la lista ToDo de un usuario
app.get('/api/todo/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const { completado } = req.query;
  
  let connection;
  try {
    connection = await getConnection();
    
    let query = `
      SELECT tc.*, c.nombre as cancion_nombre, a.nombre as artista_nombre, al.titulo as album_titulo
      FROM todo_canciones tc
      JOIN canciones c ON tc.cancion_id = c.id
      JOIN artistas a ON c.artista_id = a.id
      JOIN albumes al ON c.album_id = al.id
      WHERE tc.usuario_id = ?
    `;
    
    const params = [usuarioId];
    
    if (completado !== undefined) {
      query += ' AND tc.completado = ?';
      params.push(completado === 'true' ? 1 : 0);
    }
    
    const [rows] = await connection.execute(query, params);
    
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener lista ToDo:', error);
    res.status(500).json({ error: 'Error al obtener lista ToDo' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para importar un lote de canciones desde Spotify
app.post('/api/importar-spotify', async (req, res) => {
  const { spotify_artist_id, usuario_id } = req.body;
  
  if (!spotify_artist_id) {
    return res.status(400).json({ error: 'El ID de Spotify del artista es requerido' });
  }
  
  let connection;
  try {
    connection = await getConnection();
    const token = await getSpotifyToken();
    
    // 1. Obtener información del artista
    const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${spotify_artist_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const artistName = artistResponse.data.name;
    
    // 2. Guardar o encontrar el artista en la base de datos
    const [existingArtists] = await connection.execute(
      'SELECT * FROM artistas WHERE spotify_id = ? OR nombre = ?', 
      [spotify_artist_id, artistName]
    );
    
    let artistId;
    if (existingArtists.length > 0) {
      artistId = existingArtists[0].id;
      // Actualizar spotify_id si no lo tenía
      if (!existingArtists[0].spotify_id) {
        await connection.execute(
          'UPDATE artistas SET spotify_id = ? WHERE id = ?',
          [spotify_artist_id, artistId]
        );
      }
    } else {
      // Insertar nuevo artista
      const [artistResult] = await connection.execute(
        'INSERT INTO artistas (nombre, spotify_id) VALUES (?, ?)',
        [artistName, spotify_artist_id]
      );
      artistId = artistResult.insertId;
    }
    
    // 3. Obtener álbumes del artista
    const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${spotify_artist_id}/albums`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        include_groups: 'album,single',
        limit: 50
      }
    });
    
    // 4. Procesar cada álbum y sus canciones
    const albumPromises = albumsResponse.data.items.map(async (album) => {
      // Guardar o encontrar el álbum
      const esSencillo = album.album_type === 'single';
      const añoLanzamiento = album.release_date ? parseInt(album.release_date.substring(0, 4)) : null;
      
      const [existingAlbums] = await connection.execute(
        'SELECT * FROM albumes WHERE spotify_id = ? OR (titulo = ? AND artista_id = ?)', 
        [album.id, album.name, artistId]
      );
      
      let albumId;
      if (existingAlbums.length > 0) {
        albumId = existingAlbums[0].id;
        // Actualizar spotify_id si no lo tenía
        if (!existingAlbums[0].spotify_id) {
          await connection.execute(
            'UPDATE albumes SET spotify_id = ? WHERE id = ?',
            [album.id, albumId]
          );
        }
      } else {
        // Insertar nuevo álbum
        const [albumResult] = await connection.execute(
          'INSERT INTO albumes (titulo, artista_id, año_lanzamiento, es_sencillo, spotify_id) VALUES (?, ?, ?, ?, ?)',
          [album.name, artistId, añoLanzamiento, esSencillo, album.id]
        );
        albumId = albumResult.insertId;
      }
      
      // Obtener canciones del álbum
      const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { limit: 50 }
      });
      
      // Procesar cada canción
      const trackPromises = tracksResponse.data.items.map(async (track) => {
        // Convertir duración de ms a formato TIME (HH:MM:SS)
        const durationMs = track.duration_ms;
        const seconds = Math.floor((durationMs / 1000) % 60);
        const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
        const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);
        
        const duracion = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Guardar o encontrar la canción
        const [existingSongs] = await connection.execute(
          'SELECT * FROM canciones WHERE spotify_id = ? OR (nombre = ? AND artista_id = ? AND album_id = ?)', 
          [track.id, track.name, artistId, albumId]
        );
        
        let songId;
        if (existingSongs.length > 0) {
          songId = existingSongs[0].id;
          // Actualizar spotify_id si no lo tenía
          if (!existingSongs[0].spotify_id) {
            await connection.execute(
              'UPDATE canciones SET spotify_id = ? WHERE id = ?',
              [track.id, songId]
            );
          }
        } else {
          // Insertar nueva canción
          const [songResult] = await connection.execute(
            'INSERT INTO canciones (nombre, artista_id, album_id, duracion, spotify_id) VALUES (?, ?, ?, ?, ?)',
            [track.name, artistId, albumId, duracion, track.id]
          );
          songId = songResult.insertId;
        }
        
        // Si se proporcionó un ID de usuario, añadir a su lista ToDo
        if (usuario_id) {
          // Verificar si ya está en la lista
          const [existingTodo] = await connection.execute(
            'SELECT * FROM todo_canciones WHERE usuario_id = ? AND cancion_id = ?', 
            [usuario_id, songId]
          );
          
          if (existingTodo.length === 0) {
            await connection.execute(
              'INSERT INTO todo_canciones (usuario_id, cancion_id) VALUES (?, ?)',
              [usuario_id, songId]
            );
          }
        }
        
        return { id: songId, nombre: track.name };
      });
      
      const canciones = await Promise.all(trackPromises);
      
      return {
        id: albumId,
        titulo: album.name,
        año_lanzamiento: añoLanzamiento,
        es_sencillo: esSencillo,
        canciones
      };
    });
    
    const albumes = await Promise.all(albumPromises);
    
    res.json({
      message: 'Importación completada con éxito',
      artista: {
        id: artistId,
        nombre: artistName,
        spotify_id: spotify_artist_id
      },
      albumes
    });
    
  } catch (error) {
    console.error('Error al importar desde Spotify:', error);
    res.status(500).json({ error: 'Error al importar desde Spotify' });
  } finally {
    if (connection) connection.end();
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

module.exports = app;