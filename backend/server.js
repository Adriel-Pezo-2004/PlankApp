const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const querystring = require('querystring');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const Fuse = require('fuse.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost:8080',
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
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';
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
    
    // 2. Obtener todos los álbumes con sus imágenes
    // La API de Spotify ya incluye las imágenes en esta respuesta
    const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { 
        include_groups: 'album,single,appears_on', 
        limit: 50,
        market: 'ES' // Añadimos market para obtener disponibilidad regional
      }
    });

    // 3. Procesar álbumes con canciones
    const albumsWithTracks = await Promise.all(
      albumsResponse.data.items.map(async album => {
        const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 50 }
        });
        
        // Ya tenemos las imágenes del álbum desde la respuesta inicial
        return {
          id: album.id,
          name: album.name,
          type: album.album_type,
          release_date: album.release_date,
          total_tracks: album.total_tracks,
          images: album.images, // Las imágenes ya vienen incluidas aquí
          uri: album.uri,
          external_urls: album.external_urls,
          tracks: tracksResponse.data.items
        };
      })
    );

    // 4. Clasificar por tipo
    const categorized = {
      albums: albumsWithTracks.filter(a => a.type === 'album'),
      singles: albumsWithTracks.filter(a => a.type === 'single'),
      appearances: albumsWithTracks.filter(a => a.type === 'appears_on')
    };

    res.json({
      artist: artistResponse.data, // Esto ya incluye las imágenes del artista
      ...categorized
    });
  } catch (error) {
    console.error('Error en artista-detalle:', error.response?.data || error.message);
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

// Ruta para registrar un nuevo usuario
app.post('/api/register', async (req, res) => {
  const { nombre, correo, contraseña } = req.body;

  if (!nombre || !correo || !contraseña) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  let connection;
  try {
    connection = await getConnection();
    
    // Verificar si el correo ya existe
    const [existingUsers] = await connection.execute(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Este correo electrónico ya está registrado' });
    }
    
    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    
    // Almacenar la contraseña encriptada
    const [result] = await connection.execute(
      'INSERT INTO usuarios (nombre, correo, contraseña) VALUES (?, ?, ?)',
      [nombre, correo, hashedPassword]
    );

    res.status(201).json({ 
      message: 'Usuario registrado correctamente', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para iniciar sesión
app.post('/api/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
  }

  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM usuarios WHERE correo = ?', [correo]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const user = rows[0];

    // Verificar la contraseña encriptada
    const isPasswordValid = await bcrypt.compare(contraseña, user.contraseña);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign({ id: user.id, nombre: user.nombre, correo: user.correo }, JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({ message: 'Inicio de sesión exitoso', token, user });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  } finally {
    if (connection) connection.end();
  }
});
// Add this route to your server.js file

/**
* @swagger
* /api/update-profile:
*   put:
*     summary: Update user profile information
*     description: Updates a user's name and email in the database
*     security:
*       - bearerAuth: []
*     requestBody:
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - id
*             properties:
*               id:
*                 type: integer
*                 description: User ID
*               nombre:
*                 type: string
*                 description: New name for the user
*               correo:
*                 type: string
*                 description: New email for the user
*     responses:
*       200:
*         description: Profile updated successfully
*       400:
*         description: Missing required fields
*       401:
*         description: Unauthorized - Invalid token
*       409:
*         description: Email already in use
*       500:
*         description: Server error
*/

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Route to update user profile
app.put('/api/update-profile', verifyToken, async (req, res) => {
  const { id, nombre, correo } = req.body;

  // Verify the user ID from token matches the requested update ID
  if (req.user.id !== id) {
    return res.status(401).json({ error: 'No tienes permiso para actualizar este perfil' });
  }

  if (!id) {
    return res.status(400).json({ error: 'El ID del usuario es requerido' });
  }

  // At least one field to update is required
  if (!nombre && !correo) {
    return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar' });
  }

  let connection;
  try {
    connection = await getConnection();
    
    // If email is being updated, check if it's already in use by another user
    if (correo) {
      const [existingUsers] = await connection.execute(
        'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
        [correo, id]
      );
      
      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'Este correo electrónico ya está en uso' });
      }
    }
    
    // Build the update query dynamically based on provided fields
    let updateQuery = 'UPDATE usuarios SET';
    const updateValues = [];
    
    if (nombre) {
      updateQuery += ' nombre = ?';
      updateValues.push(nombre);
    }
    
    if (correo) {
      if (nombre) updateQuery += ',';
      updateQuery += ' correo = ?';
      updateValues.push(correo);
    }
    
    updateQuery += ' WHERE id = ?';
    updateValues.push(id);
    
    // Execute the update
    await connection.execute(updateQuery, updateValues);
    
    // Get updated user data
    const [updatedUser] = await connection.execute(
      'SELECT id, nombre, correo, fecha_registro FROM usuarios WHERE id = ?',
      [id]
    );
    
    if (updatedUser.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Generate new token with updated info
    const newToken = jwt.sign({ 
      id: updatedUser[0].id, 
      nombre: updatedUser[0].nombre, 
      correo: updatedUser[0].correo 
    }, JWT_SECRET, {
      expiresIn: '1h'
    });
    
    res.json({ 
      message: 'Perfil actualizado correctamente',
      user: updatedUser[0],
      token: newToken
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  } finally {
    if (connection) connection.end();
  }
});

// Route to change password
/**
* @swagger
* /api/change-password:
*   put:
*     summary: Change user password
*     description: Updates a user's password in the database
*     security:
*       - bearerAuth: []
*     requestBody:
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - id
*               - contraseñaActual
*               - nuevaContraseña
*             properties:
*               id:
*                 type: integer
*                 description: User ID
*               contraseñaActual:
*                 type: string
*                 description: Current password
*               nuevaContraseña:
*                 type: string
*                 description: New password
*     responses:
*       200:
*         description: Password changed successfully
*       400:
*         description: Missing required fields
*       401:
*         description: Incorrect current password
*       500:
*         description: Server error
*/
app.put('/api/change-password', verifyToken, async (req, res) => {
  const { id, contraseñaActual, nuevaContraseña } = req.body;
  
  // Verify the user ID from token matches the requested update ID
  if (req.user.id !== id) {
    return res.status(401).json({ error: 'No tienes permiso para cambiar esta contraseña' });
  }

  if (!id || !contraseñaActual || !nuevaContraseña) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  let connection;
  try {
    connection = await getConnection();
    
    // Get current user data with password
    const [users] = await connection.execute(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const user = users[0];
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(contraseñaActual, user.contraseña);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);
    
    // Update password
    await connection.execute(
      'UPDATE usuarios SET contraseña = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  } finally {
    if (connection) connection.end();
  }
});

/**
 * @swagger
 * /api/agregar-cancion:
 *   post:
 *     summary: Agrega una canción de Spotify a la lista de "to-do" del usuario
 *     description: Agrega una canción específica de Spotify a la lista de "to-do" de un usuario.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario_id
 *               - cancion_id
 *             properties:
 *               usuario_id:
 *                 type: integer
 *                 description: ID del usuario que agrega la canción
 *               cancion_id:
 *                 type: string
 *                 description: ID de la canción en Spotify que se va a agregar
 *     responses:
 *       201:
 *         description: Canción agregada correctamente
 *       400:
 *         description: Faltan campos requeridos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Canción no encontrada en Spotify
 *       409:
 *         description: La canción ya está en tu lista de "to-do"
 *       500:
 *         description: Error en el servidor
 */
app.post('/api/agregar-cancion', verifyToken, async (req, res) => {
  const { usuario_id, cancion_id, artista } = req.body;

  if (!usuario_id || !cancion_id || !artista) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Verificar que el usuario que realiza la solicitud es el mismo que el usuario_id
  if (req.user.id !== usuario_id) {
    return res.status(401).json({ error: 'No tienes permiso para agregar esta canción' });
  }

  let connection;
  try {
    connection = await getConnection();

    // Verificar si la canción ya está en la lista del usuario
    const [existingSongs] = await connection.execute(
      'SELECT id FROM todo_canciones WHERE usuario_id = ? AND cancion_id = ?',
      [usuario_id, cancion_id]
    );

    if (existingSongs.length > 0) {
      return res.status(409).json({ error: 'La canción ya está en tu lista de "to-do"' });
    }

    // Verificar que la canción existe en Spotify
    const token = await getSpotifyToken();
    const spotifyResponse = await axios.get(`https://api.spotify.com/v1/tracks/${cancion_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!spotifyResponse.data) {
      return res.status(404).json({ error: 'Canción no encontrada en Spotify' });
    }

    // Insertar la canción en la tabla todo_canciones
    const [result] = await connection.execute(
      'INSERT INTO todo_canciones (usuario_id, cancion_id, artista) VALUES (?, ?, ?)',
      [usuario_id, cancion_id, artista]
    );

    res.status(201).json({ 
      message: 'Canción agregada correctamente', 
      id: result.insertId,
      cancion: spotifyResponse.data // Opcional: devolver los detalles de la canción de Spotify
    });
  } catch (error) {
    console.error('Error al agregar canción:', error);

    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Canción no encontrada en Spotify' });
    }

    res.status(500).json({ error: 'Error al agregar la canción' });
  } finally {
    if (connection) connection.end();
  }
});

// Ruta para cerrar sesión (opcional, generalmente se maneja en el frontend)
app.post('/api/logout', (req, res) => {
  // Aquí puedes realizar cualquier acción adicional necesaria para el cierre de sesión
  res.json({ message: 'Cierre de sesión exitoso' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

module.exports = app;