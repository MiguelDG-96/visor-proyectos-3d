/**
 * tile-terrain.js — Terreno Satelital Dinámico en Tiempo Real (Google Map Tiles)
 * Genera cuadrícula de teselas satelitales georreferenciadas con precisión sub-métrica en UTM 18S.
 */
import * as THREE from 'three';

// Constantes geodésicas WGS84 para UTM Zona 18 Sur
const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_K0 = 0.9996;
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F;
const WGS84_EPRIME2 = WGS84_E2 / (1 - WGS84_E2);
const CENTRAL_MERIDIAN = -75.0 * (Math.PI / 180); // Meridiano Central Zona 18

/**
 * Convierte Latitud / Longitud WGS84 a UTM Zona 18 Sur
 * @param {number} lat Latitud en grados decimales
 * @param {number} lon Longitud en grados decimales
 * @returns {{ easting: number, northing: number }}
 */
export function latLonToUtm18S(lat, lon) {
  const latRad = lat * (Math.PI / 180);
  const lonRad = lon * (Math.PI / 180);

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);

  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const T = tanLat * tanLat;
  const C = WGS84_EPRIME2 * cosLat * cosLat;
  const A = (lonRad - CENTRAL_MERIDIAN) * cosLat;

  const M = WGS84_A * (
    (1 - WGS84_E2 / 4 - 3 * WGS84_E2 * WGS84_E2 / 64 - 5 * Math.pow(WGS84_E2, 3) / 256) * latRad -
    (3 * WGS84_E2 / 8 + 3 * WGS84_E2 * WGS84_E2 / 32 + 45 * Math.pow(WGS84_E2, 3) / 1024) * Math.sin(2 * latRad) +
    (15 * WGS84_E2 * WGS84_E2 / 256 + 45 * Math.pow(WGS84_E2, 3) / 1024) * Math.sin(4 * latRad) -
    (35 * Math.pow(WGS84_E2, 3) / 3072) * Math.sin(6 * latRad)
  );

  const easting = 500000.0 + WGS84_K0 * N * (
    A +
    (1 - T + C) * Math.pow(A, 3) / 6.0 +
    (5 - 18 * T + T * T + 72 * C - 58 * WGS84_EPRIME2) * Math.pow(A, 5) / 120.0
  );

  let northing = WGS84_K0 * (
    M +
    N * tanLat * (
      A * A / 2.0 +
      (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24.0 +
      (61 - 58 * T + T * T + 600 * C - 330 * WGS84_EPRIME2) * Math.pow(A, 6) / 720.0
    )
  );
  northing += 10000000.0; // Falso Norte para hemisferio Sur

  return { easting, northing };
}

/**
 * Calcula dimensiones métricas y centro en coordenadas locales Three.js para una tesela (Slippy Map Tile)
 */
export function getTileGeometry(zoom, x, y, originUtmX = 279700.0, originUtmY = 9336250.0) {
  const n = Math.pow(2, zoom);
  const lon1 = (x / n) * 360 - 180;
  const lon2 = ((x + 1) / n) * 360 - 180;

  const lat1Rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat2Rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  const lat1 = (lat1Rad * 180) / Math.PI;
  const lat2 = (lat2Rad * 180) / Math.PI;

  const utmTopLeft = latLonToUtm18S(lat1, lon1);
  const utmBottomRight = latLonToUtm18S(lat2, lon2);

  const widthM = Math.abs(utmBottomRight.easting - utmTopLeft.easting);
  const heightM = Math.abs(utmTopLeft.northing - utmBottomRight.northing);

  const centerUtmX = (utmTopLeft.easting + utmBottomRight.easting) / 2;
  const centerUtmY = (utmTopLeft.northing + utmBottomRight.northing) / 2;

  return {
    widthM,
    heightM,
    x3d: centerUtmX - originUtmX,
    z3d: -(centerUtmY - originUtmY)
  };
}

/**
 * Gestor del Terreno Satelital con Streaming de Teselas Google Maps
 */
export class DynamicTileTerrain {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.originUtmX = options.originUtmX ?? 279700.0;
    this.originUtmY = options.originUtmY ?? 9336250.0;
    this.group = new THREE.Group();
    this.group.name = 'satelite_dinamico_google';
    this.materials = [];
    this.textureLoader = new THREE.TextureLoader();
    this.visible = true;

    this.scene.add(this.group);
  }

  /**
   * Carga la cuadrícula satelital multinivel (Zoom 15 regional + Zoom 17 detalle)
   */
  initTiles() {
    // 1. NIVEL REGIONAL (Zoom 15): 5x5 teselas (~6 km x 6 km, cubre valles, río y horizonte)
    const z15Center = { x: 9376, y: 16931 };
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const tx = z15Center.x + dx;
        const ty = z15Center.y + dy;
        this._addTile(15, tx, ty, 0.005);
      }
    }

    // 2. NIVEL DETALLE MÁXIMO (Zoom 17): 4x4 teselas (~1.2 km x 1.2 km sobre la lotización)
    const z17Center = { x: 37504, y: 67725 };
    for (let dx = -2; dx <= 1; dx++) {
      for (let dy = -2; dy <= 1; dy++) {
        const tx = z17Center.x + dx;
        const ty = z17Center.y + dy;
        this._addTile(17, tx, ty, 0.012);
      }
    }
  }

  _addTile(zoom, x, y, elevationY) {
    const geomData = getTileGeometry(zoom, x, y, this.originUtmX, this.originUtmY);
    const planeGeo = new THREE.PlaneGeometry(geomData.widthM, geomData.heightM);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      depthWrite: false
    });
    this.materials.push(mat);

    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(geomData.x3d, elevationY, geomData.z3d);
    mesh.receiveShadow = true;
    mesh.name = `tile_${zoom}_${x}_${y}`;

    this.group.add(mesh);

    // Cargar textura asíncrona desde nuestro endpoint con caché local
    const tileUrl = `/api/tile/${zoom}/${x}/${y}.jpg`;
    this.textureLoader.load(
      tileUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        mat.map = tex;
        mat.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn(`[DynamicTileTerrain] Error al cargar tesela ${zoom}/${x}/${y}:`, err);
      }
    );
  }

  setDayNight(isNight) {
    const opacity = isNight ? 0.55 : 0.98;
    for (const mat of this.materials) {
      mat.opacity = opacity;
    }
  }

  setVisible(visible) {
    this.visible = !!visible;
    this.group.visible = this.visible;
    return this.visible;
  }

  toggleVisible() {
    return this.setVisible(!this.visible);
  }
}

