/**
 * terrain.js
 * Suelo, calles rotadas, áreas verdes y árboles (Fase 5).
 */
import * as THREE from 'three';
import { getScene } from './scene.js';

export function createTerrain(bounds) {
  const scene = getScene();

  // 1. Suelo principal (Pasto base, infinito)
  const groundGeo = new THREE.PlaneGeometry(1000, 1000);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a5a3a }); // Verde oscuro natural
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Grupo de Urbanización Rotado (Igual que los lotes)
  const urbTerrainGroup = new THREE.Group();
  urbTerrainGroup.rotation.y = -35.1 * (Math.PI / 180);
  urbTerrainGroup.position.y = 0.0;
  scene.add(urbTerrainGroup);

  // 3. Asfalto principal (Cubre toda la urbanización)
  // Calculamos el tamaño aproximado según los bounds locales
  const asphaltGeo = new THREE.PlaneGeometry(250, 160);
  const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x333333 }); // Gris asfalto
  const asphalt = new THREE.Mesh(asphaltGeo, asphaltMat);
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(20, -0.02, 25); // Centrado aproximado
  asphalt.receiveShadow = true;
  urbTerrainGroup.add(asphalt);

  // 4. Islas de vereda/pasto bajo cada manzana
  // MZ-A
  _createIsland(urbTerrainGroup, -32, -21, 95, 43);
  // MZ-B
  _createIsland(urbTerrainGroup, 44, -7, 70, 43);
  // MZ-C
  _createIsland(urbTerrainGroup, -31, 36, 100, 43);
  // MZ-D
  _createIsland(urbTerrainGroup, 54, 48, 65, 43);

  // Área de recreación / parque (Aproximada, entre Mz-C y Mz-D)
  const park = _createIsland(urbTerrainGroup, 72, 36, 40, 43, 0x4a7a4a);
  
  // Caminerías del parque
  const path1 = new THREE.Mesh(new THREE.PlaneGeometry(4, 43), new THREE.MeshLambertMaterial({ color: 0x887766 }));
  path1.rotation.x = -Math.PI/2;
  path1.position.set(92, 0.02, 57.5);
  path1.receiveShadow = true;
  urbTerrainGroup.add(path1);
  
  const path2 = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), new THREE.MeshLambertMaterial({ color: 0x887766 }));
  path2.rotation.x = -Math.PI/2;
  path2.position.set(92, 0.02, 57.5);
  path2.receiveShadow = true;
  urbTerrainGroup.add(path2);
  
  // Fuente central en el parque
  const fountainBaseGeo = new THREE.CylinderGeometry(4, 4, 0.5, 16);
  const fountainBaseMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
  const fountainBase = new THREE.Mesh(fountainBaseGeo, fountainBaseMat);
  fountainBase.position.set(92, 0.25, 57.5);
  urbTerrainGroup.add(fountainBase);
  
  const fountainWaterGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.6, 16);
  const fountainWaterMat = new THREE.MeshLambertMaterial({ color: 0x4488ff, transparent: true, opacity: 0.8 });
  const fountainWater = new THREE.Mesh(fountainWaterGeo, fountainWaterMat);
  fountainWater.position.set(92, 0.3, 57.5);
  urbTerrainGroup.add(fountainWater);

  // 5. Árboles 3D (Baja cantidad para optimización)
  _plantTrees(urbTerrainGroup);
  
  // 6. Postes de Luz
  _plantStreetLights(urbTerrainGroup);

  return ground;
}

/** Crea una "isla" de vereda o pasto para una manzana */
function _createIsland(parent, x, z, width, depth, color = 0x828a82) {
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshLambertMaterial({ color }); // Gris vereda o verde parque
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  // Centramos según el anchor superior izquierdo
  mesh.position.set(x + width/2 - 2, 0.01, z + depth/2 - 2);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Planta árboles decorativos en las veredas y parques */
function _plantTrees(parent) {
  const treeCount = 60;
  const positions = [];

  // Calles principales (bordes de Mz-A y Mz-C, solo hasta donde termina Mz-A en X = 55)
  for(let i=0; i<11; i++) {
    positions.push({ x: -30 + i*7.5, z: -23 }); // Borde norte Mz-A
    positions.push({ x: -30 + i*7.5, z: 22 });  // Vereda entre Mz-A y Mz-C
    positions.push({ x: -30 + i*7.5, z: 81 });  // Borde sur Mz-C
  }
  
  // Árboles aleatorios EXCLUSIVAMENTE dentro de los límites del parque (X: 72 a 112, Z: 36 a 79)
  for(let i=0; i<18; i++) {
    positions.push({ x: 74 + Math.random()*36, z: 38 + Math.random()*39 }); 
  }

  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const leavesGeo = new THREE.ConeGeometry(2.5, 5, 5);
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x2e6b3c });

  positions.forEach(pos => {
    // Tronco
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(pos.x, 1.0, pos.z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    parent.add(trunk);

    // Hojas
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(pos.x, 3.5, pos.z);
    // Variación sutil
    leaves.scale.set(0.8 + Math.random()*0.4, 0.8 + Math.random()*0.4, 0.8 + Math.random()*0.4);
    leaves.rotation.y = Math.random() * Math.PI;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    parent.add(leaves);
  });
}

/** Agrega postes de luz */
function _plantStreetLights(parent) {
  const positions = [];
  
  // Calles principales
  for(let i=0; i<6; i++) {
    positions.push({ x: -30 + i*16, z: -23.5 }); // Borde norte Mz-A (uno cada 16m)
    positions.push({ x: -30 + i*16, z: 21.5 });  // Vereda entre Mz-A y Mz-C
    positions.push({ x: -30 + i*16, z: 81.5 });  // Borde sur Mz-C
  }
  
  // Parque
  positions.push({ x: 74, z: 38 });
  positions.push({ x: 110, z: 38 });
  positions.push({ x: 74, z: 77 });
  positions.push({ x: 110, z: 77 });

  const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 });
  
  const bulbGeo = new THREE.SphereGeometry(0.4, 8, 8);
  const bulbMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffee, 
    emissive: 0xffaa33, 
    emissiveIntensity: 0.0 // Empiezan apagados
  });

  positions.forEach(pos => {
    // Poste
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(pos.x, 3.0, pos.z);
    post.castShadow = true;
    
    // Foco
    const bulb = new THREE.Mesh(bulbGeo, bulbMat.clone());
    bulb.position.set(0, 3.0, 0); // Local al poste
    bulb.userData.isStreetLightBulb = true; // para poder encenderlos
    post.add(bulb);
    
    // Luz PointLight (invisible de día)
    // Aumentamos drásticamente la intensidad (300) y la distancia (70)
    // para que ilumine toda la calle y las manzanas
    const light = new THREE.PointLight(0xffaa33, 300, 70);
    light.position.set(0, 3.0, 0);
    light.castShadow = false;
    light.visible = false;
    light.userData.isStreetLight = true;
    post.add(light);
    
    parent.add(post);
  });
}
