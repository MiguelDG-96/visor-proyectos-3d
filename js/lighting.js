/**
 * lighting.js
 * Iluminación de la escena: sol, ambiente, hemisférica.
 */
import * as THREE from 'three';
import { getScene, requestShadowUpdate } from './scene.js';
import { updateTerrainDayNight, streetBulbMat } from './terrain.js';

export function setupLighting() {
  const scene = getScene();
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // ── Luz ambiental ────────────────────────────
  // Relleno suave uniforme
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  // ── Luz hemisférica ──────────────────────────
  // Cielo azul / suelo verde — da profundidad sin sombras
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x4a7c3f, 0.95);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  // ── Sol (DirectionalLight) ───────────────────
  const sun = new THREE.DirectionalLight(0xfffaed, 2.0);
  sun.position.set(250, 450, 200);
  sun.castShadow = true;

  // Configuración de shadow map: 1024 en móvil (ahorra 75% memoria VRAM) y 2048 en desktop
  const shadowRes = isMobile ? 1024 : 2048;
  sun.shadow.mapSize.width  = shadowRes;
  sun.shadow.mapSize.height = shadowRes;
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
    scene.fog.near = 1300;
    scene.fog.far = 2900;
    
    if (ambient) ambient.intensity = 0.45; // Luz de relleno general alta
    if (hemi) hemi.intensity = 0.55; // Resalta detalles desde arriba
    if (sun) {
      sun.color.setHex(0xaaccff); // Luz de luna plateada/azulada clara
      sun.intensity = 1.1; // Luna con mucha fuerza global
    }
    if (fill) fill.intensity = 0.35; // Relleno lateral sin sombras negras absolutas
  } else {
    // Día — Máxima luminosidad, cielo azul radiante y nitidez
    scene.background.setHex(0x7ec8f8);
    scene.fog.color.setHex(0x7ec8f8);
    scene.fog.near = 1300;
    scene.fog.far = 2900;

    if (ambient) ambient.intensity = 0.85;
    if (hemi) hemi.intensity = 1.0;
    if (sun) {
      sun.color.setHex(0xfffaed);
      sun.intensity = 2.0;
    }
    if (fill) fill.intensity = 0.5;
  }
  
  // Actualizar suelo y calles a tono diurno / nocturno
  updateTerrainDayNight(_isNight);
  
  // Encender/apagar bombillas de postes eficientemente (1 sola asignación)
  streetBulbMat.emissiveIntensity = _isNight ? 1.0 : 0.0;

  // Actualizar el mapa de sombras una sola vez para la nueva iluminación
  requestShadowUpdate();
  
  return _isNight;
}
