/**
 * ui.js
 * Interfaz de Usuario Glassmorfismo — Residencial Santa Anita
 * Gestiona el panel de lote, carrusel, selector de manzanas, estadísticas, brújula y dock.
 */
import { zoomIn, zoomOut, alignNorth, focusOnManzana, resetCamera } from './camera.js';
import { getManzanasList, getManzanaById } from './manzanas.js';

// ── Galería de imágenes de casas muestra ───────────────────────
const GALLERY_IMAGES = [
  'assets/images/house-1.png',
  'assets/images/house-2.png',
  'assets/images/house-render-1.webp',
  'assets/images/house-render-2.webp'
];
let _galleryIndex = 0;
let _currentLot = null;

// ── Caché de elementos DOM ─────────────────────────────────────
const $ = id => document.getElementById(id);

const EL = {
  // Panel de Lote
  panel:             $('lot-panel'),
  panelEstado:       $('panel-estado'),
  panelEstadoText:   $('panel-estado-text'),
  panelCodigo:       $('panel-codigo'),
  panelArea:         $('panel-area'),
  panelFrente:       $('panel-frente'),
  panelFondo:        $('panel-fondo'),
  panelPrecio:       $('panel-precio'),
  panelCoords:       $('panel-coords'),
  panelVias:         $('panel-vias'),
  btnClose:          $('btn-close-panel'),
  btnContactar:      $('btn-contactar'),
  btnVerManzana:     $('btn-ver-manzana'),

  // Carrusel
  galleryImg:        $('lot-gallery-img'),
  btnGalleryPrev:    $('btn-gallery-prev'),
  btnGalleryNext:    $('btn-gallery-next'),

  // Estadísticas
  countTotal:        $('count-total'),
  countDisp:         $('count-disponible'),
  countRes:          $('count-reservado'),
  countVend:         $('count-vendido'),
  statTotal:         $('stat-total'),
  statDisp:          $('stat-disponibles'),
  statRes:           $('stat-reservados'),
  statVend:          $('stat-vendidos'),

  // Selector de Manzanas
  dropdownWrap:      $('manzana-dropdown-wrap'),
  btnManzana:        $('btn-manzana-dropdown'),
  manzanaMenu:       $('manzana-menu'),
  manzanaList:       $('manzana-list-items'),
  manzanaLabel:      $('selected-manzana-label'),

  // Brújula y Zoom
  btnCompass:        $('btn-compass'),
  compassDial:       $('compass-dial'),
  btnZoomIn:         $('btn-zoom-in'),
  btnZoomOut:        $('btn-zoom-out'),

  // Dock Inferior
  btnSatellite:      $('btn-satellite'),
  btnDayNight:       $('btn-day-night'),
  btnTourMode:       $('btn-tour-mode'),
  btnWalkMode:       $('btn-walk-mode'),
  btnResetCamera:    $('btn-reset-camera'),
  dayNightIcon:      $('day-night-icon'),

  // Tooltip & Perf
  tooltip:           $('tooltip'),
  ttCodigo:          $('tt-codigo'),
  ttArea:            $('tt-area'),
  ttPrecio:          $('tt-precio'),
  fps:               $('fps-label'),
  lotsLabel:         $('lots-label'),
};

