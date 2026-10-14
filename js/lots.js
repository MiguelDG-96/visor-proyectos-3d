/**
 * lots.js — LOTIZACIÓN CHÁVEZ PATA (3D Extrusion Poligonal Real)
 *
 * Cada lote se extruye en 3D respetando su geometría vectorial real del CAD.
 * Coordenadas centradas con origen local relativo en UTM Zona 18S.
 */

import * as THREE from 'three';
import { getScene } from './scene.js';

const LOT_HEIGHT = 0.65; // Altura de elevación 3D del lote en metros
const COLORS = {
  disponible: 0x22c55e, // Verde
  reservado:  0xf59e0b, // Ámbar
  vendido:    0xef4444, // Rojo
};

// Materiales para casitas de muestra en lotes vendidos
const houseBaseMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
const houseRoofMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });

let _lotMeshes = [];
let _urbGroup  = null;

/**
 * Crea la lotización 3D completa a partir de los lotes georreferenciados
 * @param {object} jsonData JSON con manzanas y geometrías CAD
 * @returns {{ center: {x, z}, bounds: {minX, maxX, minZ, maxZ} }}
 */
export function createAllManzanas(jsonData) {
  const scene = getScene();

  _urbGroup = new THREE.Group();
  _urbGroup.name = 'urbanizacion_chavez_pata';
  _urbGroup.rotation.y = 0; // Geometría CAD orientada con el norte hacia -Z

  const allX = [];
  const allZ = [];

  const manzanas = jsonData.manzanas || [];

  for (const mzData of manzanas) {
    const mzGroup = new THREE.Group();
    mzGroup.name = mzData.id;

    for (const lot of mzData.lotes) {
      const cx = lot.centroideLocal[0];
      const cz = lot.centroideLocal[1];

      const mesh = _buildLotMesh(lot, cx, cz);
      mzGroup.add(mesh);
      _lotMeshes.push(mesh);

      allX.push(cx);
      allZ.push(cz);
    }

    _urbGroup.add(mzGroup);
  }

  scene.add(_urbGroup);

  // Bounds y centro de la escena
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minZ = Math.min(...allZ);
  const maxZ = Math.max(...allZ);

  const worldCenter = {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2
  };

  const halfSpread = Math.max(maxX - minX, maxZ - minZ) / 2 + 40;
  const worldBounds = {
    minX: worldCenter.x - halfSpread,
    maxX: worldCenter.x + halfSpread,
    minZ: worldCenter.z - halfSpread,
    maxZ: worldCenter.z + halfSpread
  };

  return { center: worldCenter, bounds: worldBounds };
}

/**
 * Construye el Mesh 3D extruido de un lote con su forma poligonal exacta
 */
function _buildLotMesh(lot, cx, cz) {
  let geo;

  // Extrusión poligonal si cuenta con vértices relativos
  if (lot.verticesRel && lot.verticesRel.length >= 3) {
    const shape = new THREE.Shape();
    const v = lot.verticesRel;

    // En Three.js 2D Shape: X horizontal, Y vertical
    // Para que al rotar -90° en X coincida con el plano de suelo (X Este, Z Sur):
    // shape.x = rel_x, shape.y = -rel_z
    shape.moveTo(v[0][0], -v[0][1]);
    for (let i = 1; i < v.length; i++) {
      shape.lineTo(v[i][0], -v[i][1]);
    }
    shape.closePath();

    geo = new THREE.ExtrudeGeometry(shape, {
      depth: LOT_HEIGHT,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04
    });

    // Rotar para colocar la extrusión plana en el suelo horizontal
    geo.rotateX(-Math.PI / 2);
  } else {
    // Fallback a caja
    const fw = lot.frente_m || 8.0;
    const fd = lot.fondo_m || 18.0;
    geo = new THREE.BoxGeometry(fw, LOT_HEIGHT, fd);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: COLORS[lot.estado] ?? COLORS.disponible,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
    roughness: 0.58,
    metalness: 0.05
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, LOT_HEIGHT / 2, cz);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  // Bordes del lote para resaltar linderos
  mesh.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  ));

  // Si el lote está vendido, agregar una casita 3D estilizada
  if (lot.estado === 'vendido') {
    const fw = lot.frente_m || 8.0;
    const fd = lot.fondo_m || 16.0;
    const house = _createSampleHouse(fw, fd);
    house.position.y = (LOT_HEIGHT / 2) + 0.05;
    mesh.add(house);
  }

  // Etiqueta con número de lote (Sprite 2D siempre mirando a la cámara)
  mesh.add(_makeLabel(lot.numero));

  // Metadatos para interacción y animación
  mesh.userData = {
    type: 'lot',
    lot,
    estado: lot.estado,
    baseY: LOT_HEIGHT / 2,
    targetY: LOT_HEIGHT / 2,
    targetEmissive: 0,
    _isSelected: false
  };

  return mesh;
}

/**
 * Crea una etiqueta Sprite circular con el número de lote
 */
function _makeLabel(num) {
  const sz = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const ctx = cv.getContext('2d');

  // Fondo circular
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.beginPath();
  ctx.arc(sz / 2, sz / 2, sz * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Texto
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${sz * 0.42}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), sz / 2, sz / 2);

  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv),
      transparent: true,
      depthTest: false
    })
  );
  spr.scale.set(3.6, 3.6, 1);
  spr.position.set(0, LOT_HEIGHT + 0.8, 0);
  return spr;
}

/**
 * Filtra los lotes por estado
 */
export const getLotMeshes = () => _lotMeshes;

export function filterLots(filter) {
  _lotMeshes.forEach(m => {
    m.visible = filter === 'all' || m.userData.estado === filter;
  });
}

export function setLotHovered(mesh, hovered) {
  if (!mesh?.userData?.type || mesh.userData._isSelected) return;
  mesh.userData.targetY = hovered ? mesh.userData.baseY + 1.2 : mesh.userData.baseY;
  mesh.userData.targetEmissive = hovered ? 0.30 : 0;
}

export function setLotSelected(mesh, selected) {
  if (!mesh?.userData) return;
  mesh.userData._isSelected = selected;
  mesh.userData.targetY = selected ? mesh.userData.baseY + 2.8 : mesh.userData.baseY;
  mesh.userData.targetEmissive = selected ? 0.65 : 0;
}

export function animateLots() {
  const lf = 0.12;
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

/**
 * Crea una vivienda low-poly estilizada para los lotes vendidos
 */
function _createSampleHouse(fw, fd) {
  const houseGroup = new THREE.Group();
  
  const baseW = Math.max(fw * 0.55, 3.5);
  const baseD = Math.max(fd * 0.50, 6.0);
  const baseH = 3.6;

  const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
  const baseMesh = new THREE.Mesh(baseGeo, houseBaseMat);
  baseMesh.position.y = baseH / 2;
  baseMesh.castShadow = true;
  houseGroup.add(baseMesh);

  // Techo a 4 aguas
  const roofGeo = new THREE.ConeGeometry(Math.max(baseW, baseD) * 0.65, 2.2, 4);
  const roofMesh = new THREE.Mesh(roofGeo, houseRoofMat);
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.position.y = baseH + 1.1;
  roofMesh.castShadow = true;
  houseGroup.add(roofMesh);

  return houseGroup;
}
