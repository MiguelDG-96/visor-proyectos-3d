/**
 * lots.js — PLANO COMPLETO (construcción algorítmica)
 *
 * Cada manzana se construye fila por fila, lote por lote, en el ESPACIO LOCAL
 * de un grupo Three.js que está rotado -35.1° (ángulo real del urbanismo).
 *
 * Coordenadas de anclaje derivadas del análisis PDF:
 *   escala: 9.08 pts/m · ángulo: 35.1° · referencia: centro Mz-A = (0,0)
 *
 * Estructura de cada manzana en espacio local del grupo URB:
 *   X = dirección frente (a lo largo de la calle)
 *   Z = dirección fondo (perpendicular, fondo del lote)
 *   Fila 1: z ∈ [0, 20]   Fila 2: z ∈ [20, 40]
 */

import * as THREE from 'three';
import { getScene } from './scene.js';

const LOT_HEIGHT = 0.55;
const LOT_GAP    = 0.10;
const URB_ANGLE  = THREE.MathUtils.degToRad(-35.1); // rotación del urbanismo

const COLORS = {
  disponible: 0x22c55e,
  reservado:  0xf59e0b,
  vendido:    0xef4444,
};

// ── Geometrías cacheadas para casas de muestra ──────
const houseBaseMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // Casa blanca
const houseRoofMat = new THREE.MeshLambertMaterial({ color: 0x3b2f2f }); // Techo oscuro

// ── Configuración de manzanas ─────────────────────
//
// anchor [x, z]: extremo superior-izquierdo de la Fila 1 en espacio LOCAL del URB_GROUP.
//   Derivado del análisis: Mz-A L1 → local(-28.31,−11.31), corner=(-32.7,−21.3)
//
// rows: arreglos de números de lote en orden IZQUIERDA→DERECHA para cada fila.
//   Fila 2 suele estar numerada en sentido contrario (comparten pared trasera con Fila 1).
//
const MANZANA_CONFIG = {

  'MZ-A': {
    // Lotes 1-11 (irregulares, frente decreciente), 12-22 (estándar 6 m)
    anchor: [-32.7, -21.3],
    rows: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      [22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12],
    ],
  },

  'MZ-B': {
    // Lotes 1-10 (irregulares, L8 es lote esquina 260 m²), 11-18 (estándar)
    anchor: [44.0, -7.4],
    rows: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [18, 17, 16, 15, 14, 13, 12, 11],
    ],
  },

  'MZ-C': {
    // 23 lotes. Fila 1: L1-L11 (mixtos: estándar + irregulares L4-L9).
    // Fila 2: L12-L23 (todos estándar 120 m²).
    anchor: [-31.24, 36.14],
    rows: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12],
    ],
  },

  'MZ-D': {
    // 11 lotes, manzana irregular. Fila 1: L1-L8. Fila 2 (corta): L9-L11.
    anchor: [43.9, 37.0],
    rows: [
      [1, 2, 3, 4, 5, 6, 7, 8],
      [11, 10, 9],
    ],
  },
};

// ── Estado interno ─────────────────────────────────
let _lotMeshes = [];
let _urbGroup  = null;

// ══════════════════════════════════════════════════
// API pública
// ══════════════════════════════════════════════════

/**
 * Crea el urbanismo completo: URB_GROUP rotado, 4 manzanas con lotes ordenados.
 * @param {object} jsonData  JSON completo del proyecto
 * @returns {{ center, bounds }}
 */
export function createAllManzanas(jsonData) {
  const scene = getScene();

  _urbGroup = new THREE.Group();
  _urbGroup.name = 'urbanizacion';
  _urbGroup.rotation.y = URB_ANGLE;

  const allLocalX = [];
  const allLocalZ = [];

  for (const [mzId, cfg] of Object.entries(MANZANA_CONFIG)) {
    const mzData = jsonData.manzanas.find(m => m.id === mzId);
    if (!mzData) continue;

    const mzGroup = new THREE.Group();
    mzGroup.name  = mzId;

    // Anclaje de la manzana en el espacio LOCAL del URB_GROUP
    mzGroup.position.set(cfg.anchor[0], 0, cfg.anchor[1]);

    cfg.rows.forEach((rowNums, rowIdx) => {
      let xCursor = 0;
      const rowZOffset = rowIdx * 20; // cada fila tiene 20 m de fondo

      rowNums.forEach(lotNum => {
        const lot = mzData.lotes.find(l => l.numero === lotNum);
        if (!lot) return;

        const fw = lot.frente_m;   // ancho a lo largo de X local
        const fd = lot.fondo_m;    // profundidad a lo largo de Z local

        const cx = xCursor + fw / 2;
        const cz = rowZOffset + fd / 2;

        const mesh = _buildLotMesh(lot, cx, cz, fw, fd);
        mzGroup.add(mesh);
        _lotMeshes.push(mesh);

        // Acumular bounds en espacio URB LOCAL
        allLocalX.push(cfg.anchor[0] + cx);
        allLocalZ.push(cfg.anchor[1] + cz);

        xCursor += fw;
      });
    });

    _urbGroup.add(mzGroup);
  }

  scene.add(_urbGroup);

  // ── Calcular bounds y centro en world-space ─────
  const lMinX = Math.min(...allLocalX) - 15;
  const lMaxX = Math.max(...allLocalX) + 15;
  const lMinZ = Math.min(...allLocalZ) - 15;
  const lMaxZ = Math.max(...allLocalZ) + 15;

  const lCx = (lMinX + lMaxX) / 2;
  const lCz = (lMinZ + lMaxZ) / 2;

  // Rotar centro local → world (aplicar rotación del URB_GROUP)
  const cosA = Math.cos(URB_ANGLE);
  const sinA = Math.sin(URB_ANGLE);
  const worldCenter = {
    x: lCx * cosA - lCz * sinA,
    z: lCx * sinA + lCz * cosA,
  };

  const halfSpread = Math.max(lMaxX - lMinX, lMaxZ - lMinZ) / 2 + 25;
  const worldBounds = {
    minX: worldCenter.x - halfSpread,
    maxX: worldCenter.x + halfSpread,
    minZ: worldCenter.z - halfSpread,
    maxZ: worldCenter.z + halfSpread,
  };

  return { center: worldCenter, bounds: worldBounds };
}

