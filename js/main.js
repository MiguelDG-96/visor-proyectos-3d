/**
 * main.js
 * Punto de entrada — orquesta la inicialización y el render loop.
 */
import { initScene, getScene, getCamera, getRenderer } from './scene.js';
import { setupCamera, getControls, resetCamera, toggleTourMode } from './camera.js';
import { setupLighting, toggleDayNight }               from './lighting.js';
import { createTerrain }                               from './terrain.js';
import { createAllManzanas, filterLots, animateLots, updateLabelLOD } from './lots.js';
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
    setProgress(65, 'Creando terreno, calles y perímetro...');
    createTerrain(bounds, data.infraestructura);

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

    // 8.7 Modo Día / Noche (Inicia en modo día / claro)
    document.body.classList.add('light-mode');
    window.addEventListener('toggleDayNight', () => {
      const isNight = toggleDayNight();
      const btn = $('btn-day-night');
      if (btn) {
        if (isNight) {
          btn.classList.add('active');
          btn.textContent = '☀️'; // Cambia ícono a sol
          document.body.classList.remove('light-mode');
        } else {
          btn.classList.remove('active');
          btn.textContent = '🌙'; // Cambia ícono a luna
          document.body.classList.add('light-mode');
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
// Loop de render con Ahorro Inteligente de Energía e Idle Throttling
// ══════════════════════════════════════════════
function _startRenderLoop() {
  const scene    = getScene();
  const camera   = getCamera();
  const renderer = getRenderer();

  let framesSinceLOD = 0;
  let lastCamX = 0, lastCamY = 0, lastCamZ = 0;
  let lastRotX = 0, lastRotY = 0, lastRotZ = 0;
  let idleCounter = 0;

  function animate() {
    requestAnimationFrame(animate);

    // 1. LOD de etiquetas de lotes cada 10 frames (a >220m de altura oculta 717 sprites ahorrando draw calls)
    framesSinceLOD++;
    if (framesSinceLOD > 10) {
      framesSinceLOD = 0;
      updateLabelLOD(camera.position.y);
    }

    // 2. Actualizar controles dependiendo del modo
    let controlsActive = false;
    if (isWalkModeActive()) {
      updateWalkMode();
      controlsActive = true;
    } else {
      const controls = getControls();
      if (controls) {
        controls.update();
        if (controls.autoRotate) controlsActive = true;
      }
    }

    // 3. Animación de lotes (devuelve true solo si hay algún lote activo en transición)
    const lotsAnimating = animateLots();

    // 4. Actualizar interacción si estamos caminando
    updateInteraction();

    // 5. Monitor de rendimiento (FPS)
    tickPerformance();

    // 6. Detección de movimiento de cámara para reposo inteligente
    const camMoved = Math.abs(camera.position.x - lastCamX) > 0.001 ||
                     Math.abs(camera.position.y - lastCamY) > 0.001 ||
                     Math.abs(camera.position.z - lastCamZ) > 0.001 ||
                     Math.abs(camera.rotation.x - lastRotX) > 0.0001 ||
                     Math.abs(camera.rotation.y - lastRotY) > 0.0001 ||
                     Math.abs(camera.rotation.z - lastRotZ) > 0.0001;

    lastCamX = camera.position.x;
    lastCamY = camera.position.y;
    lastCamZ = camera.position.z;
    lastRotX = camera.rotation.x;
    lastRotY = camera.rotation.y;
    lastRotZ = camera.rotation.z;

    const isBusy = controlsActive || lotsAnimating || camMoved;

    if (isBusy) {
      idleCounter = 0;
      renderer.render(scene, camera);
    } else {
      idleCounter++;
      // Renderiza hasta 5 frames posteriores al cese de movimiento para estabilización perfecta
      if (idleCounter <= 5) {
        renderer.render(scene, camera);
      }
      // En reposo absoluto (idleCounter > 5), NO satura la GPU ni calienta la laptop/móvil
    }
  }

  // Reactivar renderizado al primer toque, clic, tecla o rueda del usuario
  window.addEventListener('pointerdown', () => { idleCounter = 0; }, { passive: true });
  window.addEventListener('wheel',       () => { idleCounter = 0; }, { passive: true });
  window.addEventListener('touchstart',  () => { idleCounter = 0; }, { passive: true });
  window.addEventListener('keydown',     () => { idleCounter = 0; }, { passive: true });

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
