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
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml'
};

// Configuración de Google Map Tiles API (2D Tiles) y Caché Local en Disco
const GOOGLE_API_KEY = 'AIzaSyAVzwsDud9KBe2tFFo4RoIG5enfmHJU_LI';
const CACHE_DIR = path.join(__dirname, 'assets', 'tiles_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

let googleSession = null;
let googleSessionExpiry = 0;

/** Obtiene o renueva la sesión satelital de Google Maps */
async function getGoogleSession() {
  const now = Math.floor(Date.now() / 1000);
  if (googleSession && googleSessionExpiry > now + 3600) {
    return googleSession;
  }
  try {
    const res = await fetch(`https://tile.googleapis.com/v1/createSession?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapType: 'satellite', language: 'es-PE', region: 'PE' })
    });
    const data = await res.json();
    if (data.session) {
      googleSession = data.session;
      googleSessionExpiry = Number(data.expiry) || (now + 86400 * 7);
      console.log(`[Google Tiles] Sesión satelital activa. Expira en: ${new Date(googleSessionExpiry * 1000).toLocaleString()}`);
      return googleSession;
    }
  } catch (err) {
    console.error('[Google Tiles] Error al conectar con Google Session:', err.message);
  }
  return null;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // 1. ENDPOINT API: Teselas Satelitales Dinámicas en Tiempo Real con Caché en Disco
  const tileMatch = urlPath.match(/^\/api\/tile\/(\d+)\/(\d+)\/(\d+)\.(jpg|jpeg|png)/);
  if (tileMatch) {
    const [_, z, x, y] = tileMatch;
    const cacheFile = path.join(CACHE_DIR, `${z}_${x}_${y}.jpg`);

    // A) Si ya está en caché local, servir directamente desde disco (0ms latencia, 0 cuota)
    if (fs.existsSync(cacheFile)) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=2592000',
        'Access-Control-Allow-Origin': '*'
      });
      return fs.createReadStream(cacheFile).pipe(res);
    }

    // B) Descargar desde Google Map Tiles API
    (async () => {
      try {
        const session = await getGoogleSession();
        if (session) {
          const tileUrl = `https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}?session=${session}&key=${GOOGLE_API_KEY}`;
          const gRes = await fetch(tileUrl);
          if (gRes.ok) {
            const buffer = Buffer.from(await gRes.arrayBuffer());
            fs.writeFile(cacheFile, buffer, () => {});
            res.writeHead(200, {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=2592000',
              'Access-Control-Allow-Origin': '*'
            });
            return res.end(buffer);
          }
        }
      } catch (err) {
        console.error(`[Google Tile ${z}/${x}/${y} error]:`, err.message);
      }

      // C) Fallback automático a Esri World Imagery satelital
      try {
        const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
        const esriRes = await fetch(esriUrl);
        if (esriRes.ok) {
          const buffer = Buffer.from(await esriRes.arrayBuffer());
          fs.writeFile(cacheFile, buffer, () => {});
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=2592000',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(buffer);
        }
      } catch (e) {
        console.error('[Esri Fallback Error]:', e.message);
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Tile not found');
    })();
    return;
  }

  // 2. SERVIR ARCHIVOS ESTÁTICOS
  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, '');
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
  console.log(` Satélite dinámico Google Map Tiles API integrado.`);
  console.log(`=========================================================\n`);
});

