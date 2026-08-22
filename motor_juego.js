// =====================================================
// FORTUNA FAMILIAR v2.0 — MOTOR DE JUEGO
// Archivo: motor_juego.js
// Descripción: Orquestador principal del juego.
//   Gestiona persistencia (localStorage), lógica de
//   inversión multi-sector, y controladores de cada
//   pantalla (menú, tablero, resultados, final).
// =====================================================

// --- 1. BANCO DE NOTICIAS (30 ÍTEMS PARA ALTA REJUGABILIDAD) ---
// Cada noticia tiene: titular, sector afectado, modificador de
// rendimiento, y descripción explicativa para el jugador.
// Los sectores del juego son: Tecnología, Alimentos, Energía,
// Propiedades. Las noticias "Global", "Finanzas" y "Salud"
// afectan a TODOS los sectores simultáneamente.
const poolNoticias = [
    // --- TECNOLOGÍA ---
    { titular: "IA revolucionaria en la nube", sector: "Tecnología", modificador: 1.15, descripcion: "Nuevos chips de procesamiento disparan la eficiencia de las empresas tecnológicas." },
    { titular: "Ciberataque global", sector: "Tecnología", modificador: 0.80, descripcion: "Una brecha de seguridad masiva genera desconfianza y caídas en las acciones de software." },
    { titular: "Lanzamiento de Red 6G", sector: "Tecnología", modificador: 1.12, descripcion: "La velocidad de conexión permite nuevos modelos de negocio en streaming y juegos." },
    { titular: "Turismo espacial comercial", sector: "Tecnología", modificador: 1.20, descripcion: "El primer vuelo con civiles abre una nueva frontera económica." },
    { titular: "Dron de reparto masivo", sector: "Tecnología", modificador: 1.07, descripcion: "Logística automatizada reduce los tiempos de entrega en un 60%." },
    { titular: "Ley de teletrabajo obligatorio", sector: "Tecnología", modificador: 1.13, descripcion: "Ahorro masivo en oficinas impulsa las utilidades de empresas digitales." },

    // --- CONSTRUCCIÓN / PROPIEDADES ---
    { titular: "Subsidios para vivienda verde", sector: "Propiedades", modificador: 1.18, descripcion: "El gobierno anuncia incentivos para edificios con paneles solares y eficiencia térmica." },
    { titular: "Escasez de materiales", sector: "Propiedades", modificador: 0.85, descripcion: "El precio del acero y el cemento sube un 40%, paralizando nuevas obras." },
    { titular: "Mega-proyecto de infraestructura", sector: "Propiedades", modificador: 1.14, descripcion: "Se aprueba la construcción de una nueva red de transporte nacional." },
    { titular: "Burbuja en el sector inmobiliario", sector: "Propiedades", modificador: 0.78, descripcion: "La sobreoferta de oficinas vacías provoca una caída en los fondos inmobiliarios." },

    // --- ENERGÍA ---
    { titular: "Descubrimiento de yacimiento", sector: "Energía", modificador: 1.10, descripcion: "Nuevas reservas aseguran energía barata para los próximos 5 años." },
    { titular: "Tensión geopolítica en el Golfo", sector: "Energía", modificador: 0.75, descripcion: "El cierre de rutas marítimas dispara el costo del combustible global." },
    { titular: "Boom de energía eólica", sector: "Energía", modificador: 1.08, descripcion: "Los parques eólicos superan en producción a las plantas de carbón por primera vez." },
    { titular: "Revolución de baterías sólidas", sector: "Energía", modificador: 1.16, descripcion: "Nuevas baterías cargan en minutos, impulsando la industria eléctrica." },
    { titular: "Avance en fusión nuclear", sector: "Energía", modificador: 1.30, descripcion: "Hito científico promete energía limpia e infinita para el futuro." },

    // --- SALUD (afecta a TODOS) ---
    { titular: "Tratamiento contra el Alzheimer", sector: "Salud", modificador: 1.25, descripcion: "Una farmacéutica logra resultados históricos en sus ensayos clínicos. Todo el mercado reacciona positivamente." },
    { titular: "Recortes en salud pública", sector: "Salud", modificador: 0.90, descripcion: "La reducción de presupuesto afecta la confianza del mercado general." },
    { titular: "Pandemia de gripe aviar", sector: "Salud", modificador: 0.81, descripcion: "Nuevas cuarentenas limitan el comercio y los mercados caen en bloque." },

    // --- FINANZAS (afecta a TODOS) ---
    { titular: "Baja en las tasas de interés", sector: "Finanzas", modificador: 1.12, descripcion: "El Banco Central facilita el crédito, incentivando la inversión en todos los sectores." },
    { titular: "Inflación descontrolada", sector: "Finanzas", modificador: 0.82, descripcion: "El aumento de precios reduce el poder adquisitivo y golpea todos los mercados." },
    { titular: "Adopción masiva de criptoactivos", sector: "Finanzas", modificador: 1.09, descripcion: "Grandes bancos empiezan a aceptar activos digitales, inyectando confianza al mercado." },
    { titular: "Impuesto a las super-riquezas", sector: "Finanzas", modificador: 0.94, descripcion: "La salida de capitales por nuevos impuestos genera volatilidad en todos los activos." },
    { titular: "Colapso de banco regional", sector: "Finanzas", modificador: 0.72, descripcion: "El miedo al contagio financiero provoca retiros masivos en todos los sectores." },

    // --- ALIMENTOS ---
    { titular: "Supercosecha de granos", sector: "Alimentos", modificador: 1.07, descripcion: "Clima perfecto genera excedentes, bajando los costos de producción de alimentos." },
    { titular: "Sequía extrema en el sur", sector: "Alimentos", modificador: 0.88, descripcion: "La falta de agua destruye cultivos, encareciendo la canasta básica." },
    { titular: "Escasez de agua potable", sector: "Alimentos", modificador: 0.83, descripcion: "Costos de desalinización encarecen el procesamiento de bebidas." },

    // --- GLOBAL (afecta a TODOS) ---
    { titular: "Huelga de transporte global", sector: "Global", modificador: 0.84, descripcion: "Puertos bloqueados detienen el comercio internacional. Todos los sectores sufren." },
    { titular: "Tratado de libre comercio", sector: "Global", modificador: 1.11, descripcion: "Se eliminan aranceles entre potencias, beneficiando a todos los mercados." },
    { titular: "Sanciones comerciales severas", sector: "Global", modificador: 0.89, descripcion: "Restricciones a la exportación frenan la industria en todos los frentes." },
    { titular: "Paz en conflicto histórico", sector: "Global", modificador: 1.19, descripcion: "El fin de la guerra abre nuevos mercados y genera optimismo global." }
];

