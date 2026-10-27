/**
 * main.js
 * Punto de entrada — orquesta la inicialización y el render loop.
 */
import { initScene, getScene, getCamera, getRenderer } from './scene.js';
import { setupCamera, getControls, resetCamera, toggleTourMode, isCameraAnimating } from './camera.js';
import { setupLighting, toggleDayNight }               from './lighting.js';
import { createTerrain, toggleSatelliteLayer }         from './terrain.js';
import { createAllManzanas, filterLots, animateLots, updateLabelLOD, getLotMeshes, setLotSelected } from './lots.js';
import { initManzanas, animateManzanaPins, updateManzanaPinsLOD } from './manzanas.js';
import { setupInteraction, updateInteraction }           from './interaction.js';
import { initUI, updateStats, updateCompass, showLotPanel } from './ui.js';
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

    // 4. Todos los lotes del plano completo (30 manzanas con coords reales CAD)
    setProgress(52, 'Generando plano completo...');
    const { center, bounds } = createAllManzanas(data);

    // 4.5 Globos 3D interactivos sobre cada Manzana con animación y zoom
    setProgress(60, 'Creando globos interactivos de manzanas...');
    initManzanas(data);

    // 5. Terreno y calles
    setProgress(68, 'Creando terreno, calles y perímetro...');
    createTerrain(bounds, data.infraestructura);

    // 6. Cámara
    setProgress(78, 'Configurando cámara...');
    setupCamera(center);

    // 7. Interacción
    setProgress(86, 'Configurando interacción...');
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
      const icon = $('day-night-icon');
      if (btn) {
        if (isNight) {
          btn.classList.add('active');
          if (icon) icon.textContent = '☀️';
          document.body.classList.remove('light-mode');
        } else {
          btn.classList.remove('active');
          if (icon) icon.textContent = '🌙';
          document.body.classList.add('light-mode');
        }
      }
    });

    // 8.8 Modo Satélite Google Earth
    window.addEventListener('toggleSatellite', () => {
      const isVisible = toggleSatelliteLayer();
      const btn = $('btn-satellite');
      if (btn) {
        if (isVisible) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    // 9. Listo — fade out del loader
    setProgress(100, '¡Listo!');
    await _wait(350);
    _fadeOutLoader();

    // 9.5 Seleccionar lote inicial de muestra (Lote 12 - Mz. F) como en el diseño de referencia
    const initialLot = getLotMeshes().find(m => m.userData?.lot?.codigo === 'MZ-F-L-12');
    if (initialLot) {
      setLotSelected(initialLot, true);
      showLotPanel(initialLot.userData.lot);
    }

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

  function animate() {
    requestAnimationFrame(animate);

    // 1. LOD de etiquetas de lotes y globos cada 10 frames (a >220m de altura oculta 717 sprites ahorrando draw calls)
    framesSinceLOD++;
    if (framesSinceLOD > 10) {
      framesSinceLOD = 0;
      updateLabelLOD(camera.position.y);
      updateManzanaPinsLOD(camera.position.y);
    }

    // 1.5 Animación armónica flotante de los globos de manzana (arriba y abajo en onda continua)
    const nowSec = performance.now() * 0.001;
    animateManzanaPins(nowSec);

    // 2. Actualizar controles dependiendo del modo
    if (isWalkModeActive()) {
      updateWalkMode();
    } else {
      const controls = getControls();
      if (controls) {
        controls.update();
        updateCompass(controls.getAzimuthalAngle());
      }
    }

    // 3. Animación de lotes seleccionados o en hover
    animateLots();

    // 4. Actualizar interacción si estamos caminando
    updateInteraction();

    // 5. Monitor de rendimiento (FPS)
    tickPerformance();

    // 6. Renderizado continuo fluido a 60 FPS (cuando el tab está oculto o minimizado rAF se pausa a 0% CPU automáticamente)
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
