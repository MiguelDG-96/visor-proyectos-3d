/**
 * terrain.js — Suelo, Red Vial Real y Perímetro de Chávez Pata
 */
import * as THREE from 'three';
import { getScene } from './scene.js';

let _groundMat       = null;
let _asphaltMat      = null;
let _asphaltMesh     = null;
let _satRegionalMesh = null;
let _satDetailMesh   = null;
let _satVisible      = true;

export function updateTerrainDayNight(isNight) {
  if (isNight) {
    if (_groundMat)       _groundMat.color.setHex(0x0f1810);
    if (_asphaltMat)      _asphaltMat.color.setHex(0x19202a);
    if (_satRegionalMesh) _satRegionalMesh.material.opacity = 0.55;
    if (_satDetailMesh)   _satDetailMesh.material.opacity   = 0.55;
  } else {
    if (_groundMat)       _groundMat.color.setHex(0x1a2e1d); // Verde bosque profundo que armoniza con la selva
    if (_asphaltMat)      _asphaltMat.color.setHex(0x525e70);
    if (_satRegionalMesh) _satRegionalMesh.material.opacity = 0.98;
    if (_satDetailMesh)   _satDetailMesh.material.opacity   = 0.98;
  }
}

export function toggleSatelliteLayer() {
  _satVisible = !_satVisible;
  if (_satRegionalMesh) _satRegionalMesh.visible = _satVisible;
  if (_satDetailMesh)   _satDetailMesh.visible   = _satVisible;
  if (_asphaltMesh)     _asphaltMesh.visible     = !_satVisible; // Oculta el bloque gris cuando el satélite está activo
  return _satVisible;
}

export function createTerrain(bounds, infra = {}) {
  const scene = getScene();

  // 1. Suelo base amplio (3600m x 3600m) en verde bosque natural que se funde en el horizonte
  const groundGeo = new THREE.PlaneGeometry(3600, 3600);
  _groundMat = new THREE.MeshLambertMaterial({ color: 0x1a2e1d });
  const ground = new THREE.Mesh(groundGeo, _groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  scene.add(ground);

  const textureLoader = new THREE.TextureLoader();

  // 1.5 Capa Satelital Regional Amplia (Zoom 15: 3,040m x 3,040m — Río Mayo, bosques, colinas y carreteras)
  textureLoader.load('./assets/images/satelite-regional-z15.png', (regTex) => {
    regTex.colorSpace = THREE.SRGBColorSpace;
    regTex.minFilter = THREE.LinearMipmapLinearFilter;

    const regGeo = new THREE.PlaneGeometry(3040.7, 3040.7);
    const regMat = new THREE.MeshBasicMaterial({
      map: regTex,
      transparent: true,
      opacity: 0.98
    });
    _satRegionalMesh = new THREE.Mesh(regGeo, regMat);
    _satRegionalMesh.rotation.x = -Math.PI / 2;
    _satRegionalMesh.position.set(10.76, 0.005, -6.37);
    _satRegionalMesh.receiveShadow = true;
    _satRegionalMesh.name = 'satelite_regional_3km';
    scene.add(_satRegionalMesh);
  });

  // 1.6 Capa Satelital Detallada de los Lotes (Zoom 17: 760m x 760m — Máxima resolución en las manzanas)
  textureLoader.load('./assets/images/satelite-chavez-pata.png', (detTex) => {
    detTex.colorSpace = THREE.SRGBColorSpace;
    detTex.minFilter = THREE.LinearMipmapLinearFilter;

    const detGeo = new THREE.PlaneGeometry(760.18, 760.18);
    const detMat = new THREE.MeshBasicMaterial({
      map: detTex,
      transparent: true,
      opacity: 0.98
    });
    _satDetailMesh = new THREE.Mesh(detGeo, detMat);
    _satDetailMesh.rotation.x = -Math.PI / 2;
    _satDetailMesh.position.set(10.76, 0.012, -6.37);
    _satDetailMesh.receiveShadow = true;
    _satDetailMesh.name = 'satelite_detalle_lotes';
    scene.add(_satDetailMesh);
  });

  // 2. Base de asfalto urbana bajo la lotización (oculta por defecto mientras el satélite esté activo)
  const asphaltGeo = new THREE.PlaneGeometry(750, 1050);
  _asphaltMat = new THREE.MeshLambertMaterial({ color: 0x525e70 });
  _asphaltMesh = new THREE.Mesh(asphaltGeo, _asphaltMat);
  _asphaltMesh.rotation.x = -Math.PI / 2;
  _asphaltMesh.position.set(20, -0.02, 0);
  _asphaltMesh.receiveShadow = true;
  _asphaltMesh.visible = false; // Evita que asome el rectángulo gris debajo de la foto satelital
  scene.add(_asphaltMesh);

  const infraGroup = new THREE.Group();
  infraGroup.name = 'infraestructura_vial';
  scene.add(infraGroup);

  // 3. Dibujar Red Vial Vectorial Real del CAD (Vías, ejes y calzadas)
  if (infra.vias && infra.vias.length > 0) {
    const roadLineMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      linewidth: 2,
      transparent: true,
      opacity: 0.65
    });

    const centerlineMat = new THREE.LineDashedMaterial({
      color: 0xfacc15, // Eje central amarillo
      dashSize: 4,
      gapSize: 3,
      linewidth: 1
    });

    infra.vias.forEach(via => {
      if (!via.points || via.points.length < 2) return;
      const pts = via.points.map(p => new THREE.Vector3(p[0], 0.02, p[1]));
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, via.isCenterline ? centerlineMat : roadLineMat);
      if (via.isCenterline) line.computeLineDistances();
      infraGroup.add(line);
    });
  }

  // 4. Dibujar Perímetro Matriz del Proyecto (Línea roja destacada)
  if (infra.perimetro && infra.perimetro.length > 0) {
    const perimMat = new THREE.LineBasicMaterial({
      color: 0xf43f5e, // Borde rojo perimetral
      linewidth: 3.5,
      transparent: true,
      opacity: 0.95
    });

    infra.perimetro.forEach(p => {
      if (!p.points || p.points.length < 2) return;
      const pts = p.points.map(pt => new THREE.Vector3(pt[0], 0.08, pt[1]));
      if (p.closed) pts.push(pts[0].clone());
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const perimLine = new THREE.Line(geom, perimMat);
      infraGroup.add(perimLine);
    });
  }

  // 5. Contornos de Manzanas (Veredas / Aceras)
  if (infra.manzanaContornos && infra.manzanaContornos.length > 0) {
    const mzLineMat = new THREE.LineBasicMaterial({
      color: 0xa855f7, // Morado suave para contornos de manzana
      linewidth: 1.5,
      transparent: true,
      opacity: 0.5
    });

    infra.manzanaContornos.forEach(m => {
      if (!m.points || m.points.length < 2) return;
      const pts = m.points.map(pt => new THREE.Vector3(pt[0], 0.03, pt[1]));
      if (m.closed) pts.push(pts[0].clone());
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, mzLineMat);
      infraGroup.add(line);
    });
  }

  // 6. Árboles 3D distribuidos a lo largo del perímetro y vías
  _plantDecorativeTrees(scene);

  // 7. Postes de iluminación nocturna
  _plantStreetLights(scene);

  return ground;
}

