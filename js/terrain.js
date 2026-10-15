/**
 * terrain.js — Suelo, Red Vial Real y Perímetro de Chávez Pata
 */
import * as THREE from 'three';
import { getScene } from './scene.js';

let _groundMat  = null;
let _asphaltMat = null;
let _satMesh    = null;
let _satVisible = true;

export function updateTerrainDayNight(isNight) {
  if (!_groundMat || !_asphaltMat) return;
  if (isNight) {
    _groundMat.color.setHex(0x142216);  // Césped nocturno
    _asphaltMat.color.setHex(0x19202a); // Asfalto nocturno
    if (_satMesh) _satMesh.material.opacity = 0.55; // Satélite tenue en noche
  } else {
    _groundMat.color.setHex(0x437a38);  // Césped verde tropical vivo y luminoso de día
    _asphaltMat.color.setHex(0x525e70); // Asfalto gris urbano diurno limpio
    if (_satMesh) _satMesh.material.opacity = 0.98; // Satélite nítido en día
  }
}

export function toggleSatelliteLayer() {
  if (_satMesh) {
    _satVisible = !_satVisible;
    _satMesh.visible = _satVisible;
  }
  return _satVisible;
}

export function createTerrain(bounds, infra = {}) {
  const scene = getScene();

  // 1. Suelo base amplio (Terreno natural tropical que se funde en el horizonte)
  const groundGeo = new THREE.PlaneGeometry(3600, 3600);
  _groundMat = new THREE.MeshLambertMaterial({ color: 0x437a38 }); // Verde tropical vivo para día
  const ground = new THREE.Mesh(groundGeo, _groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // 1.5 Capa Satelital de Google Earth Georreferenciada (Chávez Pata en UTM 18S)
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('./assets/images/satelite-chavez-pata.png', (satTex) => {
    satTex.colorSpace = THREE.SRGBColorSpace;
    satTex.minFilter = THREE.LinearMipmapLinearFilter;

    // Dimensiones georreferenciadas calibradas a resolución Web Mercator / UTM (760.18m x 760.18m)
    const satGeo = new THREE.PlaneGeometry(760.18, 760.18);
    const satMat = new THREE.MeshBasicMaterial({
      map: satTex,
      transparent: true,
      opacity: 0.98
    });
    _satMesh = new THREE.Mesh(satGeo, satMat);
    _satMesh.rotation.x = -Math.PI / 2;
    _satMesh.position.set(10.76, 0.012, -6.37);
    _satMesh.receiveShadow = true;
    _satMesh.name = 'capa_satelital_google';
    scene.add(_satMesh);
  });

  // 2. Base de asfalto urbana bajo la lotización
  const asphaltGeo = new THREE.PlaneGeometry(750, 1050);
  _asphaltMat = new THREE.MeshLambertMaterial({ color: 0x525e70 }); // Asfalto gris urbano diurno
  const asphalt = new THREE.Mesh(asphaltGeo, _asphaltMat);
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(20, -0.02, 0);
  asphalt.receiveShadow = true;
  scene.add(asphalt);

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
