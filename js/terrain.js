/**
 * terrain.js — Suelo, Red Vial Real y Perímetro de Chávez Pata
 */
import * as THREE from 'three';
import { getScene } from './scene.js';

export function createTerrain(bounds, infra = {}) {
  const scene = getScene();

  // 1. Suelo base amplio (Terreno natural tropical que se funde en el horizonte)
  const groundGeo = new THREE.PlaneGeometry(3600, 3600);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x1e2e1e }); // Verde natural oscuro
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Base de asfalto urbana bajo la lotización
  const asphaltGeo = new THREE.PlaneGeometry(750, 1050);
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x27272a }); // Asfalto gris oscuro
  const asphalt = new THREE.Mesh(asphaltGeo, asphaltMat);
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

/** Planta árboles decorativos en las vías periféricas y áreas libres */
function _plantDecorativeTrees(parent) {
  const treeGroup = new THREE.Group();
  treeGroup.name = 'arboles_decorativos';

  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.4, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const leavesGeo = new THREE.ConeGeometry(2.8, 5.5, 6);
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x15803d });

  // Distribución perimetral de árboles
  const positions = [];
  // Borde Oeste
  for (let z = -350; z <= 350; z += 40) {
    positions.push({ x: -230, z });
    positions.push({ x: 250, z });
  }
  // Borde Norte y Sur
  for (let x = -200; x <= 220; x += 50) {
    positions.push({ x, z: -380 });
    positions.push({ x, z: 380 });
  }

  positions.forEach(pos => {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(pos.x, 1.2, pos.z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(pos.x, 4.0, pos.z);
    leaves.scale.set(0.9 + Math.random() * 0.3, 0.9 + Math.random() * 0.3, 0.9 + Math.random() * 0.3);
    leaves.rotation.y = Math.random() * Math.PI;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    treeGroup.add(leaves);
  });

  parent.add(treeGroup);
}

/** Agrega postes de luz con bombillas que se encienden de noche */
function _plantStreetLights(parent) {
  const lightsGroup = new THREE.Group();
  lightsGroup.name = 'postes_luz';

  const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.0, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const bulbGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffe066,
    emissiveIntensity: 0.0
  });

  // Postes a lo largo del eje central
  for (let z = -320; z <= 320; z += 65) {
    [-120, 0, 140].forEach(x => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 3.0, z);
      lightsGroup.add(pole);

      const bulb = new THREE.Mesh(bulbGeo, bulbMat.clone());
      bulb.position.set(x, 6.1, z);
      bulb.userData.isStreetLightBulb = true;
      lightsGroup.add(bulb);
    });
  }

  parent.add(lightsGroup);
}
