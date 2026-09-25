/**
 * interaction.js
 * Raycasting — hover y click sobre lotes.
 * Conecta Three.js con el sistema de UI.
 */
import * as THREE from 'three';
import { getCamera, getRenderer } from './scene.js';
import { getLotMeshes, setLotHovered, setLotSelected } from './lots.js';
import { showTooltip, hideTooltip, showLotPanel, hideLotPanel } from './ui.js';
import { isWalkModeActive } from './walk.js';

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

let _hoveredMesh  = null;
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

  // Solo raycast contra lotes visibles (ignora hijos sprites/edges)
  const targets   = getLotMeshes().filter(m => m.visible);
  const intersects = raycaster.intersectObjects(targets, false);

  return intersects.length > 0 ? intersects[0].object : null;
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

  // Cambio de lote hover
  if (hit !== _hoveredMesh) {
    // Resetear hover anterior (sólo si no está seleccionado)
    if (_hoveredMesh && _hoveredMesh !== _selectedMesh) {
      setLotHovered(_hoveredMesh, false);
    }
    _hoveredMesh = hit;

    if (hit && hit !== _selectedMesh) {
      setLotHovered(hit, true);
    }
  }

  // Tooltip
  if (hit) {
    // Si estamos en modo caminata, centrar tooltip o dejarlo flotando
    const tooltipX = isWalkModeActive() ? window.innerWidth / 2 : e.clientX;
    const tooltipY = isWalkModeActive() ? window.innerHeight / 2 : e.clientY;
    showTooltip(hit.userData.lot, tooltipX, tooltipY);
  } else {
    hideTooltip();
  }
}

function _onClick(e) {
  const hit = _getHit(e.clientX, e.clientY);

  // Deselect anterior
  if (_selectedMesh) {
    setLotSelected(_selectedMesh, false);
    _selectedMesh = null;
  }

  if (hit) {
    _selectedMesh = hit;
    setLotSelected(hit, true);
    setLotHovered(hit, false); // limpiar hover al seleccionar
    showLotPanel(hit.userData.lot);
  } else {
    hideLotPanel();
    hideTooltip();
  }
}