// Mapeo de qué sectores de inversión se ven afectados por cada sector de noticia
const SECTOR_MAPPING = {
    "Tecnología":   { tech: true, food: false, energy: false, re: false },
    "Propiedades":  { tech: false, food: false, energy: false, re: true },
    "Energía":      { tech: false, food: false, energy: true, re: false },
    "Alimentos":    { tech: false, food: true, energy: false, re: false },
    // Sectores que afectan a TODOS
    "Salud":        { tech: true, food: true, energy: true, re: true },
    "Finanzas":     { tech: true, food: true, energy: true, re: true },
    "Global":       { tech: true, food: true, energy: true, re: true }
};

// Nombres legibles de cada sector
const SECTOR_NOMBRES = {
    tech: "Tecnología",
    food: "Alimentos",
    energy: "Energía",
    re: "Propiedades"
};

const SECTOR_EMOJIS = {
    tech: "💻",
    food: "🍎",
    energy: "🚀",
    re: "🏠"
};

// =====================================================
// 2. UTILIDADES
// =====================================================

/** Algoritmo Fisher-Yates para barajar un array sin mutar el original */
function barajar(array) {
    const m = [...array];
    for (let i = m.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
}

/** Formatea un número a moneda con 2 decimales */
function formatMoney(n) {
    const num = parseFloat(n);
    if (isNaN(num)) return "$0.00";
    const abs = Math.abs(num).toFixed(2);
    // Agregar separador de miles
    const parts = abs.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (num < 0 ? "-$" : "$") + parts.join(".");
}

/** Genera variación aleatoria leve para sectores no afectados */
function variacionNeutra() {
    // Retorna un modificador entre 0.97 y 1.03
    return 0.97 + Math.random() * 0.06;
}

// =====================================================
// 3. PERSISTENCIA DE NOTICIAS
// =====================================================

/**
 * Obtiene las 10 noticias de la partida actual.
 * Si ya existen en localStorage, las reutiliza.
 * Si no, baraja el pool y selecciona 10 nuevas.
 */
function obtenerNoticiasDePartida() {
    const guardadas = localStorage.getItem('noticiasPartida');
    if (guardadas) {
        try {
            return JSON.parse(guardadas);
        } catch (e) {
            console.warn("Error al parsear noticias guardadas, generando nuevas.");
        }
    }
    const nuevas = barajar(poolNoticias).slice(0, 10);
    localStorage.setItem('noticiasPartida', JSON.stringify(nuevas));
    return nuevas;
}

// =====================================================
// 4. LÓGICA DE INVERSIÓN MULTI-SECTOR
// =====================================================

/**
 * Procesa la inversión de una ronda con distribución por sectores.
 * @param {Object} asignaciones - Porcentajes: { tech: 30, food: 20, energy: 40, re: 10 }
 * @returns {Object} Resultado detallado con desglose por sector
 */
function procesarInversionMultiSector(asignaciones) {
    const año = parseInt(localStorage.getItem('añoActual')) || 0;
    const noticias = obtenerNoticiasDePartida();
    const noticia = noticias[año];
    const capitalAnterior = parseFloat(localStorage.getItem('capitalActual'));

    const afectados = SECTOR_MAPPING[noticia.sector] || {};
    const desglose = {};
    let nuevoCapital = 0;

    // Calcular rendimiento por cada sector de inversión
    const sectores = ['tech', 'food', 'energy', 're'];
    sectores.forEach(s => {
        const pct = asignaciones[s] || 0;
        const montoInvertido = capitalAnterior * (pct / 100);

        // Si el sector está afectado por la noticia, usa el modificador.
        // Si no, usa variación neutra (±3%)
        const mod = afectados[s] ? noticia.modificador : variacionNeutra();
        const rendimiento = montoInvertido * mod;
        const neto = rendimiento - montoInvertido;

        desglose[s] = {
            nombre: SECTOR_NOMBRES[s],
            emoji: SECTOR_EMOJIS[s],
            porcentaje: pct,
            invertido: montoInvertido,
            rendimiento: rendimiento,
            neto: neto,
            modificador: mod,
            afectado: !!afectados[s]
        };

        nuevoCapital += rendimiento;
    });

    // Capital no invertido se mantiene
    const totalInvertidoPct = sectores.reduce((sum, s) => sum + (asignaciones[s] || 0), 0);
    const capitalNoInvertido = capitalAnterior * ((100 - totalInvertidoPct) / 100);
    nuevoCapital += capitalNoInvertido;

    const netoTotal = nuevoCapital - capitalAnterior;

    // Guardar datos para la pantalla de resultados
    localStorage.setItem('capitalAnterior', capitalAnterior.toFixed(2));
    localStorage.setItem('capitalActual', nuevoCapital.toFixed(2));
    localStorage.setItem('resultadoNeto', netoTotal.toFixed(2));
    localStorage.setItem('noticiaTitular', noticia.titular);
    localStorage.setItem('noticiaDescripcion', noticia.descripcion);
    localStorage.setItem('noticiaSector', noticia.sector);
    localStorage.setItem('desgloseRonda', JSON.stringify(desglose));

    // Guardar en historial de rondas
    const historial = JSON.parse(localStorage.getItem('historialRondas') || '[]');
    historial.push({
        año: año + 1,
        capitalAnterior: capitalAnterior,
        capitalDespues: nuevoCapital,
        neto: netoTotal,
        noticia: noticia.titular,
        sector: noticia.sector,
        asignaciones: { ...asignaciones },
        desglose: desglose
    });
    localStorage.setItem('historialRondas', JSON.stringify(historial));

    return { nuevoCapital, netoTotal, desglose };
}

// =====================================================
// 5. CONTROLADORES DE INTERFAZ (por página)
// =====================================================

// ---- 5.1 MENÚ PRINCIPAL ----
function inicializarMenuPrincipal() {
    console.log("▶ Modo: Menú Principal");

    const avatarItems = document.querySelectorAll('.avatar-item');
    const inputNombre = document.getElementById('player-name');
    const btnCrearSala = document.getElementById('btn-crear-sala');

    // Selección de Avatar
    avatarItems.forEach(item => {
        item.addEventListener('click', () => {
            avatarItems.forEach(a => a.classList.remove('active'));
            item.classList.add('active');

            const perfil = item.getAttribute('data-perfil');
            const avatarId = item.getAttribute('data-id');
            localStorage.setItem('avatarPerfil', perfil);
            localStorage.setItem('avatarEmoji', avatarId);
            console.log("Avatar seleccionado:", perfil, avatarId);
        });
    });

    // Botón Crear Sala / Iniciar Partida
    if (btnCrearSala) {
        btnCrearSala.addEventListener('click', () => {
            const nombre = inputNombre ? inputNombre.value.trim() : '';
            const nombreFinal = nombre || 'Jugador';

            // Guardar perfil
            localStorage.setItem('nombreUsuario', nombreFinal);

            // Si no se seleccionó avatar, usar el primero por defecto
            if (!localStorage.getItem('avatarEmoji')) {
                localStorage.setItem('avatarPerfil', 'Papá');
                localStorage.setItem('avatarEmoji', '🧔');
            }

            // Inicializar estado de partida
            localStorage.setItem('capitalActual', '10000');
            localStorage.setItem('añoActual', '0');
            localStorage.removeItem('noticiasPartida'); // Forzar nuevas noticias
            localStorage.removeItem('historialRondas');

            // Pre-generar noticias barajadas
            obtenerNoticiasDePartida();

            console.log("🎮 Partida iniciada para:", nombreFinal);
            window.location.href = 'tablero_juego.html';
        });
    }
}

// ---- 5.2 TABLERO DE JUEGO ----
function inicializarTablero() {
    console.log("▶ Modo: Tablero de Juego");

    const año = parseInt(localStorage.getItem('añoActual')) || 0;
    const capital = parseFloat(localStorage.getItem('capitalActual')) || 10000;
    const noticias = obtenerNoticiasDePartida();
    const noticia = noticias[año];

    // --- Mostrar datos dinámicos ---
    const balanceEl = document.getElementById('balance');
    const yearEl = document.getElementById('year-display');
    const newsEl = document.getElementById('news-text');
    const miniAvatar = document.getElementById('mini-avatar-emoji');

    if (balanceEl) balanceEl.innerText = formatMoney(capital);
    if (yearEl) yearEl.innerText = `Año ${año + 1}/10`;
    if (newsEl) newsEl.innerText = `"${noticia.titular}"`;
    if (miniAvatar) {
        const emoji = localStorage.getItem('avatarEmoji') || '🧔';
        miniAvatar.innerText = emoji;
        miniAvatar.style.display = 'flex';
        miniAvatar.style.alignItems = 'center';
        miniAvatar.style.justifyContent = 'center';
        miniAvatar.style.fontSize = '1.4rem';
    }

    // --- Sistema de Sliders ---
    const sliders = {
        tech: document.getElementById('slider-tech'),
        food: document.getElementById('slider-food'),
        energy: document.getElementById('slider-energy'),
        re: document.getElementById('slider-re')
    };

    const pctDisplays = {
        tech: document.getElementById('tech-pct'),
        food: document.getElementById('food-pct'),
        energy: document.getElementById('energy-pct'),
        re: document.getElementById('re-pct')
    };

    const totalEl = document.getElementById('total-allocation');
    const progressFill = document.getElementById('progress-fill');
    const btnInvertir = document.getElementById('btn-invertir');

    function getTotal() {
        let total = 0;
        Object.values(sliders).forEach(s => {
            if (s) total += parseInt(s.value) || 0;
        });
        return total;
    }

    function actualizarUI() {
        const total = getTotal();

        // Actualizar porcentajes individuales
        Object.keys(sliders).forEach(key => {
            if (sliders[key] && pctDisplays[key]) {
                pctDisplays[key].innerText = sliders[key].value + '%';
            }
        });

        // Actualizar total y barra de progreso
        if (totalEl) {
            totalEl.innerText = total + '%';
            totalEl.className = 'total-pct';
            if (total > 100) totalEl.classList.add('over-limit');
            else if (total === 100) totalEl.classList.add('full');
        }

        if (progressFill) {
            progressFill.style.width = Math.min(total, 100) + '%';
            progressFill.className = 'progress-fill';
            if (total > 100) progressFill.classList.add('over-limit');
            else if (total === 100) progressFill.classList.add('full');
        }

        // Habilitar/deshabilitar botón
        if (btnInvertir) {
            btnInvertir.disabled = (total > 100 || total === 0);
        }
    }

    // Event listeners para sliders
    Object.values(sliders).forEach(slider => {
        if (slider) {
            slider.addEventListener('input', actualizarUI);
        }
    });

    // Estado inicial
    actualizarUI();

    // --- Botón Confirmar Estrategia ---
    if (btnInvertir) {
        btnInvertir.addEventListener('click', () => {
            const total = getTotal();
            if (total > 100) {
                alert('⚠️ Has asignado más del 100% de tu capital. Ajusta tus inversiones.');
                return;
            }
            if (total === 0) {
                alert('⚠️ Debes invertir al menos en un sector para continuar.');
                return;
            }

            const asignaciones = {
                tech: parseInt(sliders.tech?.value) || 0,
                food: parseInt(sliders.food?.value) || 0,
                energy: parseInt(sliders.energy?.value) || 0,
                re: parseInt(sliders.re?.value) || 0
            };

            procesarInversionMultiSector(asignaciones);
            window.location.href = 'resultados_ronda.html';
        });
    }

    // --- Temporizador de 30 segundos ---
    iniciarTemporizador(30, btnInvertir, sliders);
}

/** Temporizador regresivo con auto-submit */
function iniciarTemporizador(segundos, btnInvertir, sliders) {
    const timerEl = document.getElementById('timer-seconds');
    if (!timerEl) return;

    let restante = segundos;
    timerEl.innerText = restante + 's';

    const intervalo = setInterval(() => {
        restante--;
        timerEl.innerText = restante + 's';

        // Modo urgencia cuando quedan 10 segundos
        if (restante <= 10) {
            timerEl.classList.add('urgent');
        }

        if (restante <= 0) {
            clearInterval(intervalo);
            timerEl.innerText = '⏰';

            // Auto-submit con las asignaciones actuales
            const total = Object.values(sliders).reduce((sum, s) => sum + (parseInt(s?.value) || 0), 0);

            if (total > 0 && total <= 100) {
                const asignaciones = {
                    tech: parseInt(sliders.tech?.value) || 0,
                    food: parseInt(sliders.food?.value) || 0,
                    energy: parseInt(sliders.energy?.value) || 0,
                    re: parseInt(sliders.re?.value) || 0
                };
                procesarInversionMultiSector(asignaciones);
                window.location.href = 'resultados_ronda.html';
            } else {
                // Si no invirtió nada, asignar 25% a cada sector automáticamente
                const autoAsignaciones = { tech: 25, food: 25, energy: 25, re: 25 };
                procesarInversionMultiSector(autoAsignaciones);
                window.location.href = 'resultados_ronda.html';
            }
        }
    }, 1000);
}

// ---- 5.3 PANTALLA DE RESULTADOS ----
function inicializarResultados() {
    console.log("▶ Modo: Pantalla de Resultados");

    const año = parseInt(localStorage.getItem('añoActual')) || 0;
    const neto = parseFloat(localStorage.getItem('resultadoNeto')) || 0;

    // --- Título de la ronda ---
    const roundTitle = document.getElementById('round-title');
    if (roundTitle) roundTitle.innerText = `CIERRE DE AÑO ${año + 1}`;

    // --- Noticia ---
    const titularEl = document.getElementById('titular-noticia');
    const explicacionEl = document.getElementById('explicacion-noticia');
    if (titularEl) titularEl.innerText = localStorage.getItem('noticiaTitular') || '';
    if (explicacionEl) explicacionEl.innerText = localStorage.getItem('noticiaDescripcion') || '';

    // --- Balance financiero ---
    const capitalAntEl = document.getElementById('capital-anterior');
    const capitalActEl = document.getElementById('capital-actual');
    const netoEl = document.getElementById('valor-resultado-neto');
    const nombreEl = document.getElementById('nombre-jugador-display');

    if (capitalAntEl) capitalAntEl.innerText = formatMoney(localStorage.getItem('capitalAnterior'));
    if (capitalActEl) capitalActEl.innerText = formatMoney(localStorage.getItem('capitalActual'));

    if (netoEl) {
        netoEl.innerText = neto >= 0
            ? `+${formatMoney(neto)}`
            : formatMoney(neto);
        netoEl.className = neto >= 0 ? 'resultado--positivo' : 'resultado--negativo';
    }

    if (nombreEl) {
        nombreEl.innerText = localStorage.getItem('nombreUsuario') || 'Jugador';
    }

    // --- Desglose por sector ---
    const sectorBreakdown = document.getElementById('sector-breakdown');
    if (sectorBreakdown) {
        const desglose = JSON.parse(localStorage.getItem('desgloseRonda') || '{}');
        let html = '';

        Object.keys(desglose).forEach(key => {
            const s = desglose[key];
            if (s.porcentaje > 0) {
                const claseResultado = s.neto >= 0 ? 'positive' : 'negative';
                const signo = s.neto >= 0 ? '+' : '';
                const indicador = s.afectado ? '⚡' : '~';
                html += `
                    <div class="sector-row">
                        <span class="sector-name">${s.emoji} ${s.nombre} (${s.porcentaje}%) ${indicador}</span>
                        <span class="sector-result ${claseResultado}">${signo}${formatMoney(s.neto)}</span>
                    </div>`;
            }
        });

        if (html) {
            sectorBreakdown.innerHTML = html;
        }
    }

    // --- Botón Continuar (actualizar texto según la ronda) ---
    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
        btnNext.innerText = año >= 9 ? '🏆 VER RESULTADOS FINALES' : `CONTINUAR → AÑO ${año + 2}`;
    }
}

