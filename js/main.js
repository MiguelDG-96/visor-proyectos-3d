/**
 * main.js
 * Punto de entrada — orquesta la inicialización y el render loop.
 */
import { initScene, getScene, getCamera, getRenderer } from './scene.js';
import { setupCamera, getControls, resetCamera, toggleTourMode } from './camera.js';
import { setupLighting, toggleDayNight }               from './lighting.js';
import { createTerrain }                               from './terrain.js';
import { createAllManzanas, filterLots, animateLots }  from './lots.js';
import { setupInteraction, updateInteraction }           from './interaction.js';
import { initUI, updateStats }                         from './ui.js';
import { initPerformance, tickPerformance }            from './performance.js';
import { initWalkMode, enableWalkMode, isWalkModeActive, updateWalkMode } from './walk.js';

// ── Helpers de carga ───────────────────────────
const $ = id => document.getElementById(id);

function setProgress(pct, text) {
  const bar  = $('loader-progress');
  const txt  = $('loader-text');
  if (bar) bar.style.width = pct + '%';
  if (txt && text) txt.textContent = text;
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Error al cargar ${path}: ${res.status}`);
  return res.json();
}

// ══════════════════════════════════════════════
// MAIN — inicialización asíncrona
// ══════════════════════════════════════════════
async function main() {
  try {
    // 1. Datos
    setProgress(10, 'Cargando datos de lotes...');
    const data = await loadJSON('./data/lotes.json');

    // 2. Escena
    setProgress(22, 'Inicializando escena 3D...');
    const canvas = $('three-canvas');
    initScene(canvas);

    // 3. Iluminación
    setProgress(38, 'Configurando iluminación...');
    setupLighting();

    // 4. Todos los lotes del plano completo (4 manzanas con coords reales del PDF)
    setProgress(52, 'Generando plano completo...');
    const { center, bounds } = createAllManzanas(data);

    // 5. Terreno y calles
    setProgress(65, 'Creando terreno y calles...');
    createTerrain(bounds);

    // 6. Cámara
    setProgress(75, 'Configurando cámara...');
    setupCamera(center);

    // 7. Interacción
    setProgress(85, 'Configurando interacción...');
    setupInteraction();

    // 8. UI — pasar todos los lotes de todas las manzanas
    setProgress(93, 'Inicializando interfaz...');
    const todosLosLotes = data.manzanas.flatMap(m => m.lotes);
    initUI(
      filterLots,
      () => resetCamera()
    );
    updateStats(todosLosLotes);
    initPerformance();

    // 8.5 Inicializar modo caminata
    initWalkMode(getRenderer(), getScene());
    
    // Escuchar eventos de cambio de cámara
    window.addEventListener('enterWalkMode', () => {
      const controls = getControls();
      if (controls) controls.enabled = false;
      // Posición inicial: centro del mapa, altura baja
      enableWalkMode({ x: center.x, z: center.z });
    });

    window.addEventListener('exitWalkMode', () => {
      const controls = getControls();
      if (controls) controls.enabled = true;
      resetCamera(); // volver a la vista original
    });

    // 8.6 Modo Tour
    window.addEventListener('toggleTourMode', () => {
      const isTour = toggleTourMode();
      const btn = $('btn-tour-mode');
      if (btn) {
        if (isTour) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    // 8.7 Modo Noche
    window.addEventListener('toggleDayNight', () => {
      const isNight = toggleDayNight();
      const btn = $('btn-day-night');
      if (btn) {
        if (isNight) {
          btn.classList.add('active');
          btn.textContent = '☀️'; // Cambia ícono a sol
        } else {
          btn.classList.remove('active');
          btn.textContent = '🌙'; // Cambia ícono a luna
        }
      }
    });

    // 9. Listo — fade out del loader
    setProgress(100, '¡Listo!');
    await _wait(350);
    _fadeOutLoader();

    // 10. Loop de render
    _startRenderLoop();

  } catch (err) {
    console.error('[main] Error de inicialización:', err);
    const txt = $('loader-text');
    if (txt) txt.textContent = '❌ Error al inicializar. Recarga la página.';
  }
}

// ══════════════════════════════════════════════
// Loop de render
// ══════════════════════════════════════════════
function _startRenderLoop() {
  const scene    = getScene();
  const camera   = getCamera();
  const renderer = getRenderer();

  function animate() {
    requestAnimationFrame(animate);

    // Actualizar controles dependiendo del modo
    if (isWalkModeActive()) {
      updateWalkMode();
    } else {
      const controls = getControls();
      if (controls) controls.update();
    }

    // Animación suave de lotes
    animateLots();

    // Actualizar interacción si estamos caminando
    updateInteraction();

    // Monitor de rendimiento
    tickPerformance();

    // Render
    renderer.render(scene, camera);
  }

  animate();
}

// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════
function _fadeOutLoader() {
  const loader = $('loading-screen');
  if (!loader) return;
  loader.classList.add('fade-out');
  setTimeout(() => { loader.style.display = 'none'; }, 900);
}

function _wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Arrancar ────────────────────────────────────
main();
