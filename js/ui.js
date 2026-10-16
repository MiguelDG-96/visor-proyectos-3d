/**
 * ui.js
 * Toda la lógica del DOM: panel de lote, tooltip, stats, filtros.
 * No importa nada de Three.js — solo DOM.
 */

// ── Caché de elementos DOM ────────────────────
const $ = id => document.getElementById(id);

const EL = {
  panel:        $('lot-panel'),
  panelEstado:  $('panel-estado'),
  panelCodigo:  $('panel-codigo'),
  panelArea:    $('panel-area'),
  panelFrente:  $('panel-frente'),
  panelFondo:   $('panel-fondo'),
  panelManzana: $('panel-manzana'),
  panelPrecio:  $('panel-precio'),
  panelPrecioM2:$('panel-precio-m2'),
  panelCoords:  $('panel-coords'),
  panelVias:    $('panel-vias'),
  btnClose:     $('btn-close-panel'),
  btnContactar: $('btn-contactar'),

  tooltip:    $('tooltip'),
  ttCodigo:   $('tt-codigo'),
  ttArea:     $('tt-area'),
  ttPrecio:   $('tt-precio'),

  countDisp: $('count-disponible'),
  countRes:  $('count-reservado'),
  countVend: $('count-vendido'),

  btnTodos:  $('btn-todos'),
  btnDisp:   $('btn-disponibles'),
  btnRes:    $('btn-reservados'),
  btnReset:  $('btn-reset-camera'),

  fps:       $('fps-label'),
  lotsLabel: $('lots-label'),
};

// ══════════════════════════════════════════════
// Inicialización
// ══════════════════════════════════════════════

/**
 * Vincula todos los handlers de la UI.
 * @param {Function} onFilter      Callback: (filter: string) => void
 * @param {Function} onResetCamera Callback: () => void
 */
export function initUI(onFilter, onResetCamera) {
  // Cerrar panel
  EL.btnClose?.addEventListener('click', hideLotPanel);

  // Botón contactar (demo — WhatsApp o modal)
  EL.btnContactar?.addEventListener('click', () => {
    const lot   = EL.panel.dataset.lotId;
    const msg   = encodeURIComponent(`Hola, me interesa el lote ${lot} del proyecto Lotización Chávez Pata en Moyobamba.`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  });

  // Filtros
  const btns    = [EL.btnTodos, EL.btnDisp, EL.btnRes];
  const filters = ['all', 'disponible', 'reservado'];

  btns.forEach((btn, i) => {
    btn?.addEventListener('click', () => {
      btns.forEach(b => b?.classList.remove('active'));
      btn.classList.add('active');
      onFilter(filters[i]);
    });
  });

  // Reset cámara
  EL.btnReset?.addEventListener('click', onResetCamera);

  // Modo caminata
  const btnWalk = $('btn-walk-mode');
  if (btnWalk) {
    btnWalk.addEventListener('click', () => {
      // Disparar evento para entrar a modo caminata
      window.dispatchEvent(new CustomEvent('enterWalkMode'));
    });
  }

  // Modo Tour Guiado
  const btnTour = $('btn-tour-mode');
  if (btnTour) {
    btnTour.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggleTourMode'));
    });
  }
  
  // Día / Noche
  const btnDayNight = $('btn-day-night');
  if (btnDayNight) {
    btnDayNight.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggleDayNight'));
    });
  }

  // Capa Satélite Google Earth
  const btnSat = $('btn-satellite');
  if (btnSat) {
    btnSat.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('toggleSatellite'));
    });
  }
}

// ══════════════════════════════════════════════
// Stats header
// ══════════════════════════════════════════════

/**
 * Actualiza contadores en el header.
 * @param {Array} lotes
 */
export function updateStats(lotes) {
  const counts = { disponible: 0, reservado: 0, vendido: 0 };
  lotes.forEach(l => { if (l.estado in counts) counts[l.estado]++; });

  if (EL.countDisp)  EL.countDisp.textContent  = counts.disponible;
  if (EL.countRes)   EL.countRes.textContent   = counts.reservado;
  if (EL.countVend)  EL.countVend.textContent  = counts.vendido;
  if (EL.lotsLabel)  EL.lotsLabel.textContent  = `${lotes.length} lotes`;
}

// ══════════════════════════════════════════════
// Panel de lote
// ══════════════════════════════════════════════

/**
 * Muestra el panel lateral con info del lote.
 * @param {object} lot  Objeto lote del JSON
 */