// ══════════════════════════════════════════════════
// Privado: crear mesh de lote
// ══════════════════════════════════════════════════

function _buildLotMesh(lot, cx, cz, fw, fd) {
  const gw = Math.max(fw - LOT_GAP, 0.2);  // frente con gap
  const gd = Math.max(fd - LOT_GAP, 0.2);  // fondo con gap

  // BoxGeometry: X = frente (calle), Y = altura, Z = fondo (profundidad del lote)
  const geo = new THREE.BoxGeometry(gw, LOT_HEIGHT, gd);

  const mat = new THREE.MeshStandardMaterial({
    color:             COLORS[lot.estado] ?? COLORS.disponible,
    emissive:          new THREE.Color(0x000000),
    emissiveIntensity: 0,
    roughness:         0.62,
    metalness:         0.04,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, LOT_HEIGHT / 2, cz);
  mesh.receiveShadow = true;

  // Bordes del lote
  mesh.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
  ));

  // Si el lote está vendido, agregar una casita de muestra (Opción 3)
  if (lot.estado === 'vendido') {
    const house = _createSampleHouse(gw, gd);
    // Posicionarla encima del lote
    house.position.y = (LOT_HEIGHT / 2) + 0.05;
    mesh.add(house);
  }

  // Etiqueta con número
  mesh.add(_makeLabel(lot.numero));

  // Datos para interacción y animación
  mesh.userData = {
    type: 'lot',
    lot,
    estado:          lot.estado,
    baseY:           LOT_HEIGHT / 2,
    targetY:         LOT_HEIGHT / 2,
    targetEmissive:  0,
    _isSelected:     false,
  };

  return mesh;
}

function _makeLabel(num) {
  const sz  = 256;
  const cv  = document.createElement('canvas');
  cv.width  = cv.height = sz;
  const ctx = cv.getContext('2d');

  // Círculo fondo
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(sz / 2, sz / 2, sz * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Número
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold ${sz * 0.38}px Inter, Arial, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), sz / 2, sz / 2);

  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map:         new THREE.CanvasTexture(cv),
      transparent: true,
      depthTest:   false,
    })
  );
  spr.scale.set(3.2, 3.2, 1);
  spr.position.set(0, LOT_HEIGHT / 2 + 0.05, 0);
  return spr;
}

// ══════════════════════════════════════════════════
// Filtros y animación
// ══════════════════════════════════════════════════

export const getLotMeshes = () => _lotMeshes;

export function filterLots(filter) {
  _lotMeshes.forEach(m => {
    m.visible = filter === 'all' || m.userData.estado === filter;
  });
}

export function setLotHovered(mesh, hovered) {
  if (!mesh?.userData?.type || mesh.userData._isSelected) return;
  mesh.userData.targetY        = hovered ? mesh.userData.baseY + 1.0 : mesh.userData.baseY;
  mesh.userData.targetEmissive = hovered ? 0.22 : 0;
}

export function setLotSelected(mesh, selected) {
  if (!mesh?.userData) return;
  mesh.userData._isSelected    = selected;
  mesh.userData.targetY        = selected ? mesh.userData.baseY + 2.4 : mesh.userData.baseY;
  mesh.userData.targetEmissive = selected ? 0.55 : 0;
}

export function animateLots() {
  const lf = 0.11;
  _lotMeshes.forEach(mesh => {
    if (!mesh.userData?.type) return;
    const dy = mesh.userData.targetY - mesh.position.y;
    if (Math.abs(dy) > 0.001) mesh.position.y += dy * lf;
    const de = mesh.userData.targetEmissive - mesh.material.emissiveIntensity;
    if (Math.abs(de) > 0.001) {
      mesh.material.emissiveIntensity += de * lf;
      mesh.material.emissive.setHex(0xffffff);
    }
  });
}

// ── Helpers de Casa ────────────────────────────────
/** Crea un grupo 3D con forma de casa pequeña */
function _createSampleHouse(gw, gd) {
  const houseGroup = new THREE.Group();
  
  // Base de la casa (ocupa 60% del ancho y 50% del fondo)
  const baseW = Math.max(gw * 0.6, 3);
  const baseD = Math.max(gd * 0.5, 6);
  const baseH = 3.5; // altura de 1 piso

  const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
  const baseMesh = new THREE.Mesh(baseGeo, houseBaseMat);
  baseMesh.position.y = baseH / 2;
  baseMesh.castShadow = true;
  houseGroup.add(baseMesh);

  // Techo (pirámide / cono de 4 lados)
  const roofGeo = new THREE.ConeGeometry(Math.max(baseW, baseD) * 0.6, 2, 4);
  const roofMesh = new THREE.Mesh(roofGeo, houseRoofMat);
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.position.y = baseH + 1.0;
  roofMesh.castShadow = true;
  houseGroup.add(roofMesh);

  return houseGroup;
}
