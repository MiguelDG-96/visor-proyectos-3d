/**
 * lighting.js
 * Iluminación de la escena: sol, ambiente, hemisférica.
 */
import * as THREE from 'three';
import { getScene } from './scene.js';

export function setupLighting() {
  const scene = getScene();

  // ── Luz ambiental ────────────────────────────
  // Relleno suave uniforme
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  // ── Luz hemisférica ──────────────────────────
  // Cielo azul / suelo verde — da profundidad sin sombras
  const hemi = new THREE.HemisphereLight(0xc8dff5, 0x3a6640, 0.9);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  // ── Sol (DirectionalLight) ───────────────────
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.8);
  sun.position.set(250, 450, 200);
  sun.castShadow = true;

  // Configuración de shadow map abarcando la extensión completa de la urbanización
  sun.shadow.mapSize.width  = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near    = 10;
  sun.shadow.camera.far     = 1200;
  sun.shadow.camera.left    = -450;
  sun.shadow.camera.right   = 450;
  sun.shadow.camera.top     = 500;
  sun.shadow.camera.bottom  = -500;
  sun.shadow.bias           = -0.0005;
  sun.shadow.radius         = 2; // suavizado PCF
  scene.add(sun);

  // ── Luz de relleno (fill) ────────────────────
  // Contraluz suave para evitar zonas negras
  const fill = new THREE.DirectionalLight(0xddeeff, 0.4);
  fill.position.set(-150, 100, -100);
  scene.add(fill);

  return { ambient, hemi, sun, fill };
}

let _isNight = false;
export function toggleDayNight() {
  _isNight = !_isNight;
  const scene = getScene();
  
  // Encontrar luces y posts
  const ambient = scene.children.find(c => c.isAmbientLight);
  const hemi = scene.children.find(c => c.isHemisphereLight);
  const sun = scene.children.find(c => c.isDirectionalLight && c.castShadow);
  const fill = scene.children.find(c => c.isDirectionalLight && !c.castShadow);
  
  // Cambiar entorno
  if (_isNight) {
    // Noche - Iluminación profesional de luna a gran escala (sin capas que corten la vista)
    scene.background.setHex(0x0f172a);
    scene.fog.color.setHex(0x0f172a);
    scene.fog.near = 1600;
    scene.fog.far = 3800;
    
    if (ambient) ambient.intensity = 0.45; // Luz de relleno general alta
    if (hemi) hemi.intensity = 0.55; // Resalta detalles desde arriba
    if (sun) {
      sun.color.setHex(0xaaccff); // Luz de luna plateada/azulada clara
      sun.intensity = 1.1; // Luna con mucha fuerza global
    }
    if (fill) fill.intensity = 0.35; // Relleno lateral sin sombras negras absolutas
  } else {
    // Día — Máxima visibilidad y nitidez sin niebla invasiva
    scene.background.setHex(0x87b4d0);
    scene.fog.color.setHex(0x87b4d0);
    scene.fog.near = 1600;
    scene.fog.far = 3800;

    if (ambient) ambient.intensity = 0.6;
    if (hemi) hemi.intensity = 0.95;
    if (sun) {
      sun.color.setHex(0xfff5e0);
      sun.intensity = 1.8;
    }
    if (fill) fill.intensity = 0.4;
  }
  
  // Encender/apagar luces de los postes
  scene.traverse(obj => {
    if (obj.userData.isStreetLight) {
      obj.visible = _isNight;
    }
    if (obj.userData.isStreetLightBulb) {
      obj.material.emissiveIntensity = _isNight ? 1.0 : 0.0;
    }
  });
  
  return _isNight;
}
