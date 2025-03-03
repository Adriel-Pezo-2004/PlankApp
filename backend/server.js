// backend/server.js
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de la conexión MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', 
    database: 'plankapp'
});

// Conectar a MySQL
db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL');
});

// Ejemplo de rutas API
app.get('/api/items', (req, res) => {
    db.query('SELECT * FROM items', (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener datos' });
            return;
        }
        res.json(results);
    });
});

app.post('/api/items', (req, res) => {
    const { nombre, descripcion } = req.body;
    db.query(
        'INSERT INTO items (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion],
        (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error al insertar datos' });
                return;
            }
            res.json({ id: result.insertId, mensaje: 'Item creado exitosamente' });
        }
    );
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});