# 🏡 Visor 3D Inmobiliario

### Recorrido interactivo de terrenos y propiedades — Web & Mobile

## 🎯 Objetivo

Construir un visor 3D inmobiliario interactivo que permita visualizar terrenos, lotes y propiedades desde un navegador web, ofreciendo:

* Vista aérea del proyecto.
* Visualización 3D del terreno.
* Recorrido tipo caminata.
* Zoom, rotación y desplazamiento.
* Selección interactiva de lotes.
* Información de cada lote.
* Recorridos automáticos/cinematográficos.
* Experiencia optimizada para PC, tablet y celular.

El proyecto comenzará con **HTML + CSS + JavaScript + Three.js**, sin framework.

Una vez validado el rendimiento y la experiencia de usuario, se migrará a **Angular** para integrarlo con APIs, autenticación, base de datos y administración inmobiliaria.

---

# 🧱 Arquitectura del proyecto

## Fase inicial — Vanilla JS

```text
visor-3d/
│
├── index.html
│
├── css/
│   ├── style.css
│   └── responsive.css
│
├── js/
│   ├── main.js
│   ├── scene.js
│   ├── camera.js
│   ├── controls.js
│   ├── lighting.js
│   ├── terrain.js
│   ├── lots.js
│   ├── interaction.js
│   ├── tour.js
│   └── performance.js
│
├── assets/
│   ├── models/
│   │   ├── terrain.glb
│   │   ├── lot.glb
│   │   └── vegetation/
│   │
│   ├── textures/
│   │
│   └── images/
│
└── README.md
```

---

# 🚀 ROADMAP

## 🟢 FASE 0 — Investigación y planificación

### Objetivos

Definir qué se quiere representar antes de crear modelos 3D.

### Tareas

* [ ] Definir tipo de propiedad.
* [ ] Definir dimensiones del terreno.
* [ ] Definir cantidad aproximada de lotes.
* [ ] Definir elementos del escenario.
* [ ] Obtener plano o levantamiento del terreno.
* [ ] Definir si se utilizará imagen aérea/satélite como referencia.
* [ ] Definir dispositivos objetivo.
* [ ] Definir calidad gráfica objetivo.

### Dispositivos objetivo

**Desktop**

* PC/Laptop
* Chrome
* Edge
* Firefox

**Mobile**

* iPhone
* Android
* Safari
* Chrome Mobile

---

# 🟢 FASE 1 — Motor 3D básico

### Tecnología

* HTML5
* CSS3
* JavaScript
* Three.js
* WebGL

### Objetivo

Crear una escena 3D mínima.

### Tareas

* [ ] Crear escena Three.js.
* [ ] Crear cámara.
* [ ] Crear renderer.
* [ ] Crear iluminación básica.
* [ ] Crear plano/terreno.
* [ ] Agregar controles.
* [ ] Implementar responsive canvas.
* [ ] Probar en PC.
* [ ] Probar en celular.

### Primer objetivo de rendimiento

```text
Desktop: 60 FPS
Mobile: 30–60 FPS
```

El objetivo no será simplemente "que funcione", sino conseguir una experiencia estable.

---

# 🟢 FASE 2 — Terreno 3D

### Objetivo

Representar el terreno real de la propiedad.

### Tareas

* [ ] Crear/importar terreno.
* [ ] Utilizar GLB/GLTF.
* [ ] Optimizar geometría.
* [ ] Optimizar texturas.
* [ ] Crear materiales.
* [ ] Agregar calles.
* [ ] Agregar veredas.
* [ ] Agregar límites.
* [ ] Agregar áreas verdes.

### Regla

No utilizar modelos de alta resolución innecesariamente.

```text
Calidad visual
      +
Rendimiento
      ↓
Optimización
```

---

# 🟢 FASE 3 — Sistema de lotes

### Objetivo

Convertir el terreno en una experiencia inmobiliaria interactiva.

Cada lote tendrá un identificador.

```text
Lote 01
Lote 02
Lote 03
Lote 04
...
```

### Interacción

Al tocar/clickear un lote:

```text
┌─────────────────────────┐
│ LOTE 03                 │
│                         │
│ Área: 120 m²            │
│ Estado: Disponible      │
│ Precio: S/ XX,XXX       │
│                         │
│ [Ver detalles]          │
└─────────────────────────┘
```

### Tareas

