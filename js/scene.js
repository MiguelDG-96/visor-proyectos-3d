/**
 * scene.js
 * Inicializa la escena Three.js, cámara y renderer.
 * Exporta getters para uso en otros módulos.
 */
import * as THREE from 'three';

let _scene   = null;
let _camera  = null;
let _renderer = null;

/**
 * Inicializa escena, renderer y cámara.
 * @param {HTMLCanvasElement} canvas
 */
export function initScene(canvas) {
  // ── Escena ──────────────────────────────────
  _scene = new THREE.Scene();
  _scene.background = new THREE.Color(0x7ec8f8);
  // Niebla lineal atmosférica de horizonte (cero niebla de 0 a 1600m para máxima nitidez de lotes)
  _scene.fog = new THREE.Fog(0x7ec8f8, 1600, 3800);

  // ── Cámara ──────────────────────────────────
  // near = 1.0 (evita pérdida de precisión Z) y far = 4500 (abarca todo el proyecto y zoom out)
  _camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1.0,
    4500
  );
  _camera.position.set(0, 380, 360);

  // ── Renderer ────────────────────────────────
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  _renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile, // En pantallas móviles de alta densidad DPI el antialias por hardware satura la GPU
    powerPreference: 'high-performance',
    alpha: false,
    logarithmicDepthBuffer: true, // Precisión de profundidad uniforme para escalas urbanas (sin z-fighting)
  });
  _renderer.setSize(window.innerWidth, window.innerHeight);
  // Limitar pixel ratio a 1.25 en móvil y 1.75 en desktop para evitar sobrecalentamiento térmico
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));

  // Sombras optimizadas: calculadas por demanda, no 60 veces por segundo en reposo
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  _renderer.shadowMap.autoUpdate = false;
  _renderer.shadowMap.needsUpdate = true; // Primera pasada para generar sombras iniciales

  _renderer.outputColorSpace = THREE.SRGBColorSpace;
  _renderer.toneMapping = THREE.ACESFilmicToneMapping;
  _renderer.toneMappingExposure = 1.15;

  // ── Resize handler ──────────────────────────
  window.addEventListener('resize', _onResize);
}

function _onResize() {
  if (!_camera || !_renderer) return;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const w = window.innerWidth;
  const h = window.innerHeight;
  _camera.aspect = w / h;
  _camera.updateProjectionMatrix();
  _renderer.setSize(w, h);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
  requestShadowUpdate();
}

/** Notifica al motor que el mapa de sombras debe regenerarse en el siguiente frame */
export function requestShadowUpdate() {
  if (_renderer && _renderer.shadowMap.enabled) {
    _renderer.shadowMap.needsUpdate = true;
  }
}

export const getScene    = () => _scene;
export const getCamera   = () => _camera;
export const getRenderer = () => _renderer;
