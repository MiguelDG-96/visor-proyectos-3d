const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5174;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n=========================================================`);
  console.log(` 🏡 Visor 3D Inmobiliario — Lotización Chávez Pata`);
  console.log(` Servidor local activo en: http://localhost:${PORT}`);
  console.log(` Presiona Ctrl + C para detener el servidor.`);
  console.log(`=========================================================\n`);
});

