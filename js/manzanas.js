/**
 * manzanas.js — Globos flotantes interactivos para cada Manzana
 *
 * Crea pines/globos 3D tipo waypoints sobre cada manzana con:
 * - Animación armónica flotante (arriba y abajo).
 * - Detección de clics para zoom cinemático con ampliación de vista.
 * - LOD inteligente para no obstruir los lotes al acercarse.
 */
import * as THREE from 'three';
import { getScene } from './scene.js';

let _manzanaPins  = [];
let _manzanaData  = new Map();
let _manzanasList = [];
let _pinsGroup    = null;

/**
 * Inicializa y genera los globos de manzana a partir del dataset
 * @param {object} jsonData Objeto con array de manzanas y lotes
 */
export function initManzanas(jsonData) {
  const scene = getScene();

  if (_pinsGroup) {
    scene.remove(_pinsGroup);
    _pinsGroup.clear();
  }

  _pinsGroup = new THREE.Group();
  _pinsGroup.name = 'globos_manzanas';
  _pinsGroup.renderOrder = 999;
  _manzanaPins = [];
  _manzanaData.clear();
  _manzanasList = [];

  const manzanas = jsonData.manzanas || [];

  manzanas.forEach((mz, index) => {
    if (!mz.lotes || mz.lotes.length === 0) return;

    // 1. Calcular centroide y radio de la manzana
    const xs = mz.lotes.map(l => l.centroideLocal[0]);
    const zs = mz.lotes.map(l => l.centroideLocal[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const radius = Math.max(maxX - minX, maxZ - minZ) / 2;

    // Estadísticas
    const totalLots = mz.lotes.length;
    const disp = mz.lotes.filter(l => l.estado === 'disponible').length;
    const res  = mz.lotes.filter(l => l.estado === 'reservado').length;
    const vend = mz.lotes.filter(l => l.estado === 'vendido').length;

    const data = {
      id: mz.id,
      nombre: mz.nombre || mz.id,
      cx,
      cz,
      radius,
      totalLots,
      disp,
      res,
      vend,
      index
    };

    _manzanaData.set(mz.id, data);
    _manzanasList.push(data);

    // 2. Crear textura de globo en Canvas de alta resolución
    const texture = _createBalloonTexture(data);

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.98
    });

    const sprite = new THREE.Sprite(spriteMat);
    const scaleX = 24.0;
    const scaleY = 15.0;
    sprite.scale.set(scaleX, scaleY, 1);
    sprite.renderOrder = 999;

    // Altura base proporcional al radio para mejor visibilidad aérea
    const baseY = Math.max(radius * 0.35 + 18, 22);
    sprite.position.set(cx, baseY, cz);

    // Sombra o base en el suelo para anclaje visual 3D
    const discGeo = new THREE.CircleGeometry(2.4, 16);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.40,
      depthWrite: false
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(cx, 0.12, cz);
    disc.renderOrder = 2;
    _pinsGroup.add(disc);

    // Guardar metadata en userData para raycasting y animación
    sprite.userData = {
      type: 'manzana_pin',
      manzana: data,
      baseY,
      phase: index * 0.42, // desfase armónico para efecto de ola suave
      amp: 2.2,             // oscilación de ±2.2 metros
      baseScaleX: scaleX,
      baseScaleY: scaleY,
      discMesh: disc,
      isHovered: false
    };

    _pinsGroup.add(sprite);
    _manzanaPins.push(sprite);
  });

  scene.add(_pinsGroup);
  return _manzanasList;
}

/**
 * Dibuja un globo estilizado tipo badge moderno en Canvas 2D
 */