// ═════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DE LA UI
// ═════════════════════════════════════════════════════════════════
export function initUI(onFilter, onResetCamera) {
  // 1. Carrusel de imágenes
  EL.btnGalleryPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    _changeGalleryImage(-1);
  });
  EL.btnGalleryNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    _changeGalleryImage(1);
  });

  // 2. Cerrar panel de lote
  EL.btnClose?.addEventListener('click', hideLotPanel);

  // 3. Botón "Separar lote" (WhatsApp directo)
  EL.btnContactar?.addEventListener('click', () => {
    if (!_currentLot) return;
    const codigo = _currentLot.codigo || 'MZ-F-L-12';
    const precio = _currentLot.precio_soles ? _currentLot.precio_soles.toLocaleString('es-PE') : '25,000';
    const msg = encodeURIComponent(`¡Hola! Deseo separar el lote ${codigo} (S/ ${precio}) del proyecto Residencial Santa Anita en Moyobamba.`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  });

  // 4. Botón "Ver manzana"
  EL.btnVerManzana?.addEventListener('click', () => {
    if (!_currentLot) return;
    const mzId = _currentLot.manzana;
    const mzData = getManzanaById(mzId);
    if (mzData) {
      focusOnManzana(mzData);
      showToast(`📍 Enfocando ${mzData.nombre || mzId}`, 2500);
      _updateManzanaDropdownSelection(mzId);
    }
  });

  // 5. Filtros desde la tarjeta de estadísticas
  const statItems = [
    { el: EL.statTotal, filter: 'all' },
    { el: EL.statDisp,  filter: 'disponible' },
    { el: EL.statRes,   filter: 'reservado' },
    { el: EL.statVend,  filter: 'vendido' },
  ];

  statItems.forEach(({ el, filter }) => {
    el?.addEventListener('click', () => {
      statItems.forEach(item => item.el?.classList.remove('active'));
      el.classList.add('active');
      onFilter(filter);
    });
  });

  // 6. Brújula y Zoom
  EL.btnCompass?.addEventListener('click', () => {
    alignNorth();
    showToast('🧭 Orientando vista hacia el Norte', 2000);
  });

  EL.btnZoomIn?.addEventListener('click', () => {
    zoomIn();
  });

  EL.btnZoomOut?.addEventListener('click', () => {
    zoomOut();
  });

  // 7. Dock inferior
  EL.btnResetCamera?.addEventListener('click', () => {
    onResetCamera();
    _updateManzanaDropdownSelection('all');
    showToast('↺ Vista global restablecida', 2000);
  });

  EL.btnSatellite?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggleSatellite'));
  });

  EL.btnDayNight?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggleDayNight'));
  });

  EL.btnTourMode?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggleTourMode'));
  });

  EL.btnWalkMode?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('enterWalkMode'));
  });

  // 8. Inicializar menú selector de manzanas
  _initManzanaDropdown();
}

// ═════════════════════════════════════════════════════════════════
// SELECTOR DROPDOWN DE MANZANAS
// ═════════════════════════════════════════════════════════════════
function _initManzanaDropdown() {
  if (!EL.btnManzana || !EL.manzanaMenu) return;

  // Toggle menú
  EL.btnManzana.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = EL.manzanaMenu.classList.contains('hidden');
    if (isHidden) {
      _renderManzanaMenuItems();
      EL.manzanaMenu.classList.remove('hidden');
      EL.btnManzana.classList.add('open');
      EL.btnManzana.setAttribute('aria-expanded', 'true');
    } else {
      _closeManzanaMenu();
    }
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!EL.dropdownWrap?.contains(e.target)) {
      _closeManzanaMenu();
    }
  });
}

function _closeManzanaMenu() {
  EL.manzanaMenu?.classList.add('hidden');
  EL.btnManzana?.classList.remove('open');
  EL.btnManzana?.setAttribute('aria-expanded', 'false');
}

let _selectedMzId = 'all';

function _renderManzanaMenuItems() {
  if (!EL.manzanaList) return;
  EL.manzanaList.innerHTML = '';

  const manzanas = getManzanasList();

  // Opción "Todas"
  const allBtn = document.createElement('button');
  allBtn.className = `manzana-item-btn ${_selectedMzId === 'all' ? 'selected' : ''}`;
  allBtn.innerHTML = `
    <span>Todas</span>
    ${_selectedMzId === 'all' ? '<span class="check-icon">✓</span>' : ''}
  `;
  allBtn.addEventListener('click', () => {
    _selectedMzId = 'all';
    if (EL.manzanaLabel) EL.manzanaLabel.textContent = 'Manzana: Todas';
    resetCamera();
    _closeManzanaMenu();
    showToast('🌐 Mostrando todas las manzanas', 2000);
  });
  EL.manzanaList.appendChild(allBtn);

  // Cada Manzana
  manzanas.forEach(mz => {
    const mzDisplayName = mz.id.replace('MZ-', 'Mz - ');
    const btn = document.createElement('button');
    btn.className = `manzana-item-btn ${_selectedMzId === mz.id ? 'selected' : ''}`;
    btn.innerHTML = `
      <span>${mzDisplayName}</span>
      ${_selectedMzId === mz.id ? '<span class="check-icon">✓</span>' : ''}
    `;
    btn.addEventListener('click', () => {
      _selectedMzId = mz.id;
      if (EL.manzanaLabel) EL.manzanaLabel.textContent = `Manzana: ${mzDisplayName}`;
      focusOnManzana(mz);
      _closeManzanaMenu();
      showToast(`📍 Vista ampliada: ${mzDisplayName} (${mz.totalLots} lotes)`, 2500);
    });
    EL.manzanaList.appendChild(btn);
  });
}

