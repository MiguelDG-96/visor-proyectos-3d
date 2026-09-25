/**
 * camera.js
 * OrbitControls, posiciones preset y reset de cámara.
 */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getCamera, getRenderer } from './scene.js';

let _controls    = null;
let _manzanaCenter = { x: 0, z: 0 };

/**
 * Configura OrbitControls y posiciona la cámara sobre la manzana.
 * @param {{ x: number, z: number }} center  Centro de la manzana en world-space
 */
export function setupCamera(center) {
  _manzanaCenter = center;
  const camera   = getCamera();
  const renderer = getRenderer();

  // Vista aérea ajustada para centrar el plano y evitar superposición con la UI inferior
  camera.position.set(center.x, 130, center.z + 90);

  _controls = new OrbitControls(camera, renderer.domElement);
  // Desplazar el target ligeramente en +Z para que el centro visual del plano suba en la pantalla
  _controls.target.set(center.x, 0, center.z + 15);
  _controls.enableDamping   = true;
  _controls.dampingFactor   = 0.07;
  _controls.minDistance     = 8;
  _controls.maxDistance     = 400;
  _controls.maxPolarAngle   = Math.PI / 2.05;
  _controls.screenSpacePanning = false;
  _controls.update();
}

/** Regresa la cámara a la vista aérea inicial con animación suave. */
export function resetCamera() {
  const camera = getCamera();
  const cx = _manzanaCenter.x;
  const cz = _manzanaCenter.z;

  // Mismas coordenadas de la posición inicial para centrar correctamente
  const targetPos    = { x: cx, y: 130, z: cz + 90 };
  const targetLookAt = { x: cx, y: 0,   z: cz + 15 };

  let frame = 0;
  const totalFrames = 40;

  const startPos = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  };
  const startTarget = {
    x: _controls.target.x,
    y: _controls.target.y,
    z: _controls.target.z,
  };

  function animStep() {
    frame++;
    const t = _easeOut(frame / totalFrames);

    camera.position.set(
      _lerp(startPos.x, targetPos.x, t),
      _lerp(startPos.y, targetPos.y, t),
      _lerp(startPos.z, targetPos.z, t),
    );
    _controls.target.set(
      _lerp(startTarget.x, targetLookAt.x, t),
      _lerp(startTarget.y, targetLookAt.y, t),
      _lerp(startTarget.z, targetLookAt.z, t),
    );
    _controls.update();

    if (frame < totalFrames) requestAnimationFrame(animStep);
  }
  requestAnimationFrame(animStep);
}

export const getControls = () => _controls;

let _isTourMode = false;
export function toggleTourMode() {
  _isTourMode = !_isTourMode;
  if (!_controls) return _isTourMode;
  
  if (_isTourMode) {
    // Iniciar tour
    _controls.autoRotate = true;
    _controls.autoRotateSpeed = 1.5; // velocidad de giro
    // Bajar un poco la cámara para una vista más isométrica
    const camera = getCamera();
    camera.position.y = Math.max(camera.position.y * 0.7, 40);
  } else {
    // Detener tour
    _controls.autoRotate = false;
  }
  return _isTourMode;
}

// ── Helpers ────────────────────────────────────
function _lerp(a, b, t) { return a + (b - a) * t; }
function _easeOut(t)     { return 1 - Math.pow(1 - t, 3); }