function _createBalloonTexture(data) {
  const w = 320;
  const h = 200;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');

  // Sombra suave en el globo
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  // Dibujar forma de globo (rectángulo redondeado con pico inferior apuntando a la manzana)
  const pad = 12;
  const bw = w - pad * 2;
  const bh = 135;
  const r = 24;
  const tipX = w / 2;
  const tipY = h - 16;

  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(pad + bw - r, pad);
  ctx.quadraticCurveTo(pad + bw, pad, pad + bw, pad + r);
  ctx.lineTo(pad + bw, pad + bh - r);
  ctx.quadraticCurveTo(pad + bw, pad + bh, pad + bw - r, pad + bh);
  // Pico del globo
  ctx.lineTo(tipX + 18, pad + bh);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(tipX - 18, pad + bh);
  ctx.lineTo(pad + r, pad + bh);
  ctx.quadraticCurveTo(pad, pad + bh, pad, pad + bh - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();

  // Fondo degradado moderno azul marino oscuro
  const grad = ctx.createLinearGradient(0, pad, 0, tipY);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fill();

  // Borde brillante cian/eléctrico
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Icono indicador o punto verde disponible
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(pad + 32, pad + 38, 8, 0, Math.PI * 2);
  ctx.fill();

  // Texto principal: ID de la Manzana (ej: MZ-A, MZ-N)
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.id, pad + 48, pad + 40);

  // Divisor sutil
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad + 20, pad + 78);
  ctx.lineTo(pad + bw - 20, pad + 78);
  ctx.stroke();

  // Subtítulo con cantidad de lotes y estado
  ctx.font = '600 28px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${data.totalLots} Lotes`, pad + 24, pad + 104);

  // Indicador de disponibles en verde claro
  ctx.font = 'bold 26px "Inter", sans-serif';
  ctx.fillStyle = '#4ade80';
  ctx.textAlign = 'right';
  ctx.fillText(`${data.disp} disp.`, pad + bw - 24, pad + 104);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * Actualiza el movimiento armónico de arriba hacia abajo de cada globo
 * @param {number} time Tiempo en segundos
 */
export function animateManzanaPins(time) {
  if (_manzanaPins.length === 0) return;

  const speed = 2.1; // frecuencia suave
  for (let i = 0; i < _manzanaPins.length; i++) {
    const pin = _manzanaPins[i];
    const u = pin.userData;
    
    // Movimiento senoidal vertical suave
    const dy = Math.sin(time * speed + u.phase) * u.amp;
    pin.position.y = u.baseY + dy;

    // Si tiene disco en el suelo, respira armónicamente
    if (u.discMesh) {
      const discScale = 1.0 + Math.sin(time * speed + u.phase) * 0.18;
      u.discMesh.scale.set(discScale, discScale, discScale);
    }
  }
}

/**
 * Control de nivel de detalle (LOD):
 * Si la cámara está muy cerca de los lotes (<80m), los globos se atenúan
 * para no estorbar la selección de lotes individuales.
 */
export function updateManzanaPinsLOD(cameraAltitude) {
  const isClose = cameraAltitude < 75;
  const targetOpacity = isClose ? 0.38 : 0.98;
  const targetScaleMul = isClose ? 0.85 : 1.0;

  for (let i = 0; i < _manzanaPins.length; i++) {
    const pin = _manzanaPins[i];
    if (pin.material.opacity !== targetOpacity) {
      pin.material.opacity = targetOpacity;
    }
    const targetScaleX = pin.userData.baseScaleX * targetScaleMul;
    const targetScaleY = pin.userData.baseScaleY * targetScaleMul;
    if (Math.abs(pin.scale.x - targetScaleX) > 0.05) {
      pin.scale.set(targetScaleX, targetScaleY, 1);
    }
  }
}

/**
 * Efecto hover al pasar el cursor sobre un globo de manzana
 */
export function setPinHovered(pin, hovered) {
  if (!pin || !pin.userData) return;
  pin.userData.isHovered = hovered;
  const mul = hovered ? 1.18 : 1.0;
  pin.scale.set(
    pin.userData.baseScaleX * mul,
    pin.userData.baseScaleY * mul,
    1
  );
}

export const getManzanaPins = () => _manzanaPins;
export const getManzanasList = () => _manzanasList;
export const getManzanaById = (id) => _manzanaData.get(id);

