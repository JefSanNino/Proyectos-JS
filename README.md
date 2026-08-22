# 🎲 Fortuna Familiar v3.0

Juego de inversión y especulación con **activos reales**, **noticias de mercado**,
**inversión por montos de dinero** y **multijugador en línea**.

Portafolio de proyectos en JavaScript — hecho para practicar lógica, DOM,
persistencia y tiempo real con Firebase.

---

## 🎮 Cómo se juega

- Empiezas con **$10,000** y tienes **10 años (rondas)** para multiplicarlos.
- Cada año aparece una **noticia** que mueve el mercado.
- Invierte montos de dinero en 4 activos reales:

| Activo | Riesgo | Comportamiento típico |
|---|---|---|
| 💻 Acciones Tecnológicas | Alto | Despegan con buenas noticias tech; caen con escándalos |
| 🌾 Materias Primas | Medio-Alto | Suben en crisis, guerras e inflación |
| 🏠 Bienes Raíces | Medio-Bajo | Crecen lento, resisten bien las tormentas |
| 🏦 Bonos del Estado | Bajo | Refugio clásico cuando el pánico domina |

- Tienes **30 segundos** por ronda. El efectivo no invertido se conserva intacto.
- Al final recibirás un **diploma de inversor** según tu estrategia.

## 🌐 Multijugador en línea

1. El anfitrión pulsa **CREAR SALA EN LÍNEA** → obtiene un código de 6 letras
   (ej. `KX7QMZ`) y un link de invitación copiable.
2. Los demás escriben el código o abren el link y pulsan **UNIRSE**.
3. El anfitrión inicia la partida: todos juegan la misma noticia a la vez.
4. Tras cada año se ve la clasificación en vivo; al terminar, podio familiar.
5. Tu apodo y avatar quedan guardados: la próxima vez el juego te recuerda.

> Máximo 8 jugadores por sala. Si cierras la pestaña puedes reanudar con
> el botón **REANUDAR SALA** del menú (mientras la partida siga abierta).

## ▶️ Ejecutar el proyecto

Es un sitio estático. Opciones:

```bash
# Opción 1: abrir directo
abrir menu_principal.html en el navegador

# Opción 2: servidor local
npx serve .
# o
python3 -m http.server 8080
```

El **modo individual funciona sin configurar nada**. El modo en línea
requiere Firebase (siguiente sección).

## 🔥 Activar el modo en línea (Firebase, gratis)

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com).
2. **Firestore Database** → Crear base de datos (modo producción).
3. **Authentication → Sign-in method** → activa **Anónimo**.
4. ⚙️ Configuración del proyecto → "Tus apps" → registra una **app web (</>)**
   y copia los valores del objeto `firebaseConfig`.
5. Pega esos valores en [`config_firebase.js`](config_firebase.js)
   (reemplaza los textos `PEGA_AQUI_...`).
6. Copia el contenido de [`firestore.rules`](firestore.rules) en
   **Firestore → Reglas** y pulsa **Publicar**.

Listo — CREAR SALA / UNIRSE quedarán activados automáticamente.

### 📄 Modelo de datos

```
salas/{codigo}                    # estado del juego (solo lo escribe el anfitrión)
  ├─ hostUid, estado, rondaActual, totalRondas, noticias[10]
  └─ jugadores/{uid}              # cada jugador SOLO escribe su propio doc
       └─ nombre, avatarEmoji, capital, rondaConfirmada, asignacionesUltima…
```

## 🔒 Seguridad

- **Reglas de Firestore**: cada jugador solo puede escribir su propio documento;
  solo el anfitrión controla `estado`/`rondaActual`; validación de tipos,
  longitudes y rangos numéricos en cada escritura.
- **Anti-XSS**: ningún dato ingresado por usuarios se inyecta con `innerHTML`;
  todo se renderiza con `textContent`/DOM APIs y los nombres se sanitizan
  (`sanitizarTexto`, máx. 20 caracteres sin `<>&"'`).
- **Autenticación anónima**: identidad mínima, sin datos personales.
- La `apiKey` de una app web **no es secreta** por diseño de Firebase;
  la protección real son las reglas publicadas.

## 🚀 Publicar en línea (GitHub Pages)

1. Sube los cambios: `git push origin main`.
2. En GitHub → tu repo → **Settings → Pages**.
3. Source: *Deploy from a branch* → Branch: `main` / carpeta `/ (root)` → Save.
4. Tu juego quedará en:
   `https://jefsannino.github.io/Proyectos-JS/`

Comparte el link de invitación con `?sala=CODIGO` y cualquiera entra directo.

## 🗂️ Estructura

```
├── index.html               # entrada (redirige al menú) para GitHub Pages
├── menu_principal.html      # perfil, salas online, modal CÓMO JUGAR
├── tablero_juego.html       # tablero con montos por activo + temporizador
├── resultados_ronda.html    # cierre de año + desglose + clasificación
├── final_partida.html       # estadísticas, diploma y podio
├── motor_juego.js           # núcleo: activos, noticias, PRNG determinista
├── multijugador.js          # Firebase: salas, lobby, sincronización
├── config_firebase.js       # ← pega aquí tus credenciales Firebase
├── firestore.rules          # reglas de seguridad del backend
└── style_*.css              # estilos por pantalla
```

## 🧠 Detalles técnicos interesantes

- **PRNG determinista (`mulberry32` + semilla por sala/ronda)**: todas las
  computadoras calculan exactamente los mismos rendimientos sin necesidad de
  un servidor autoritativo — cada jugador escribe solo su propio resultado.
- **60 noticias** con efectos por activo y descripciones pedagógicas que
  enseñan relaciones reales (subida de tasas ↔ bonos, guerra ↔ petróleo…).
- Precios por activo que evolucionan ronda a ronda con indicador de tendencia.

---

Hecho con HTML, CSS y JavaScript vanilla + Firebase.
