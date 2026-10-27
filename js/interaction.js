/**
 * interaction.js
 * Raycasting — hover y click sobre lotes y globos de manzanas.
 * Conecta Three.js con el sistema de UI y animaciones de cámara.
 */
import * as THREE from 'three';
import { getCamera, getRenderer, requestShadowUpdate } from './scene.js';
import { getLotMeshes, setLotHovered, setLotSelected } from './lots.js';
import { getManzanaPins, setPinHovered } from './manzanas.js';
import { focusOnManzana } from './camera.js';
import { showTooltip, showManzanaTooltip, showToast, hideTooltip, showLotPanel, hideLotPanel } from './ui.js';
import { isWalkModeActive } from './walk.js';

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

let _hoveredMesh  = null;
let _hoveredPin   = null;
let _selectedMesh = null;
let _lastClientX = window.innerWidth / 2;
let _lastClientY = window.innerHeight / 2;

export function setupInteraction() {
  const renderer = getRenderer();
  const canvas   = renderer.domElement;

  canvas.addEventListener('pointermove', _onPointerMove);
  canvas.addEventListener('click',       _onClick);

  // Touch: touchend simulado como click
  canvas.addEventListener('touchend', e => {
    if (e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    _onClick({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: true });

  // Escuchar evento de deselección desde botón cerrar del panel
  window.addEventListener('deselectLot', () => {
    if (_selectedMesh) {
      setLotSelected(_selectedMesh, false);
      _selectedMesh = null;
      requestShadowUpdate();
    }
  });
}

/** Para actualizar el hover cuando la cámara se mueve (con WASD) sin mover el ratón */
export function updateInteraction() {
  if (isWalkModeActive()) {
    _onPointerMove({ clientX: _lastClientX, clientY: _lastClientY, pointerType: 'mouse' });
  }
}

// ── Internos ───────────────────────────────────

function _getHit(clientX, clientY) {
  const renderer = getRenderer();
  const camera   = getCamera();
  const rect     = renderer.domElement.getBoundingClientRect();

  if (isWalkModeActive()) {
    // Si estamos caminando, apuntamos siempre al centro (mira/crosshair)
    mouse.x = 0;
    mouse.y = 0;
  } else {
    // Vista aérea normal, usamos el cursor
    mouse.x = ((clientX - rect.left) / rect.width)  *  2 - 1;
    mouse.y = ((clientY - rect.top)  / rect.height)  * -2 + 1;
  }

  raycaster.setFromCamera(mouse, camera);

  // 1. Prioridad: Globos de manzana interactivos (cuando no estamos en modo caminata)
  if (!isWalkModeActive()) {
    const pins = getManzanaPins();
    if (pins && pins.length > 0) {
      const pinHits = raycaster.intersectObjects(pins, false);
      if (pinHits.length > 0) {
        return { type: 'pin', object: pinHits[0].object, manzana: pinHits[0].object.userData.manzana };
      }
    }
  }

  // 2. Raycast contra lotes visibles (ignora hijos sprites/edges)
  const targets = getLotMeshes().filter(m => m.visible);
  const lotHits = raycaster.intersectObjects(targets, false);
  if (lotHits.length > 0) {
    return { type: 'lot', object: lotHits[0].object, lot: lotHits[0].object.userData.lot };
  }

  return null;
}

function _onPointerMove(e) {
  // Ignorar si es touch con más de un dedo (gestos de cámara)
  if (e.pointerType === 'touch') return;

  if (e.clientX !== undefined) _lastClientX = e.clientX;
  if (e.clientY !== undefined) _lastClientY = e.clientY;

  const hit = _getHit(_lastClientX, _lastClientY);
  const renderer = getRenderer();

  // Cursor
  renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';

  // Hover en globo de manzana
  const hitPin = (hit && hit.type === 'pin') ? hit.object : null;
  if (hitPin !== _hoveredPin) {
    if (_hoveredPin) setPinHovered(_hoveredPin, false);
    _hoveredPin = hitPin;
    if (_hoveredPin) setPinHovered(_hoveredPin, true);
  }

  // Hover en lote
  const hitLot = (hit && hit.type === 'lot') ? hit.object : null;
  if (hitLot !== _hoveredMesh) {
    if (_hoveredMesh && _hoveredMesh !== _selectedMesh) {
      setLotHovered(_hoveredMesh, false);
    }
    _hoveredMesh = hitLot;

    if (hitLot && hitLot !== _selectedMesh) {
      setLotHovered(hitLot, true);
    }
  }

  // Tooltip contextual
  if (hit) {
    const tooltipX = isWalkModeActive() ? window.innerWidth / 2 : e.clientX;
    const tooltipY = isWalkModeActive() ? window.innerHeight / 2 : e.clientY;

    if (hit.type === 'pin') {
      showManzanaTooltip(hit.manzana, tooltipX, tooltipY);
    } else if (hit.type === 'lot') {
      showTooltip(hit.lot, tooltipX, tooltipY);
    }
  } else {
    hideTooltip();
  }
}

function _onClick(e) {
  const hit = _getHit(e.clientX, e.clientY);

  // Si se hizo clic en un globo de manzana -> Ampliar vista con zoom suave
  if (hit && hit.type === 'pin') {
    const mz = hit.manzana;
    focusOnManzana(mz);
    showToast(`📍 Ampliando vista sobre ${mz.id} (${mz.totalLots} lotes)`, 3000);
    hideTooltip();
    return;
  }

  // Deselect lote anterior
  if (_selectedMesh) {
    setLotSelected(_selectedMesh, false);
    _selectedMesh = null;
  }

  if (hit && hit.type === 'lot') {
    _selectedMesh = hit.object;
    setLotSelected(hit.object, true);
    setLotHovered(hit.object, false); // limpiar hover al seleccionar
    showLotPanel(hit.lot);
    requestShadowUpdate();
  } else {
    hideLotPanel();
    hideTooltip();
    requestShadowUpdate();
  }
}