// ---- 5.4 PANTALLA FINAL ----
function inicializarFinal() {
    console.log("▶ Modo: Pantalla Final");

    const historial = JSON.parse(localStorage.getItem('historialRondas') || '[]');
    const capitalInicial = 10000;
    const capitalFinal = parseFloat(localStorage.getItem('capitalActual')) || capitalInicial;
    const rendimientoTotal = ((capitalFinal - capitalInicial) / capitalInicial * 100);
    const nombre = localStorage.getItem('nombreUsuario') || 'Jugador';
    const emoji = localStorage.getItem('avatarEmoji') || '🧔';

    // --- Estadísticas ---
    const statCapIni = document.getElementById('stat-capital-inicial');
    const statCapFin = document.getElementById('stat-capital-final');
    const statRend = document.getElementById('stat-rendimiento');
    const statMejor = document.getElementById('stat-mejor-ronda');

    if (statCapIni) statCapIni.innerText = formatMoney(capitalInicial);

    if (statCapFin) {
        statCapFin.innerText = formatMoney(capitalFinal);
        statCapFin.className = 'stat-value ' + (capitalFinal >= capitalInicial ? 'profit' : 'loss');
    }

    if (statRend) {
        const signo = rendimientoTotal >= 0 ? '+' : '';
        statRend.innerText = `${signo}${rendimientoTotal.toFixed(1)}%`;
        statRend.className = 'stat-value ' + (rendimientoTotal >= 0 ? 'profit' : 'loss');
    }

    if (statMejor && historial.length > 0) {
        const mejor = historial.reduce((best, r) => r.neto > best.neto ? r : best, historial[0]);
        statMejor.innerText = `Año ${mejor.año} (${mejor.neto >= 0 ? '+' : ''}${formatMoney(mejor.neto)})`;
        statMejor.className = 'stat-value ' + (mejor.neto >= 0 ? 'profit' : 'loss');
    }

    // --- Perfil de Inversor ---
    generarPerfilInversor(historial, capitalFinal, capitalInicial);

    // --- Título con nombre ---
    const endTitle = document.querySelector('.end-title');
    if (endTitle) {
        endTitle.innerHTML = `¡PARTIDA<br><span>FINALIZADA!</span>`;
    }

    const endSubtitle = document.querySelector('.end-subtitle');
    if (endSubtitle) {
        endSubtitle.innerText = `${emoji} ${nombre} — Resultados después de 10 años`;
    }

    // --- Botón Nueva Partida ---
    const btnNueva = document.getElementById('btn-nueva-partida');
    if (btnNueva) {
        btnNueva.addEventListener('click', () => {
            // Limpiar datos de la partida
            ['capitalActual', 'capitalAnterior', 'resultadoNeto', 'añoActual',
             'noticiasPartida', 'historialRondas', 'noticiaTitular',
             'noticiaDescripcion', 'noticiaSector', 'desgloseRonda'].forEach(k => {
                localStorage.removeItem(k);
            });
            window.location.href = 'menu_principal.html';
        });
    }
}

