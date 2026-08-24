// =====================================================
// FORTUNA FAMILIAR v3.0 — CAPA MULTIJUGADOR (Firebase)
// Archivo: multijugador.js
//
// Responsabilidades:
//   - Autenticación anónima en Firebase.
//   - Crear/unirse a salas con código de 6 caracteres.
//   - Sincronizar el lobby y las rondas en tiempo real.
//   - Cada jugador SOLO escribe su propio documento
//     (las reglas de firestore.rules lo garantizan).
//   - El anfitrión avanza la ronda cuando todos confirman.
//   - Espejo de los datos en sessionStorage para que las
//     pantallas puedan leerlos de inmediato tras navegar.
//
// Si Firebase no está configurado, disponible() devuelve
// false y el juego funciona perfectamente en modo individual.
// =====================================================

'use strict';

window.FortunaMulti = (function () {

    // ---------- Estado interno ----------
    let db = null;
    let auth = null;
    let inicializado = false;

    let uidActual = null;
    let salaActual = null;
    let esHostFlag = false;

    let unsubSala = null;
    let unsubJugadores = null;

    let cacheSala = null;       // { codigo, hostUid, estado, rondaActual, totalRondas, noticias }
    let cacheJugadores = [];    // [{ uid, nombre, avatarEmoji, capital, rondaConfirmada, ... }]
    let miJugador = null;

    let callbacksSala = [];
    let callbackClasificacion = null;
    let elementoListosUI = null;
    let temporizadorAvance = null;
    let navegando = false;

    // ---------- Claves de espejo (sessionStorage/localStorage) ----------
    const CLAVE_MIRROR_SALA = 'fortunaCacheSala';
    const CLAVE_MIRROR_MI = 'fortunaCacheMi';
    const CLAVE_ULTIMA_NAV = 'fortunaUltimaNavegacion';

    function guardarEspejos() {
        try {
            if (cacheSala) sessionStorage.setItem(CLAVE_MIRROR_SALA, JSON.stringify(cacheSala));
            if (miJugador) sessionStorage.setItem(CLAVE_MIRROR_MI, JSON.stringify(miJugador));
        } catch (e) { /* almacenamiento lleno o bloqueado */ }
    }

    function borrarEspejos() {
        try {
            sessionStorage.removeItem(CLAVE_MIRROR_SALA);
            sessionStorage.removeItem(CLAVE_MIRROR_MI);
        } catch (e) { /* ignorar */ }
    }

    // ---------- Inicialización ----------
    function configurado() {
        return typeof FIREBASE_CONFIG !== 'undefined'
            && FIREBASE_CONFIG
            && typeof FIREBASE_CONFIG.apiKey === 'string'
            && !FIREBASE_CONFIG.apiKey.includes('PEGA_AQUI')
            && typeof firebase !== 'undefined';
    }

    function disponible() { return configurado(); }

    async function inicializar() {
        if (inicializado) return;
        if (!configurado()) throw new Error('Firebase sin configurar');

        firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();

        // Autenticación anónima: identidad mínima y sin datos personales
        const cred = await auth.signInAnonymously();
        uidActual = cred.user.uid;
        inicializado = true;
    }

    /** Espera (con tope de tiempo) a que llegue la primera instantánea de la sala */
    function esperarSala(topeMs = 5000) {
        if (cacheSala) return Promise.resolve(cacheSala);
        return new Promise(resolver => {
            const t0 = Date.now();
            const intervalo = setInterval(() => {
                if (cacheSala || Date.now() - t0 > topeMs) {
                    clearInterval(intervalo);
                    resolver(cacheSala);
                }
            }, 100);
        });
    }

    /**
     * Espera a que estén disponibles AMBOS datos (documento de la sala Y el
     * propio documento de jugador). Evita la carrera en la que la página
     * arranca con sala cargada pero jugadores aún vacíos.
     * Devuelve { sala, mi } o null si venció el tope.
     */
    function esperarTodo(topeMs = 6000) {
        if (cacheSala && miJugador) return Promise.resolve({ sala: cacheSala, mi: miJugador });
        return new Promise(resolver => {
            const t0 = Date.now();
            const intervalo = setInterval(() => {
                if ((cacheSala && miJugador) || Date.now() - t0 > topeMs) {
                    clearInterval(intervalo);
                    resolver(cacheSala && miJugador ? { sala: cacheSala, mi: miJugador } : null);
                }
            }, 100);
        });
    }

    // ---------- Utilidades ----------
    function paginaActual() {
        return document.body ? document.body.getAttribute('data-pagina') : null;
    }

    function navegar(url) {
        if (navegando) return;
        // Blindaje anti-bucle: si la última navegación fue hace menos de
        // 1.5 s (marca persistente entre recargas), suprimir y romper ciclos.
        try {
            const previa = Number(localStorage.getItem(CLAVE_ULTIMA_NAV)) || 0;
            if (Date.now() - previa < 1500) {
                console.warn('⏸ Navegación suprimida por protección anti-bucle:', url);
                return;
            }
            localStorage.setItem(CLAVE_ULTIMA_NAV, String(Date.now()));
        } catch (e) { /* almacenamiento no disponible: navegar normal */ }
        navegando = true;
        window.location.href = url;
    }

    function limpiarDesglose(desglose) {
        const J = window.FortunaJuego;
        const salida = {};
        (J ? J.ORDEN_ASSETS : Object.keys(desglose || {})).forEach(clave => {
            const d = desglose?.[clave];
            if (!d) return;
            salida[clave] = {
                nombre: String(d.nombre || '').slice(0, 40),
                emoji: String(d.emoji || '').slice(0, 8),
                monto: Math.max(0, Number(d.monto) || 0),
                efecto: Number(d.efecto) || 1,
                neto: Number(d.neto) || 0,
                afectado: !!d.afectado
            };
        });
        return salida;
    }

    function montosSeguros(montos) {
        const J = window.FortunaJuego;
        const salida = {};
        (J ? J.ORDEN_ASSETS : Object.keys(montos || {})).forEach(clave => {
            salida[clave] = Math.max(0, Math.min(99999999, Math.floor(Number(montos?.[clave]) || 0)));
        });
        return salida;
    }

    /** Confirmación de ronda de un jugador (-1 = sin confirmar; OJO: 0 es válido) */
    function confirmacionDe(jugador) {
        const v = Number(jugador.rondaConfirmada);
        return Number.isFinite(v) ? v : -1;
    }

    // ---------- Documento del jugador ----------
    function refMiJugador(codigo) {
        return db.collection('salas').doc(codigo).collection('jugadores').doc(uidActual);
    }

    async function escribirMiJugador(codigo, perfil, camposExtra = {}) {
        const ref = refMiJugador(codigo);
        const datos = {
            nombre: window.FortunaJuego.sanitizarTexto(perfil.nombreUsuario, 20) || 'Jugador',
            avatarEmoji: String(perfil.avatarEmoji || '🧔').slice(0, 8),
            avatarPerfil: String(perfil.avatarPerfil || 'Empresario').slice(0, 20),
            conectado: true,
            esHost: esHostFlag,
            ...camposExtra
        };
        await ref.set(datos, { merge: true });
    }

    // ---------- Suscripción a una sala ----------
    async function suscribirseASala(codigo) {
        if (!db || !/^[A-Z0-9]{6}$/.test(codigo)) return;

        salaActual = codigo;
        desuscribir();

        unsubSala = db.collection('salas').doc(codigo).onSnapshot(
            snapDoc => {
                if (!snapDoc.exists) {
                    // La sala fue cerrada por el anfitrión
                    if (paginaActual() !== 'menu') {
                        alert('👋 La sala fue cerrada por el anfitrión.');
                        salirDeSala().finally(() => navegar('menu_principal.html'));
                    } else {
                        salirDeSalaSilenciosa();
                    }
                    return;
                }
                const datos = snapDoc.data();
                esHostFlag = datos.hostUid === uidActual;
                cacheSala = { codigo, ...datos };
                guardarEspejos();
                notificarSala();
                procesarTransiciones();
                revisarAvance();
            },
            err => console.warn('Error escuchando la sala:', err.message)
        );

        unsubJugadores = db.collection('salas').doc(codigo).collection('jugadores').onSnapshot(
            snapCol => {
                cacheJugadores = [];
                miJugador = null;
                snapCol.forEach(doc => {
                    const j = { uid: doc.id, ...doc.data() };
                    cacheJugadores.push(j);
                    if (doc.id === uidActual) miJugador = j;
                });
                guardarEspejos();
                if (callbackClasificacion) callbackClasificacion([...cacheJugadores]);
                actualizarListos(elementoListosUI);
                renderizarLobbySiVisible();
                revisarAvance();
            },
            err => console.warn('Error escuchando jugadores:', err.message)
        );
    }

    function desuscribir() {
        if (unsubSala) { unsubSala(); unsubSala = null; }
        if (unsubJugadores) { unsubJugadores(); unsubJugadores = null; }
    }

    function notificarSala() {
        callbacksSala.forEach(cb => {
            try { cb({ ...cacheSala }); } catch (e) { console.error(e); }
        });
    }

    /** Navegación automática según el estado de la sala */
    function procesarTransiciones() {
        if (!cacheSala) return;
        const pagina = paginaActual();

        if (pagina === 'menu' && cacheSala.estado === 'jugando') {
            navegar(`tablero_juego.html?sala=${cacheSala.codigo}`);
        } else if (pagina === 'tablero' && cacheSala.estado === 'finalizada') {
            navegar(`final_partida.html?sala=${cacheSala.codigo}`);
        }
        // Los cambios de ronda los maneja el controlador del tablero/resultados
    }

    // ---------- Flujo: crear / unirse ----------
    async function crearSala(perfil) {
        await inicializar();
        const J = window.FortunaJuego;

        for (let intento = 0; intento < 5; intento++) {
            const codigo = J.generarCodigoSala();
            const ref = db.collection('salas').doc(codigo);
            try {
                await db.runTransaction(async tx => {
                    const actual = await tx.get(ref);
                    if (actual.exists) throw new Error('CODIGO_OCUPADO');
                    tx.set(ref, {
                        hostUid: uidActual,
                        estado: 'esperando',
                        rondaActual: 0,
                        totalRondas: J.TOTAL_RONDAS,
                        noticias: J.barajar(J.poolNoticias).slice(0, J.TOTAL_RONDAS),
                        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                esHostFlag = true;
                await escribirMiJugador(codigo, perfil, {
                    capital: J.CAPITAL_INICIAL,
                    rondaConfirmada: -1,
                    asignacionesUltima: {},
                    netoUltima: 0,
                    capitalAnteriorUltima: J.CAPITAL_INICIAL
                });
                J.guardarPerfil({ ultimaSala: codigo });
                await suscribirseASala(codigo);
                entrarEnLobby(codigo);
                return;
            } catch (e) {
                if (e.message !== 'CODIGO_OCUPADO') throw e;
                // código repetido: probar otro
            }
        }
        throw new Error('No se pudo generar un código libre, intenta de nuevo');
    }

    async function unirseASala(codigo, perfil) {
        await inicializar();
        const J = window.FortunaJuego;

        const ref = db.collection('salas').doc(codigo);
        const snap = await ref.get();

        if (!snap.exists) {
            alert('🔍 Esa sala no existe. Verifica el código.');
            return;
        }
        const sala = snap.data();

        const misDocs = await ref.collection('jugadores').get();
        const yaEstoy = misDocs.docs.some(d => d.id === uidActual);

        if (sala.estado !== 'esperando' && !yaEstoy) {
            alert('⏳ Esa partida ya comenzó. Pide una nueva sala.');
            return;
        }
        if (misDocs.size >= 8 && !yaEstoy) {
            alert('👨‍👩‍👧‍👦 La sala está llena (máximo 8 jugadores).');
            return;
        }

        await escribirMiJugador(codigo, perfil, yaEstoy ? {} : {
            capital: J.CAPITAL_INICIAL,
            rondaConfirmada: -1,
            asignacionesUltima: {},
            netoUltima: 0,
            capitalAnteriorUltima: J.CAPITAL_INICIAL
        });

        J.guardarPerfil({ ultimaSala: codigo });
        await suscribirseASala(codigo);

        // Si la partida ya va corriendo (reconexión), saltar directo al juego
        if (sala.estado === 'jugando') {
            navegar(`tablero_juego.html?sala=${codigo}`);
        } else {
            entrarEnLobby(codigo);
        }
    }

    async function iniciarPartida() {
        if (!esHostFlag || !salaActual) return;
        await db.collection('salas').doc(salaActual)
            .update({ estado: 'jugando', rondaActual: 0 });
    }

    // ---------- Confirmación de ronda ----------
    async function confirmarRonda({ ronda, montos, resultado, capitalAnterior }) {
        if (!salaActual) throw new Error('Sin sala activa');

        await escribirMiJugador(salaActual, window.FortunaJuego.obtenerPerfil(), {
            capital: Math.max(0, Number(resultado.nuevoCapital.toFixed(2))),
            rondaConfirmada: ronda,
            asignacionesUltima: montosSeguros(montos),
            netoUltima: Number(resultado.netoTotal.toFixed(2)),
            desgloseUltima: limpiarDesglose(resultado.desglose),
            capitalAnteriorUltima: Math.max(0, Number(capitalAnterior.toFixed(2)))
        });
    }

    /** El anfitrión avanza la ronda cuando todos confirmaron */
    function revisarAvance() {
        if (!esHostFlag || !cacheSala || cacheSala.estado !== 'jugando') return;
        if (cacheJugadores.length === 0) return;

        const ronda = cacheSala.rondaActual;
        const todos = cacheJugadores.every(j => confirmacionDe(j) >= ronda);
        if (!todos) return;

        if (temporizadorAvance) clearTimeout(temporizadorAvance);
        temporizadorAvance = setTimeout(async () => {
            try {
                // Doble verificación contra el servidor antes de avanzar
                const ref = db.collection('salas').doc(salaActual);
                const fresco = await ref.get();
                if (!fresco.exists || fresco.data().rondaActual !== ronda) return;

                const esUltima = ronda >= (window.FortunaJuego.TOTAL_RONDAS - 1);
                await ref.update(esUltima ? { estado: 'finalizada' } : { rondaActual: ronda + 1 });
            } catch (e) {
                console.warn('No se pudo avanzar la ronda:', e.message);
            }
        }, 2500); // pequeña pausa para que todos lean los resultados
    }

    // ---------- Lobby (página de menú) ----------
    function entrarEnLobby(codigo) {
        const lobby = document.getElementById('lobby-seccion');
        const acciones = document.querySelector('.menu-actions');
        const perfilCard = document.querySelector('.avatar-selection');
        const chip = document.getElementById('chip-perfil');
        if (!lobby) return;

        lobby.hidden = false;
        if (acciones) acciones.style.display = 'none';
        if (perfilCard) perfilCard.style.display = 'none';
        if (chip) chip.hidden = true;

        const codigoEl = document.getElementById('lobby-codigo');
        if (codigoEl) codigoEl.textContent = codigo;

        const btnCopiar = document.getElementById('btn-copiar-link');
        if (btnCopiar) {
            btnCopiar.onclick = async () => {
                const url = `${window.location.origin}${window.location.pathname}?sala=${codigo}`;
                try {
                    await navigator.clipboard.writeText(url);
                    btnCopiar.textContent = '✅ ¡Link copiado!';
                } catch (e) {
                    window.prompt('Copia este link de invitación:', url);
                }
                setTimeout(() => { btnCopiar.textContent = '🔗 Copiar link de invitación'; }, 2200);
            };
        }

        const btnIniciar = document.getElementById('btn-iniciar-partida');
        if (btnIniciar) {
            btnIniciar.hidden = !esHostFlag;
            btnIniciar.onclick = () => iniciarPartida().catch(err => alert('❌ ' + err.message));
        }

        const btnSalir = document.getElementById('btn-salir-lobby');
        if (btnSalir) {
            btnSalir.onclick = () => salirDeSala().finally(() => window.location.reload());
        }

        renderizarLobbySiVisible();
    }

    function renderizarLobbySiVisible() {
        if (paginaActual() !== 'menu' || !salaActual) return;
        const lista = document.getElementById('lobby-jugadores');
        if (!lista) return;

        lista.textContent = '';
        cacheJugadores.forEach(j => {
            const li = document.createElement('li');
            const nombreSpan = document.createElement('span');
            nombreSpan.textContent = `${j.avatarEmoji || ''} ${j.nombre}`.trim();
            li.appendChild(nombreSpan);

            if (j.esHost || j.uid === (cacheSala && cacheSala.hostUid)) {
                const tag = document.createElement('span');
                tag.className = 'host-tag';
                tag.textContent = 'ANFITRIÓN';
                li.appendChild(tag);
            }
            lista.appendChild(li);
        });

        const espera = document.getElementById('lobby-espera');
        const btnIniciar = document.getElementById('btn-iniciar-partida');
        if (espera) {
            espera.hidden = esHostFlag;
            espera.textContent = `👥 ${cacheJugadores.length}/8 jugadores — comparte el código para invitar`;
        }
        if (btnIniciar) btnIniciar.hidden = !esHostFlag;
    }

    // ---------- Salir de la sala ----------
    function salirDeSalaSilenciosa() {
        desuscribir();
        salaActual = null;
        esHostFlag = false;
        cacheSala = null;
        cacheJugadores = [];
        miJugador = null;
        borrarEspejos();
    }

    async function salirDeSala() {
        try {
            if (db && uidActual && salaActual) {
                const batch = db.batch();
                batch.delete(refMiJugador(salaActual));
                if (esHostFlag) batch.delete(db.collection('salas').doc(salaActual));
                await batch.commit();
            }
        } catch (e) {
            console.warn('Al salir de la sala:', e.message);
        }
        window.FortunaJuego.guardarPerfil({ ultimaSala: null });
        salirDeSalaSilenciosa();
    }

    // ---------- API pública usada por motor_juego.js ----------
    function alCambiarSala(cb) {
        callbacksSala.push(cb);
        if (cacheSala) cb({ ...cacheSala });
    }

    function pintarClasificacion(cbRender) {
        callbackClasificacion = cbRender;
        if (cacheJugadores.length) cbRender([...cacheJugadores]);
    }

    function actualizarListos(elemento) {
        elementoListosUI = elemento || elementoListosUI;
        if (!elementoListosUI || !cacheSala) return;
        const listos = cacheJugadores.filter(j => confirmacionDe(j) >= cacheSala.rondaActual).length;
        elementoListosUI.hidden = false;
        elementoListosUI.textContent = `👥 Jugadores listos: ${listos}/${cacheJugadores.length}`;
    }

    // ---------- Reconexión: "Reanudar sala" ----------
    function ofrecerReconexion() {
        if (paginaActual() !== 'menu') return;
        const perfil = window.FortunaJuego.obtenerPerfil();
        if (!perfil.ultimaSala || !/^[A-Z0-9]{6}$/.test(perfil.ultimaSala)) return;

        const acciones = document.querySelector('.menu-actions');
        if (!acciones || document.getElementById('btn-reanudar')) return;

        const btn = document.createElement('button');
        btn.id = 'btn-reanudar';
        btn.type = 'button';
        btn.className = 'btn btn-reanudar';
        btn.textContent = `↩ REANUDAR SALA ${perfil.ultimaSala}`;

        btn.addEventListener('click', async () => {
            if (!(window.FortunaMulti && window.FortunaMulti.disponible())) {
                alert('🌐 Para reanudar la sala necesitas tener Firebase configurado.');
                return;
            }
            try {
                await inicializar();
                const ref = db.collection('salas').doc(perfil.ultimaSala);
                const snap = await ref.get();
                if (!snap.exists) {
                    alert('Esa sala ya no existe.');
                    window.FortunaJuego.guardarPerfil({ ultimaSala: null });
                    btn.remove();
                    return;
                }
                const estado = snap.data().estado;
                const codigo = perfil.ultimaSala;
                if (estado === 'esperando') {
                    await unirseASala(codigo, window.FortunaJuego.obtenerPerfil());
                } else if (estado === 'finalizada') {
                    await suscribirseASala(codigo);
                    navegar(`final_partida.html?sala=${codigo}`);
                } else {
                    await suscribirseASala(codigo);
                    navegar(`tablero_juego.html?sala=${codigo}`);
                }
            } catch (e) {
                alert('❌ No se pudo reconectar: ' + e.message);
            }
        });

        acciones.insertBefore(btn, acciones.firstChild);
    }

    // ---------- Arranque automático ----------
    (async function arranqueAutomatico() {
        if (!configurado()) return;
        try {
            await inicializar();
            const params = new URLSearchParams(window.location.search);
            const codigo = (params.get('sala') || '').toUpperCase().trim();
            if (/^[A-Z0-9]{6}$/.test(codigo)) {
                await suscribirseASala(codigo);
            } else if (paginaActual() === 'menu') {
                ofrecerReconexion();
            }
        } catch (e) {
            console.warn('Multijugador no disponible:', e.message);
        }
    })();

    return {
        disponible,
        crearSala,
        unirseASala,
        iniciarPartida,
        confirmarRonda,
        alCambiarSala,
        pintarClasificacion,
        obtenerCacheSala: () => cacheSala,
        obtenerMiJugador: () => miJugador,
        esperarSala,
        esperarTodo,
        navegarA: navegar,
        actualizarListosUI: actualizarListos,
        salirDeSala
    };
})();