/** Planta árboles decorativos con InstancedMesh (2 draw calls en lugar de 120) */
function _plantDecorativeTrees(parent) {
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.4, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const leavesGeo = new THREE.ConeGeometry(2.8, 5.5, 6);
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x15803d });

  // Distribución perimetral de árboles
  const positions = [];
  // Borde Oeste y Este
  for (let z = -350; z <= 350; z += 40) {
    positions.push({ x: -230, z });
    positions.push({ x: 250, z });
  }
  // Borde Norte y Sur
  for (let x = -200; x <= 220; x += 50) {
    positions.push({ x, z: -380 });
    positions.push({ x, z: 380 });
  }

  const count = positions.length;
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const leavesInst = new THREE.InstancedMesh(leavesGeo, leavesMat, count);
  trunkInst.receiveShadow = true;
  leavesInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  positions.forEach((pos, i) => {
    // Tronco
    dummy.position.set(pos.x, 1.2, pos.z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    // Copa de árbol
    const s = 0.9 + (i % 5) * 0.08;
    dummy.position.set(pos.x, 4.0, pos.z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, (i * 0.7) % Math.PI, 0);
    dummy.updateMatrix();
    leavesInst.setMatrixAt(i, dummy.matrix);
  });

  trunkInst.instanceMatrix.needsUpdate = true;
  leavesInst.instanceMatrix.needsUpdate = true;

  const treeGroup = new THREE.Group();
  treeGroup.name = 'arboles_decorativos';
  treeGroup.add(trunkInst);
  treeGroup.add(leavesInst);
  parent.add(treeGroup);
}

// Material compartido único para todas las bombillas de postes
export const streetBulbMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffe066,
  emissiveIntensity: 0.0
});

/** Agrega postes de luz con bombillas eficientes */
function _plantStreetLights(parent) {
  const lightsGroup = new THREE.Group();
  lightsGroup.name = 'postes_luz';

  const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.0, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const bulbGeo = new THREE.SphereGeometry(0.35, 8, 8);

  // Postes a lo largo de los ejes viales principales
  for (let z = -320; z <= 320; z += 65) {
    [-120, 0, 140].forEach(x => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 3.0, z);
      lightsGroup.add(pole);

      const bulb = new THREE.Mesh(bulbGeo, streetBulbMat);
      bulb.position.set(x, 6.1, z);
      bulb.userData.isStreetLightBulb = true;
      lightsGroup.add(bulb);
    });
  }

  parent.add(lightsGroup);
}