/** Genera un perfil de inversor basado en el comportamiento del jugador */
function generarPerfilInversor(historial, capitalFinal, capitalInicial) {
    const perfilIcono = document.getElementById('perfil-icono');
    const perfilTitulo = document.getElementById('perfil-titulo');
    const perfilDesc = document.getElementById('perfil-descripcion');

    if (!perfilTitulo || !perfilDesc) return;

    // Analizar patrones de inversión
    const totalesSector = { tech: 0, food: 0, energy: 0, re: 0 };
    let rondasConAltoRiesgo = 0; // Rondas donde un solo sector tiene >60%
    let rondasDiversificadas = 0; // Rondas donde al menos 3 sectores tienen >10%

    historial.forEach(ronda => {
        const asig = ronda.asignaciones || {};
        Object.keys(totalesSector).forEach(s => {
            totalesSector[s] += (asig[s] || 0);
        });

        const valores = Object.values(asig).filter(v => v > 0);
        const maxInversion = Math.max(...Object.values(asig));

        if (maxInversion >= 60) rondasConAltoRiesgo++;
        if (valores.filter(v => v >= 10).length >= 3) rondasDiversificadas++;
    });

    // Determinar sector favorito
    const sectorFav = Object.entries(totalesSector).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    const rendimiento = ((capitalFinal - capitalInicial) / capitalInicial * 100);

    // Seleccionar perfil
    let perfil;

    if (rendimiento >= 100) {
        perfil = { icono: '🐺', titulo: 'Lobo de Wall Street', desc: `¡Increíble! Duplicaste tu capital con un rendimiento de ${rendimiento.toFixed(0)}%. Tu audacia te llevó a la cima.` };
    } else if (rendimiento >= 50) {
        perfil = { icono: '🦅', titulo: 'El Águila Financiera', desc: `Excelente visión estratégica. Un ${rendimiento.toFixed(0)}% de rendimiento demuestra tu ojo para las oportunidades.` };
    } else if (rondasConAltoRiesgo >= 6) {
        perfil = { icono: '🎰', titulo: 'El Apostador Intrépido', desc: `Viviste al límite apostando fuerte en un solo sector. ${rendimiento >= 0 ? '¡Y te funcionó!' : 'Pero el riesgo cobró factura.'}` };
    } else if (rondasDiversificadas >= 7) {
        perfil = { icono: '🛡️', titulo: 'El Guardián del Tesoro', desc: `Tu estrategia diversificada te protegió de las caídas. Un inversor prudente y calculador.` };
    } else if (sectorFav[0] === 'tech' && totalesSector.tech > 400) {
        perfil = { icono: '🤖', titulo: 'Visionario Digital', desc: `Apostaste fuerte por la tecnología (${SECTOR_NOMBRES.tech}). ${rendimiento >= 0 ? 'La innovación te recompensó.' : 'Pero el mercado tech fue volátil.'}` };
    } else if (sectorFav[0] === 'energy' && totalesSector.energy > 400) {
        perfil = { icono: '⚡', titulo: 'Magnate Energético', desc: `Tu pasión por el sector energético definió tu estrategia. ${rendimiento >= 0 ? '¡Energía renovable = ganancias!' : 'Las tensiones geopolíticas te afectaron.'}` };
    } else if (rendimiento >= 0) {
        perfil = { icono: '📊', titulo: 'Estratega Equilibrado', desc: `Mantuviste un balance saludable entre riesgo y seguridad. Tu capital creció un ${rendimiento.toFixed(0)}%.` };
    } else if (rendimiento >= -20) {
        perfil = { icono: '🌧️', titulo: 'Sobreviviente del Mercado', desc: `Enfrentaste un mercado difícil y aunque perdiste un ${Math.abs(rendimiento).toFixed(0)}%, aprendiste lecciones valiosas.` };
    } else {
        perfil = { icono: '💸', titulo: 'Aprendiz de las Finanzas', desc: `El mercado fue implacable. Perdiste un ${Math.abs(rendimiento).toFixed(0)}% pero cada pérdida es una lección. ¡Intenta de nuevo!` };
    }

    if (perfilIcono) perfilIcono.innerText = perfil.icono;
    perfilTitulo.innerText = perfil.titulo;
    perfilDesc.innerText = perfil.desc;
}

// =====================================================
// 6. NAVEGACIÓN ENTRE RONDAS
// =====================================================

/** Avanza al siguiente año o termina la partida */
function irAlSiguienteAño() {
    let año = parseInt(localStorage.getItem('añoActual')) || 0;
    if (año < 9) {
        localStorage.setItem('añoActual', año + 1);
        window.location.href = 'tablero_juego.html';
    } else {
        window.location.href = 'final_partida.html';
    }
}

// =====================================================
// 7. EVENTO PRINCIPAL — DETECCIÓN DE PÁGINA
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🎲 Fortuna Familiar v2.0 cargado");

    // Detectar en qué página estamos y ejecutar el controlador apropiado
    if (document.getElementById('menu-principal')) {
        inicializarMenuPrincipal();
    } else if (document.getElementById('tablero-juego')) {
        inicializarTablero();
    } else if (document.getElementById('valor-resultado-neto')) {
        inicializarResultados();
    } else if (document.getElementById('stat-capital-final')) {
        inicializarFinal();
    }
});