/**
 * camera.js — OrbitControls y Cámara para Chávez Pata
 */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getCamera, getRenderer } from './scene.js';

let _controls = null;
let _projectCenter = { x: 0, z: 0 };

/**
 * Configura OrbitControls y posiciona la cámara sobre el plano de Chávez Pata
 * @param {{ x: number, z: number }} center Centro del proyecto en world-space
 */
export function setupCamera(center) {
  _projectCenter = center;
  const camera = getCamera();
  const renderer = getRenderer();

  // Vista aérea global abarcando todo el proyecto (730m de extensión)
  camera.position.set(center.x, 380, center.z + 360);

  _controls = new OrbitControls(camera, renderer.domElement);
  _controls.target.set(center.x, 0, center.z);
  _controls.enableDamping = true;
  _controls.dampingFactor = 0.08;
  _controls.minDistance = 5;
  _controls.maxDistance = 1250; // Calibrado para que la capa satelital cubra todo el encuadre sin que asomen los bordes
  _controls.maxPolarAngle = Math.PI / 2.15; // Evita ángulo rasante que exponga el horizonte fuera del plano
  _controls.screenSpacePanning = false;
  _controls.update();
}

let _currentAnimId = null;

export const isCameraAnimating = () => _currentAnimId !== null;

/**
 * Anima suavemente la cámara y el target de OrbitControls a una nueva posición
 */
export function animateCameraTo(targetPos, targetLookAt, onComplete) {
  if (_currentAnimId) {
    cancelAnimationFrame(_currentAnimId);
    _currentAnimId = null;
  }

  const camera = getCamera();
  if (!_controls) return;

  let frame = 0;
  const totalFrames = 50;

  const startPos = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  };
  const startTarget = {
    x: _controls.target.x,
    y: _controls.target.y,
    z: _controls.target.z
  };

  function animStep() {
    frame++;
    const t = _easeOut(frame / totalFrames);

    camera.position.set(
      _lerp(startPos.x, targetPos.x, t),
      _lerp(startPos.y, targetPos.y, t),
      _lerp(startPos.z, targetPos.z, t)
    );
    _controls.target.set(
      _lerp(startTarget.x, targetLookAt.x, t),
      _lerp(startTarget.y, targetLookAt.y, t),
      _lerp(startTarget.z, targetLookAt.z, t)
    );
    _controls.update();

    if (frame < totalFrames) {
      _currentAnimId = requestAnimationFrame(animStep);
    } else {
      _currentAnimId = null;
      if (onComplete) onComplete();
    }
  }
  _currentAnimId = requestAnimationFrame(animStep);
}

/** Regresa la cámara a la vista aérea inicial con animación suave */
export function resetCamera() {
  const cx = _projectCenter.x;
  const cz = _projectCenter.z;
  animateCameraTo(
    { x: cx, y: 380, z: cz + 360 },
    { x: cx, y: 0, z: cz }
  );
}

/**
 * Realiza un zoom cinemático enfocado en una manzana específica para ampliar la vista
 * @param {object} mz Objeto de datos de la manzana { cx, cz, radius, id }
 */
export function focusOnManzana(mz) {
  const cx = mz.cx;
  const cz = mz.cz;
  const r  = mz.radius || 40;

  // Altura y encuadre óptimo según las dimensiones de la manzana
  const altitude = Math.max(r * 1.50, 65);
  const offsetZ  = Math.max(r * 1.40, 60);

  const targetPos = {
    x: cx,
    y: altitude,
    z: cz + offsetZ
  };
  const targetLookAt = {
    x: cx,
    y: 0,
    z: cz
  };

  animateCameraTo(targetPos, targetLookAt);
}

export const getControls = () => _controls;

let _isTourMode = false;
export function toggleTourMode() {
  _isTourMode = !_isTourMode;
  if (!_controls) return _isTourMode;
  
  if (_isTourMode) {
    _controls.autoRotate = true;
    _controls.autoRotateSpeed = 1.2;
    const camera = getCamera();
    camera.position.y = Math.max(camera.position.y * 0.65, 120);
  } else {
    _controls.autoRotate = false;
  }
  return _isTourMode;
}

function _lerp(a, b, t) { return a + (b - a) * t; }
function _easeOut(t) { return 1 - Math.pow(1 - t, 3); }