* [ ] Detectar click.
* [ ] Detectar touch.
* [ ] Resaltar lote seleccionado.
* [ ] Mostrar información.
* [ ] Crear panel responsive.
* [ ] Crear estados:

  * Disponible
  * Reservado
  * Vendido

---

# 🟡 FASE 4 — Sistema de navegación

## Modo A — Vista aérea

```text
        🗺️
         ↓
    Vista completa
```

Funciones:

* [ ] Zoom.
* [ ] Rotación.
* [ ] Pan.
* [ ] Vista superior.
* [ ] Vista inclinada.

## Modo B — Recorrido

```text
🚶
Cámara a nivel humano
        ↓
recorrido por la propiedad
```

Funciones:

* [ ] Movimiento adelante.
* [ ] Movimiento atrás.
* [ ] Movimiento lateral.
* [ ] Rotación de cámara.
* [ ] Touch controls.
* [ ] Joystick virtual para móvil.

---

# 🟡 FASE 5 — Recorridos cinematográficos

Crear recorridos automáticos.

Ejemplo:

```text
Vista aérea
     ↓
Zoom
     ↓
Descenso
     ↓
Entrada al proyecto
     ↓
Recorrido
     ↓
Lote seleccionado
```

### Tareas

* [ ] Crear puntos de recorrido.
* [ ] Animar cámara.
* [ ] Transiciones.
* [ ] Movimiento suave.
* [ ] Pausar/reanudar.
* [ ] Saltar a una ubicación.
* [ ] Crear diferentes recorridos.

---

# 🟡 FASE 6 — Optimización Mobile

Esta fase es crítica.

El objetivo es evitar que el dispositivo consuma recursos innecesariamente.

## Geometría

* [ ] Reducir polígonos.
* [ ] Usar modelos optimizados.
* [ ] Implementar LOD.
* [ ] Utilizar instancing para objetos repetidos.
* [ ] Eliminar geometría invisible.

## Texturas

* [ ] Reducir resolución cuando sea posible.
* [ ] Comprimir texturas.
* [ ] Evitar texturas 4K innecesarias.
* [ ] Utilizar formatos adecuados para WebGL.

## Iluminación

* [ ] Limitar luces dinámicas.
* [ ] Reducir sombras.
* [ ] Utilizar iluminación precalculada cuando sea conveniente.

## Carga

* [ ] Lazy loading.
* [ ] Carga progresiva.
* [ ] Cargar zonas cercanas primero.
* [ ] Descargar recursos que ya no sean necesarios.

---

# 🔥 FASE 7 — Sistema de rendimiento

Crear un módulo específico para monitorizar el rendimiento.

```text
FPS: 58
Draw Calls: 42
Triangles: 185K
Textures: 18
Memory: ...
```

### Objetivos

Detectar automáticamente cuándo la escena comienza a ser demasiado pesada.

### Adaptación dinámica

```text
60 FPS
   ↓
Calidad alta

45 FPS
   ↓
Calidad media

30 FPS
   ↓
Reducir efectos

< 25 FPS
   ↓
Modo rendimiento
```

La calidad gráfica podrá adaptarse al dispositivo.

---

# 🟠 FASE 8 — Responsive UI

La interfaz debe diseñarse primero pensando en interacción táctil.

## Desktop

```text
┌──────────────────────────────────────┐
│              3D VIEW                 │
│                                      │
│                            ┌───────┐ │
│                            │ INFO  │ │
│                            └───────┘ │
└──────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────┐
│                  │
│       3D         │
│                  │
│                  │
│       🎮         │
│                  │
├──────────────────┤
│ LOTE 03          │
│ 120 m²           │
│ Disponible       │
└──────────────────┘
```

### Tareas

* [ ] Diseño mobile-first.
* [ ] Touch controls.
* [ ] Botones grandes.
* [ ] Paneles adaptables.
* [ ] Evitar elementos pequeños.
* [ ] Optimizar orientación vertical.
* [ ] Soporte horizontal.

---

# 🟠 FASE 9 — Optimización de red

El modelo 3D no debe descargarse innecesariamente.

Implementar:

* [ ] Compresión de modelos.
* [ ] Compresión de texturas.
* [ ] Lazy loading.
* [ ] Caché.
* [ ] CDN.
* [ ] Precarga de recursos críticos.
* [ ] División del proyecto por zonas.

