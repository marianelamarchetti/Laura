const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./backend/productos.db');

const productos = [
  { nombre: 'Vela aromática', imagen: 'vela1.jpg', precio: 1500, categoria: 'velas' },
  { nombre: 'Sahumerio de lavanda', imagen: 'sahumerio1.jpg', precio: 700, categoria: 'sahumerios' },
  { nombre: 'Perfume de auto', imagen: 'perfume1.jpg', precio: 900, categoria: 'perfumes' }
];

productos.forEach(p => {
  db.run(
    'INSERT INTO productos (nombre, imagen, precio, categoria) VALUES (?, ?, ?, ?)',
    [p.nombre, p.imagen, p.precio, p.categoria],
    (err) => {
      if (err) return console.error(err.message);
    }
  );
});

console.log('Productos insertados');
db.close();