export function showLotPanel(lot) {
  if (!EL.panel) return;

  // Guardar id para WhatsApp
  EL.panel.dataset.lotId = lot.codigo;

  // Estado badge
  if (EL.panelEstado) {
    EL.panelEstado.textContent = _capitalize(lot.estado);
    EL.panelEstado.className   = `panel-estado-badge ${lot.estado}`;
  }

  if (EL.panelCodigo)   EL.panelCodigo.textContent   = lot.codigo;
  if (EL.panelArea)     EL.panelArea.textContent     = `${lot.area_m2.toFixed(2)} m²`;
  if (EL.panelFrente)   EL.panelFrente.textContent   = lot.perimetro_m ? `${lot.perimetro_m.toFixed(2)} m` : '—';
  if (EL.panelFondo)    EL.panelFondo.textContent    = lot.frente_m ? `${lot.frente_m.toFixed(2)} m` : '—';
  if (EL.panelManzana)  EL.panelManzana.textContent  = lot.manzana;

  if (EL.panelPrecio) {
    EL.panelPrecio.textContent = `S/ ${lot.precio_soles.toLocaleString('es-PE')}`;
  }
  if (EL.panelPrecioM2) {
    EL.panelPrecioM2.textContent = `S/ ${lot.precio_m2.toFixed(2)} / m²`;
  }

  // Georreferenciación oficial UTM y GPS
  if (EL.panelCoords) {
    const utmX = lot.coords_utm?.x ? lot.coords_utm.x.toFixed(2) : '—';
    const utmY = lot.coords_utm?.y ? lot.coords_utm.y.toFixed(2) : '—';
    const lat  = lot.coords_gps?.lat ? lot.coords_gps.lat.toFixed(6) : '—';
    const lon  = lot.coords_gps?.lon ? lot.coords_gps.lon.toFixed(6) : '—';
    EL.panelCoords.innerHTML = `
      <div><strong>UTM 18S:</strong> E ${utmX} · N ${utmY}</div>
      <div style="margin-top: 3px;"><strong>WGS84:</strong> ${lat}, ${lon}</div>
    `;
  }

  // Vías colindantes
  if (EL.panelVias) {
    EL.panelVias.innerHTML = lot.vias_colindantes
      .map(v => `<span class="via-tag">${v}</span>`)
      .join('');
  }

  EL.panel.classList.remove('hidden');
}

/** Oculta el panel. */
export function hideLotPanel() {
  EL.panel?.classList.add('hidden');
}

// ══════════════════════════════════════════════
// Tooltip
// ══════════════════════════════════════════════

/**
 * Muestra el tooltip junto al cursor.
 * @param {object} lot
 * @param {number} clientX
 * @param {number} clientY
 */
export function showTooltip(lot, clientX, clientY) {
  if (!EL.tooltip) return;

  if (EL.ttCodigo)  EL.ttCodigo.textContent  = lot.codigo;
  if (EL.ttArea)    EL.ttArea.textContent    = `${lot.area_m2.toFixed(1)} m²`;
  if (EL.ttPrecio)  EL.ttPrecio.textContent  = `S/ ${lot.precio_soles.toLocaleString('es-PE')}`;

  // Posicionar tooltip sin salir del viewport
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

/**
 * Muestra el tooltip informativo al pasar el cursor sobre el globo de una manzana
 */
export function showManzanaTooltip(mz, clientX, clientY) {
  if (!EL.tooltip) return;

  if (EL.ttCodigo)  EL.ttCodigo.textContent  = mz.id;
  if (EL.ttArea)    EL.ttArea.textContent    = `${mz.totalLots} Lotes · ${mz.disp} Disponibles`;
  if (EL.ttPrecio)  EL.ttPrecio.textContent  = '🔍 Clic para acercar y ampliar';

  const ttw = 220;
  const tth = 75;
  let tx = clientX + 16;
  let ty = clientY - 42;

  if (tx + ttw > window.innerWidth)  tx = clientX - ttw - 12;
  if (ty < 0)                        ty = clientY + 12;
  if (ty + tth > window.innerHeight) ty = window.innerHeight - tth - 8;

  EL.tooltip.style.left = `${tx}px`;
  EL.tooltip.style.top  = `${ty}px`;
  EL.tooltip.classList.remove('hidden');
}

/**
 * Muestra un aviso flotante temporal elegante (toast)
 */
export function showToast(message, duration = 2800) {
  let toast = $('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #ffffff;
      padding: 10px 22px;
      border-radius: 9999px;
      border: 1px solid rgba(56, 189, 248, 0.45);
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      z-index: 9999;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
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
    toast.style.transform = 'translateX(-50%) translateY(8px)';
  }, duration);
}

/** Oculta el tooltip. */
export function hideTooltip() {
  EL.tooltip?.classList.add('hidden');
}

// ══════════════════════════════════════════════
// Performance
// ══════════════════════════════════════════════

/** Actualiza el contador de FPS. */
export function updateFPS(fps) {
  if (EL.fps) EL.fps.textContent = `FPS: ${fps}`;
}

// ── Helpers ────────────────────────────────────
function _capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}
