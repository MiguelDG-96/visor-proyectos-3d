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
  _scene.background = new THREE.Color(0x87b4d0);
  _scene.fog = new THREE.FogExp2(0x87b4d0, 0.007);

  // ── Cámara ──────────────────────────────────
  _camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );
  _camera.position.set(0, 80, 60);

  // ── Renderer ────────────────────────────────
  _renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
  _renderer.toneMapping = THREE.ACESFilmicToneMapping;
  _renderer.toneMappingExposure = 1.15;

  // ── Resize handler ──────────────────────────
  window.addEventListener('resize', _onResize);
}

function _onResize() {
  if (!_camera || !_renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  _camera.aspect = w / h;
  _camera.updateProjectionMatrix();
  _renderer.setSize(w, h);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

export const getScene    = () => _scene;
export const getCamera   = () => _camera;
export const getRenderer = () => _renderer;