Objetivo:

```text
Usuario
   ↓
Carga inicial pequeña
   ↓
Escena básica
   ↓
Carga progresiva
   ↓
Recorrido completo
```

---

# 🔵 FASE 10 — Pruebas reales

Probar en diferentes dispositivos.

### Desktop

* [ ] Laptop básica.
* [ ] Laptop media.
* [ ] PC potente.

### Mobile

* [ ] iPhone.
* [ ] Android gama media.
* [ ] Android gama alta.

### Medir

* FPS.
* Tiempo de carga.
* Tamaño de modelos.
* Memoria.
* Temperatura percibida.
* Consumo de batería.
* Tiempo hasta interacción.

No asumir que porque funciona bien en una PC funciona bien en un celular.

---

# 🔵 FASE 11 — Backend

Una vez validado el prototipo 3D:

```text
Three.js
   ↓
Angular
   ↓
API
   ↓
Laravel
   ↓
PostgreSQL
```

La información inmobiliaria dejará de estar escrita directamente en JavaScript.

Ejemplo:

```json
{
  "id": 3,
  "codigo": "L-003",
  "area": 120,
  "precio": 45000,
  "estado": "disponible"
}
```

---

# 🔵 FASE 12 — Migración a Angular

El prototipo Vanilla JS será convertido progresivamente.

### Mantener

* Three.js.
* Modelos 3D.
* Optimización.
* Sistema de cámara.
* Sistema de navegación.
* Sistema de interacción.

### Agregar Angular

* [ ] Componentes.
* [ ] Servicios.
* [ ] Routing.
* [ ] Autenticación.
* [ ] Consumo de API.
* [ ] Gestión de propiedades.
* [ ] Gestión de lotes.
* [ ] Panel administrativo.

---

# 🟣 FASE 13 — Plataforma inmobiliaria

Arquitectura objetivo:

```text
                    CLIENTE
                       │
              ┌────────┴────────┐
              │                 │
           Desktop           Mobile
              │                 │
              └────────┬────────┘
                       ↓
                 Angular Web
                       │
              ┌────────┴────────┐
              │                 │
           UI/UX            Three.js
              │                 │
              └────────┬────────┘
                       ↓
                    Laravel
                       │
                   PostgreSQL
```

---

# 🧠 Principios de desarrollo

## 1. Mobile-first

El proyecto no debe diseñarse pensando únicamente en una PC potente.

## 2. Performance-first

Cada nueva característica debe preguntarse:

> ¿Cuánto cuesta en GPU, CPU, memoria y batería?

## 3. Calidad adaptable

No todos los dispositivos deben renderizar la misma calidad.

```text
Dispositivo potente
        ↓
Alta calidad

Dispositivo medio
        ↓
Calidad equilibrada

Dispositivo limitado
        ↓
Modo rendimiento
```

## 4. Carga progresiva

No cargar toda la propiedad si el usuario solamente está viendo una zona.

## 5. Medir antes de optimizar

No optimizar a ciegas.

Medir:

```text
FPS
Draw Calls
Triangles
Texturas
Memoria
Tiempo de carga
```

---

# 🏆 Resultado final esperado

El usuario podrá entrar desde un navegador:

```text
                 PROPIEDAD
                     │
              ┌──────┴──────┐
              ↓             ↓
          Vista aérea    Recorrido
              │             │
              ↓             ↓
          Seleccionar     Caminar
             lote           │
              │             ↓
              └──────→ Información
                           │
                           ↓
                    Contactar asesor
```

La experiencia deberá funcionar tanto en:

**💻 PC / Laptop**

como en:

**📱 iPhone / Android**

manteniendo una calidad visual atractiva sin sacrificar innecesariamente rendimiento, batería o temperatura.

---

# 🛠️ Stack inicial

```text
HTML5
CSS3
JavaScript
Three.js
WebGL
GLTF / GLB
```

# 🛠️ Stack objetivo

```text
Angular 19
Three.js
TypeScript
Tailwind CSS
Laravel
PostgreSQL
REST API
CDN
```

---

# 📌 Regla principal del proyecto

> **Primero conseguir una experiencia 3D fluida. Después aumentar la calidad visual.**

No queremos construir el modelo 3D más pesado posible.

Queremos construir **la mejor experiencia visual que el dispositivo pueda ejecutar fluidamente**.
