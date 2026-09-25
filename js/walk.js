import * as THREE from 'three';
import { getCamera } from './scene.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

let controls;
let isActive = false;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let joyDir = { x: 0, y: 0 }; // Dirección del joystick
let joystickManager = null;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Elemento UI para instrucciones de caminata
let overlayInstructions;

export function initWalkMode(renderer, scene) {
  const camera = getCamera();
  controls = new PointerLockControls(camera, renderer.domElement);

  scene.add(controls.getObject());

  // Interfaz de instrucciones
  overlayInstructions = document.createElement('div');
  overlayInstructions.id = 'walk-instructions';
  overlayInstructions.style.position = 'absolute';
  overlayInstructions.style.top = '0';
  overlayInstructions.style.left = '0';
  overlayInstructions.style.width = '100%';
  overlayInstructions.style.height = '100%';
  overlayInstructions.style.backgroundColor = 'rgba(0,0,0,0.7)';
  overlayInstructions.style.color = '#ffffff';
  overlayInstructions.style.display = 'none';
  overlayInstructions.style.flexDirection = 'column';
  overlayInstructions.style.justifyContent = 'center';
  overlayInstructions.style.alignItems = 'center';
  overlayInstructions.style.zIndex = '9999';
  overlayInstructions.innerHTML = `
    <span style="font-size:40px; margin-bottom: 20px;">🚶 Modo Caminata</span>
    <span style="font-size:20px">Click para empezar</span>
    <span style="font-size:16px; margin-top:20px; color:#aaa">(Presiona ESC para salir de este modo)</span>
    <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left;">
      <div><b>W / ↑</b> : Adelante</div>
      <div><b>S / ↓</b> : Atrás</div>
      <div><b>A / ←</b> : Izquierda</div>
      <div><b>D / →</b> : Derecha</div>
    </div>
    <button id="btn-exit-walk" style="margin-top:40px; padding: 10px 20px; background: #ef4444; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px;">Salir del modo caminata</button>
  `;
  document.body.appendChild(overlayInstructions);

  overlayInstructions.addEventListener('click', () => {
    controls.lock();
  });

  document.getElementById('btn-exit-walk').addEventListener('click', (e) => {
    e.stopPropagation();
    disableWalkMode();
  });

  controls.addEventListener('lock', () => {
    overlayInstructions.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    if (isActive) overlayInstructions.style.display = 'flex';
  });

  const onKeyDown = (event) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': moveForward = true; break;
      case 'ArrowLeft':
      case 'KeyA': moveLeft = true; break;
      case 'ArrowDown':
      case 'KeyS': moveBackward = true; break;
      case 'ArrowRight':
      case 'KeyD': moveRight = true; break;
    }
  };

  const onKeyUp = (event) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': moveForward = false; break;
      case 'ArrowLeft':
      case 'KeyA': moveLeft = false; break;
      case 'ArrowDown':
      case 'KeyS': moveBackward = false; break;
      case 'ArrowRight':
      case 'KeyD': moveRight = false; break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Joystick para móviles
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const zone = document.getElementById('joystick-zone');
    if (window.nipplejs && zone) {
      joystickManager = window.nipplejs.create({
        zone: zone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white'
      });
      joystickManager.on('move', (evt, data) => {
        const force = Math.min(data.force, 2.0); // max force
        const angle = data.angle.radian;
        joyDir.x = Math.cos(angle) * force;
        joyDir.y = Math.sin(angle) * force;
      });
      joystickManager.on('end', () => {
        joyDir.x = 0;
        joyDir.y = 0;
      });
    }
  }
}

export function enableWalkMode(startPos) {
  isActive = true;
  overlayInstructions.style.display = 'flex';
  document.getElementById('crosshair').style.display = 'block';
  
  // Mostrar joystick si estamos en móvil
  if (joystickManager) {
    document.getElementById('joystick-zone').style.display = 'block';
  }
  
  // Posicionar cámara a nivel elevado para mejor visibilidad (estilo dron bajo)
  const camera = getCamera();
  camera.position.set(startPos.x, 6.0, startPos.z);
  // Mirar hacia adelante (un poco en Z)
  camera.lookAt(startPos.x, 6.0, startPos.z - 10);
  
  prevTime = performance.now();
}

export function disableWalkMode() {
  isActive = false;
  controls.unlock();
  overlayInstructions.style.display = 'none';
  document.getElementById('crosshair').style.display = 'none';
  if (joystickManager) {
    document.getElementById('joystick-zone').style.display = 'none';
    joyDir.x = 0;
    joyDir.y = 0;
  }
  
  // Disparar evento para que main.js restaure OrbitControls
  window.dispatchEvent(new CustomEvent('exitWalkMode'));
}

export function isWalkModeActive() {
  return isActive;
}

export function updateWalkMode() {
  if (!isActive || !controls.isLocked) return;

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize(); // para que diagonal no sea más rápido

  const speed = 250.0; // Velocidad de caminata aumentada

  // Teclado
  if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
  
  // Joystick (móvil)
  if (joyDir.x !== 0 || joyDir.y !== 0) {
    // joyDir.y positivo es arriba, negativo abajo. Pero en 3D, z negativo es adelante
    velocity.z -= joyDir.y * speed * delta * 0.5;
    velocity.x += joyDir.x * speed * delta * 0.5;
  }

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  // Mantener altura fija (6.0m)
  const camera = getCamera();
  camera.position.y = 6.0;

  prevTime = time;
}