function _updateManzanaDropdownSelection(mzId) {
  _selectedMzId = mzId;
  if (!EL.manzanaLabel) return;
  if (mzId === 'all') {
    EL.manzanaLabel.textContent = 'Manzana: Todas';
  } else {
    EL.manzanaLabel.textContent = `Manzana: ${mzId.replace('MZ-', 'Mz - ')}`;
  }
}

// ═════════════════════════════════════════════════════════════════
// CARRUSEL DE IMÁGENES
// ═════════════════════════════════════════════════════════════════
function _changeGalleryImage(delta) {
  _galleryIndex = (_galleryIndex + delta + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
  if (EL.galleryImg) {
    EL.galleryImg.style.opacity = '0';
    setTimeout(() => {
      EL.galleryImg.src = GALLERY_IMAGES[_galleryIndex];
      EL.galleryImg.style.opacity = '1';
    }, 150);
  }
}

// ═════════════════════════════════════════════════════════════════
// ESTADÍSTICAS DEL PROYECTO
// ═════════════════════════════════════════════════════════════════
export function updateStats(lotes) {
  const counts = { disponible: 0, reservado: 0, vendido: 0 };
  lotes.forEach(l => { if (l.estado in counts) counts[l.estado]++; });

  if (EL.countTotal) EL.countTotal.textContent = lotes.length;
  if (EL.countDisp)  EL.countDisp.textContent  = counts.disponible;
  if (EL.countRes)   EL.countRes.textContent   = counts.reservado;
  if (EL.countVend)  EL.countVend.textContent  = counts.vendido;
  if (EL.lotsLabel)  EL.lotsLabel.textContent  = `${lotes.length} lotes`;
}

// ═════════════════════════════════════════════════════════════════
// PANEL LATERAL DERECHO DE LOTE
// ═════════════════════════════════════════════════════════════════
export function showLotPanel(lot) {
  if (!EL.panel) return;
  _currentLot = lot;

  // Formatear título idéntico al diseño: "Lote 12 - Mz. F"
  const mzNombre = (lot.manzana || '').replace('MZ-', 'Mz. ');
  const numLote = lot.numero || (lot.codigo ? lot.codigo.split('-L-')[1] : '');
  const tituloFormateado = `Lote ${numLote} - ${mzNombre}`;

  if (EL.panelCodigo) EL.panelCodigo.textContent = tituloFormateado;

  // Badge de Estado con animación
  if (EL.panelEstado) {
    EL.panelEstado.className = `lot-status-pill ${lot.estado}`;
  }
  if (EL.panelEstadoText) {
    EL.panelEstadoText.textContent = _capitalize(lot.estado);
  }

  // Especificaciones métricas
  if (EL.panelArea) {
    EL.panelArea.textContent = `${lot.area_m2 ? lot.area_m2.toFixed(2) : '120.00'} m²`;
  }
  if (EL.panelFrente) {
    EL.panelFrente.textContent = `${lot.frente_m ? lot.frente_m.toFixed(2) : '8.00'} m`;
  }
  if (EL.panelFondo) {
    EL.panelFondo.textContent = `${lot.fondo_m ? lot.fondo_m.toFixed(2) : '15.00'} m`;
  }

  // Precio formateado
  if (EL.panelPrecio) {
    EL.panelPrecio.textContent = `S/ ${lot.precio_soles ? lot.precio_soles.toLocaleString('es-PE') : '25,000'}`;
  }

  // Georreferenciación oficial UTM y GPS
  if (EL.panelCoords) {
    const utmX = lot.coords_utm?.x ? lot.coords_utm.x.toFixed(2) : '—';
    const utmY = lot.coords_utm?.y ? lot.coords_utm.y.toFixed(2) : '—';
    const lat  = lot.coords_gps?.lat ? lot.coords_gps.lat.toFixed(6) : '—';
    const lon  = lot.coords_gps?.lon ? lot.coords_gps.lon.toFixed(6) : '—';
    EL.panelCoords.innerHTML = `
      <div><strong>UTM 18S:</strong> E ${utmX} · N ${utmY}</div>
      <div style="margin-top: 3px;"><strong>WGS-84:</strong> ${lat}, ${lon}</div>
    `;
  }

  // Vías de acceso
  if (EL.panelVias && lot.vias_colindantes) {
    EL.panelVias.innerHTML = lot.vias_colindantes
      .map(v => `<span class="tech-via-badge">${v}</span>`)
      .join('');
  }

  // Imagen del carrusel según número de lote (para variedad visual)
  const imgIdx = (parseInt(numLote, 10) || 0) % GALLERY_IMAGES.length;
  _galleryIndex = imgIdx;
  if (EL.galleryImg) {
    EL.galleryImg.src = GALLERY_IMAGES[_galleryIndex];
  }

  EL.panel.classList.remove('hidden');
}

export function hideLotPanel() {
  _currentLot = null;
  EL.panel?.classList.add('hidden');
  window.dispatchEvent(new CustomEvent('deselectLot'));
}

// ═════════════════════════════════════════════════════════════════
// BRÚJULA EN TIEMPO REAL
// ═════════════════════════════════════════════════════════════════
export function updateCompass(azimuthAngle) {
  if (EL.compassDial) {
    const deg = -azimuthAngle * (180 / Math.PI);
    EL.compassDial.style.transform = `rotate(${deg}deg)`;
  }
}

// ═════════════════════════════════════════════════════════════════
// TOOLTIPS Y TOASTS
// ═════════════════════════════════════════════════════════════════
export function showTooltip(lot, clientX, clientY) {
  if (!EL.tooltip) return;

  const mzNombre = (lot.manzana || '').replace('MZ-', 'Mz. ');
  const numLote = lot.numero || '';
  if (EL.ttCodigo) EL.ttCodigo.textContent = `Lote ${numLote} · ${mzNombre}`;
  if (EL.ttArea)   EL.ttArea.textContent   = `${lot.area_m2.toFixed(1)} m² · ${_capitalize(lot.estado)}`;
  if (EL.ttPrecio) EL.ttPrecio.textContent = `S/ ${lot.precio_soles.toLocaleString('es-PE')}`;

  const ttw = 160;
  const tth = 70;
  let tx = clientX + 16;
  let ty = clientY - 42;

  if (tx + ttw > window.innerWidth)  tx = clientX - ttw - 12;
  if (ty < 0)                        ty = clientY + 12;
  if (ty + tth > window.innerHeight) ty = window.innerHeight - tth - 8;

  EL.tooltip.style.left = `${tx}px`;
  EL.tooltip.style.top  = `${ty}px`;
  EL.tooltip.classList.remove('hidden');
}

export function showManzanaTooltip(mz, clientX, clientY) {
  if (!EL.tooltip) return;

  if (EL.ttCodigo) EL.ttCodigo.textContent = mz.id.replace('MZ-', 'Manzana ');
  if (EL.ttArea)   EL.ttArea.textContent   = `${mz.totalLots} Lotes · ${mz.disp} Disponibles`;
  if (EL.ttPrecio) EL.ttPrecio.textContent = '🔍 Clic para acercar';

  const ttw = 190;
  const tth = 70;
  let tx = clientX + 16;
  let ty = clientY - 42;

  if (tx + ttw > window.innerWidth)  tx = clientX - ttw - 12;
  if (ty < 0)                        ty = clientY + 12;
  if (ty + tth > window.innerHeight) ty = window.innerHeight - tth - 8;

  EL.tooltip.style.left = `${tx}px`;
  EL.tooltip.style.top  = `${ty}px`;
  EL.tooltip.classList.remove('hidden');
}

export function hideTooltip() {
  EL.tooltip?.classList.add('hidden');
}

export function showToast(message, duration = 2800) {
  let toast = $('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      top: 84px;
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      background: rgba(22, 26, 34, 0.88);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      color: #ffffff;
      padding: 8px 22px;
      border-radius: 100px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      font-size: 13.5px;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.20);
      z-index: 9999;
      pointer-events: none;
      transition: opacity 0.28s ease, transform 0.28s ease;
      opacity: 0;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-8px)';
  }, duration);
}

export function updateFPS(fps) {
  if (EL.fps) EL.fps.textContent = `FPS: ${fps}`;
}

function _capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}
