const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());

// Para manejar JSON en rutas sin archivos
app.use(express.json());

// Servir archivos estáticos (para frontend)
app.use(express.static(path.join(__dirname, '..')));

// Servir carpeta uploads para acceder a imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conectar a la base de datos (se crea si no existe)
const db = new sqlite3.Database('./productos.db', (err) => {
  if (err) return console.error(err.message);
  console.log('Conectado a la base de datos SQLite');
});

// Crear tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    imagen TEXT,
    precio REAL,
    categoria TEXT
  )
`);

// Configuración de multer para guardar imágenes en carpeta uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // carpeta donde se guardan las imágenes
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});
const upload = multer({ storage: storage });

// Rutas públicas

// Traer todos los productos
app.get('/productos', (req, res) => {
  const sql = `SELECT * FROM productos`;
  db.all(sql, [], (err, filas) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(filas);
  });
});

// Traer productos por categoría
app.get('/productos/:categoria', (req, res) => {
  const categoria = req.params.categoria;
  const sql = `SELECT * FROM productos WHERE categoria = ?`;
  db.all(sql, [categoria], (err, filas) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(filas);
  });
});

// Usuario administrador hardcodeado
const adminUser = {
  username: 'admin',
  password: '1234'
};

// Login admin
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser.username && password === adminUser.password) {
    res.json({ success: true, token: 'admin-token-123' });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
});

function checkAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'Falta token' });
  }

  const token = authHeader.split(' ')[1]; 

  if (token === 'admin-token-123') {
    next();
  } else {
    res.status(403).json({ message: 'Token inválido o expirado. Por favor, iniciá sesión de nuevo.' });
  }
}

// Crear producto (con imagen)
app.post('/admin/productos', checkAuth, upload.single('imagen'), (req, res) => {
  const { nombre, precio, categoria } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const sql = `INSERT INTO productos (nombre, imagen, precio, categoria) VALUES (?, ?, ?, ?)`;
  db.run(sql, [nombre, imagen, precio, categoria], function(err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json({ id: this.lastID });
  });
});

// Editar producto (con imagen opcional)
app.put('/admin/productos/:id', checkAuth, upload.single('imagen'), (req, res) => {
  const { id } = req.params;
  const { nombre, precio, categoria } = req.body;
  let imagen = null;

  if (req.file) {
    imagen = req.file.filename;
  }

  // Actualizar con o sin imagen nueva
  const sql = imagen
    ? `UPDATE productos SET nombre = ?, imagen = ?, precio = ?, categoria = ? WHERE id = ?`
    : `UPDATE productos SET nombre = ?, precio = ?, categoria = ? WHERE id = ?`;

  const params = imagen
    ? [nombre, imagen, precio, categoria, id]
    : [nombre, precio, categoria, id];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json({ updated: this.changes });
  });
});

// Eliminar producto
app.delete('/admin/productos/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM productos WHERE id = ?`;
  db.run(sql, [id], function(err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json({ deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Ruta protegida de prueba
app.get('/admin/protegido', checkAuth, (req, res) => {
  res.json({ message: 'Ruta protegida accedida correctamente' });
});