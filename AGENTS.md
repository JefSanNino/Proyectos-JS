# AGENTS.md — Fortuna Familiar

Juego de inversión estático en JavaScript vanilla (sin framework). Todo el texto visible al usuario y los mensajes de commit van **en español**.

## Resumen del proyecto

"Fortuna Familiar" (v3.0): el jugador empieza con **$10,000** y tiene **10 rondas/años** (`TOTAL_RONDAS`) para multiplicarlo. Cada ronda aparece una noticia de un pool de **60** (`poolNoticias`) que mueve el mercado; el jugador reparte dinero —no porcentajes— entre **4 activos reales** (`ASSETS`: 💻 acciones tech, 🌾 materias primas, 🏠 bienes raíces, 🏦 bonos), cada uno con riesgo y volatilidad propios, contra un temporizador de 30 s. El efectivo no invertido se conserva. Dos modos:

- **Individual**: estado completo en `localStorage`; flujo menú → tablero → resultados → final con diploma de inversor según la estrategia.
- **En línea** (Firebase): salas de hasta 8 jugadores vía código de 6 letras o link `?sala=CODIGO`; lobby en vivo, misma noticia para todos, clasificación y podio en tiempo real. El anfitrión controla el avance; cada jugador solo escribe su documento.

El juego enseña relaciones económicas reales en las descripciones de noticias (subida de tasas ↔ bonos caen, guerra ↔ petróleo sube) y clasifica al jugador con un perfil de inversor al terminar.

## Verificación (suite propia, sin build)

No existe `package.json`, linter ni suite de tests. Para verificar cambios:

```bash
node pruebas/pruebas_fortuna.js
```

La suite (30 verificaciones, Node puro, sin dependencias) cubre: sintaxis de los 3 JS, motor en VM de Node (noticias, determinismo PRNG, conservación de dinero, sanitización XSS, códigos de sala), regresiones de sincronización multijugador (bugs del 2026-08-23 congelados como casos), integridad de IDs JS↔HTML y estructura/accesibilidad mínima. Ejecutarla tras CUALQUIER cambio es obligatorio.

Para depurar la lógica pura sin navegador: cargar `motor_juego.js` en una VM de Node con stubs de `document`/`localStorage`/`sessionStorage` y usar el global expuesto `window.FortunaJuego` (expone ASSETS, poolNoticias, efectosDeRonda, calcularRonda, etc.).

## Arquitectura mínima

- Sitio multi-página: `menu_principal.html → tablero_juego.html → resultados_ronda.html → final_partida.html`. Cada `<body>` declara `data-pagina="menu|tablero|resultados|final"` y así detecta el controlador en `motor_juego.js` (`DOMContentLoaded`). **Nunca volver a detectar páginas por IDs de elementos** — así era v2.0 y rompía las 4 pantallas.
- `motor_juego.js`: núcleo (activos, 60 noticias, PRNG, controladores por pantalla).
- `multijugador.js`: salas online con Firebase (Firestore compat SDK vía CDN). Expone `window.FortunaMulti`.
- `config_firebase.js`: credenciales con placeholders `PEGA_AQUI_...`. El modo individual funciona sin Firebase; `FortunaMulti.disponible()` devuelve false si hay placeholders o si el SDK del CDN no cargó. No asumir que Firebase está disponible.

## Invariantes que no se deben romper

- **Determinismo multijugador**: los resultados de ronda se calculan con PRNG sembrado (`mulberry32(semillaDe(semillaBase + '#' + ronda))`) para que todos los clientes obtengan idénticos números sin servidor autoritativo. Jamás usar `Math.random()` dentro del cálculo de efectos/resultados; el PRNG se consume en orden fijo (`ORDEN_ASSETS`). La semilla base es el código de sala (online) o la guardada en el estado (solo).
- **Seguridad**: ningún dato ingresado por usuarios pasa por `innerHTML`; siempre DOM APIs/`textContent` y `sanitizarTexto()`. Las escrituras del jugador van SOLO a su documento `salas/{codigo}/jugadores/{uid}`; el anfitrión avanza rondas cuando todos tienen `rondaConfirmada >= rondaActual`.
- **Sincronía con `firestore.rules`**: las reglas validan tipos/rangos de cada escritura (`rondaConfirmada -1..9`, `noticias.size() == 10`, etc.). Si cambias `TOTAL_RONDAS`, nombres de campos o rangos en el cliente, actualiza `firestore.rules` también.
- Espejos de sesión: `sessionStorage['fortunaCacheSala' | 'fortunaCacheMi']` permiten lecturas síncronas al navegar entre páginas antes de que llegue el snapshot de Firestore. Persistente: `localStorage['perfilFortuna']` (perfil recordado) y `['estadoPartida']` (modo solo).

## Convenciones

- Elementos dinámicos (tarjetas de activos del tablero, botón `btn-reanudar`) se crean desde JS; no buscarlos en el HTML.
- Despliegue: GitHub Pages desde la raíz de `main`; `index.html` solo redirige a `menu_principal.html`.
- Commits descriptivos en español; no hacer push sin pedido explícito.
