/**
 * performance.js
 * Monitor de FPS — actualiza UI cada segundo.
 */
import { updateFPS } from './ui.js';

let _frames   = 0;
let _lastTime = performance.now();

export function initPerformance() {
  _frames   = 0;
  _lastTime = performance.now();
}

/** Llamar en cada frame del render loop. */
export function tickPerformance() {
  _frames++;
  const now  = performance.now();
  const diff = now - _lastTime;

  if (diff >= 1000) {
    const fps = Math.round((_frames * 1000) / diff);
    updateFPS(fps);
    _frames   = 0;
    _lastTime = now;
  }
}
