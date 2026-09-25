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
  sun.position.set(60, 100, 40);
  sun.castShadow = true;

  // Configuración de shadow map — calidad/rendimiento balanceado
  sun.shadow.mapSize.width  = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near    = 1;
  sun.shadow.camera.far     = 300;
  sun.shadow.camera.left    = -120;
  sun.shadow.camera.right   = 120;
  sun.shadow.camera.top     = 120;
  sun.shadow.camera.bottom  = -120;
  sun.shadow.bias           = -0.0008;
  sun.shadow.radius         = 2; // suavizado PCF
  scene.add(sun);

  // ── Luz de relleno (fill) ────────────────────
  // Contraluz suave para evitar zonas negras
  const fill = new THREE.DirectionalLight(0xddeeff, 0.35);
  fill.position.set(-40, 30, -20);
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
    // Noche - Iluminación profesional de luna a gran escala
    scene.background.setHex(0x111b2b); // Fondo ligeramente más claro
    scene.fog.color.setHex(0x111b2b);
    scene.fog.density = 0.002; // Niebla muy tenue para que no oscurezca el proyecto de lejos
    
    if (ambient) ambient.intensity = 0.4; // Luz de relleno general alta
    if (hemi) hemi.intensity = 0.5; // Resalta detalles desde arriba
    if (sun) {
      sun.color.setHex(0xaaccff); // Luz de luna plateada/azulada clara
      sun.intensity = 1.0; // Luna con mucha fuerza global
    }
    if (fill) fill.intensity = 0.3; // Relleno lateral para que no haya sombras negras absolutas
  } else {
    // Día
    scene.background.setHex(0x87b4d0);
    scene.fog.color.setHex(0x87b4d0);
    scene.fog.density = 0.007;
    if (ambient) ambient.intensity = 0.55;
    if (hemi) hemi.intensity = 0.9;
    if (sun) {
      sun.color.setHex(0xfff5e0);
      sun.intensity = 1.8;
    }
    if (fill) fill.intensity = 0.35;
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
