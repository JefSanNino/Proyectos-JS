// =====================================================
// FORTUNA FAMILIAR v3.0 — MOTOR DE JUEGO
// Archivo: motor_juego.js
// Descripción: Núcleo del juego.
//   - 4 activos reales (acciones, materias primas,
//     bienes raíces y bonos) con volatilidad propia.
//   - Inversión por montos de dinero (no barras).
//   - Pool de 60 noticias con efectos por activo.
//   - PRNG determinista (mulberry32) para que todas las
//     computadoras calculen idénticos resultados en línea.
//   - Perfil persistente: recuerda al usuario.
//   - Controladores de cada pantalla (menú, tablero,
//     resultados, final) detectados por body[data-pagina].
// =====================================================

'use strict';

// =====================================================
// 1. CONFIGURACIÓN GLOBAL
// =====================================================

const CAPITAL_INICIAL = 10000;
const TOTAL_RONDAS = 10;          // 10 años
const DURACION_TURNO_SEG = 30;    // temporizador por ronda

/** Activos reales disponibles para invertir */
const ASSETS = {
    acciones: {
        nombre: 'Acciones Tecnológicas',
        emoji: '💻',
        riesgo: 'Alto',
        claseRiesgo: 'alto',
        volatilidad: 0.07, // ±7% cuando la noticia no los afecta
        descripcion: 'Participaciones en empresas de tecnología. Máximo potencial de ganancia, máxima oscilación.'
    },
    materias: {
        nombre: 'Materias Primas',
        emoji: '🌾',
        riesgo: 'Medio-Alto',
        claseRiesgo: 'medio-alto',
        volatilidad: 0.05,
        descripcion: 'Oro, petróleo, trigo... Suben con crisis y guerras; caen con abundancia y paz.'
    },
    bienes: {
        nombre: 'Bienes Raíces',
        emoji: '🏠',
        riesgo: 'Medio-Bajo',
        claseRiesgo: 'medio-bajo',
        volatilidad: 0.03,
        descripcion: 'Propiedades y terrenos. Crecen lento pero resisten bien las tormentas.'
    },
    bonos: {
        nombre: 'Bonos del Estado',
        emoji: '🏦',
        riesgo: 'Bajo',
        claseRiesgo: 'bajo',
        volatilidad: 0.015,
        descripcion: 'Deuda soberana. El refugio clásico: rinden poco, pero brillan cuando todo lo demás cae.'
    }
};

const ORDEN_ASSETS = ['acciones', 'materias', 'bienes', 'bonos'];
const PRECIO_BASE = 100;

// =====================================================
// 2. BANCO DE NOTICIAS — 60 ÍTEMS PARA ALTA REJUGABILIDAD
// Cada noticia declara sus efectos por activo. Los activos
// no mencionados reciben variación neutral (su volatilidad).
// Regla realista: las malas noticias para el país suelen
// beneficiar a los bonos o a las materias primas (refugios).
// =====================================================
const poolNoticias = [
    // --- ACCIONES / TECNOLOGÍA (12) ---
    { titular: 'IA revolucionaria impulsa beneficios récord', efectos: { acciones: 1.15 }, descripcion: 'Los nuevos modelos de inteligencia artificial disparan la productividad de las tecnológicas.' },
    { titular: 'Ciberataque global contra gigantes tech', efectos: { acciones: 0.80 }, descripcion: 'Una brecha masiva de seguridad genera desconfianza y fuertes caídas en el sector.' },
    { titular: 'Chips cuánticos llegan al mercado comercial', efectos: { acciones: 1.18 }, descripcion: 'La computación cuántica abre negocios millonarios en banca y farmacéutica.' },
    { titular: 'Regulación antimonopolio golpea a big tech', efectos: { acciones: 0.85 }, descripcion: 'Los gobiernos fragmentan a los monopolios digitales y frenan su crecimiento.' },
    { titular: 'Boom de ventas de vehículos autónomos', efectos: { acciones: 1.10 }, descripcion: 'Los autos que se conducen solos baten récords de pedidos en todo el mundo.' },
    { titular: 'Caída histórica en la demanda de smartphones', efectos: { acciones: 0.88 }, descripcion: 'Los usuarios renuevan menos que nunca y las fábricas recortan producción.' },
    { titular: 'Fusión histórica entre dos gigantes del software', efectos: { acciones: 1.09 }, descripcion: 'El mercado celebra la sinergia y dispara las cotizaciones del sector.' },
    { titular: 'Escándalo contable hunde a startup unicornio', efectos: { acciones: 0.90 }, descripcion: 'Un fraude contable revelado enfría la confianza en toda la industria emergente.' },
    { titular: 'Robots industriales dominan las fábricas', efectos: { acciones: 1.12 }, descripcion: 'La automatización lleva la productividad del sector tech a niveles récord.' },
    { titular: 'Cables submarinos rotos interrumpen internet', efectos: { acciones: 0.83 }, descripcion: 'Una semana de servicio intermitente golpea la economía digital global.' },
    { titular: 'Resultados trimestrales récord en tecnología', efectos: { acciones: 1.08 }, descripcion: 'Las grandes compañías superan toda proyección de los analistas.' },
    { titular: 'Estalla burbuja de valoración en empresas de IA', efectos: { acciones: 0.86 }, descripcion: 'Inversionistas temen precios inflados y venden masivamente sus posiciones.' },

    // --- MATERIAS PRIMAS (12) ---
    { titular: 'Tensión geopolítica dispara el petróleo', efectos: { materias: 1.20 }, descripcion: 'El miedo al cierre de rutas marítimas encarece el barril por debajo de la oferta.' },
    { titular: 'Descubren mega-yacimiento de oro', efectos: { materias: 0.85 }, descripcion: 'Más oferta del metal dorado hunde su precio internacional.' },
    { titular: 'Sequía histórica arruina cosechas de trigo', efectos: { materias: 1.22 }, descripcion: 'La escasez de granos dispara los precios de los alimentos básicos.' },
    { titular: 'Supercosecha récord hunde precios agrícolas', efectos: { materias: 0.87 }, descripcion: 'Excedentes mundiales abaratan trigo, maíz y soya.' },
    { titular: 'La OPEP recorta producción de crudo', efectos: { materias: 1.14 }, descripcion: 'Menos barriles en el mercado elevan las cotizaciones energéticas.' },
    { titular: 'Minería limpia abarata los metales', efectos: { materias: 0.92 }, descripcion: 'Nueva tecnología reduce drásticamente los costos de extracción.' },
    { titular: 'Heladas históricas destruyen cafetales', efectos: { materias: 1.16 }, descripcion: 'El café alcanza precios récord ante la pérdida de cultivos.' },
    { titular: 'China frena su demanda industrial', efectos: { materias: 0.84 }, descripcion: 'El gigante asiático importa menos commodities y los mercados ceden.' },
    { titular: 'Huelga portuaria encarece las commodities', efectos: { materias: 1.10 }, descripcion: 'Puertos bloqueados elevan los costos de transporte de materias primas.' },
    { titular: 'Sustituto sintético reemplaza al cobre', efectos: { materias: 0.89 }, descripcion: 'Las industrias abandonan el metal rojo por un material más barato.' },
    { titular: 'Subsidios agrícolas disparan la producción', efectos: { materias: 0.94 }, descripcion: 'Cosechas abundantes presionan las cotizaciones agrícolas a la baja.' },
    { titular: 'Conflicto armado interrumpe exportación energética', efectos: { materias: 1.18 }, descripcion: 'El suministro mundial de energía se contrae y los precios se disparan.' },

    // --- BIENES RAÍCES (8) ---
    { titular: 'Subsidios para vivienda sostenible', efectos: { bienes: 1.14 }, descripcion: 'El gobierno incentiva edificios eficientes y valoriza el ladrillo.' },
    { titular: 'Revienta la burbuja inmobiliaria', efectos: { bienes: 0.82 }, descripcion: 'La sobreoferta de oficinas vacías hunde los precios de las propiedades.' },
    { titular: 'Tasas hipotecarias en mínimo histórico', efectos: { bienes: 1.12 }, descripcion: 'Crédito barato dispara las compras de vivienda en todo el país.' },
    { titular: 'Éxodo urbano: cae demanda de apartamentos', efectos: { bienes: 0.88 }, descripcion: 'Las familias abandonan las grandes ciudades y los precios urbanos ceden.' },
    { titular: 'Mega-proyecto nacional de infraestructura', efectos: { bienes: 1.10 }, descripcion: 'La nueva red de transporte valoriza todas las zonas conectadas.' },
    { titular: 'Escasez de cemento y acero paraliza obras', efectos: { bienes: 0.90 }, descripcion: 'Materiales a precio récord frenan la construcción de nuevas propiedades.' },
    { titular: 'Teletrabajo masivo impulsa casas suburbanas', efectos: { bienes: 1.08 }, descripcion: 'Trabajar desde casa hace explosiva la demanda de espacio fuera del centro.' },
    { titular: 'Impuesto a propiedades vacías enfría mercado', efectos: { bienes: 0.91 }, descripcion: 'Los especuladores venden sus inmuebles y presionan los precios a la baja.' },

    // --- BONOS / TASAS (8) ---
    { titular: 'Banco Central baja tasas de interés', efectos: { bonos: 1.08, acciones: 1.04 }, descripcion: 'Crédito barato: los bonos ya emitidos pagan más y valen más en el mercado.' },
    { titular: 'Alza agresiva de tasas antiinflacionaria', efectos: { bonos: 0.88, acciones: 0.92 }, descripcion: 'Los nuevos bonos pagan más y devalúan los antiguos; la bolsa también sufre.' },
    { titular: 'País recupera grado de inversión', efectos: { bonos: 1.10 }, descripcion: 'El flujo de capital extranjero hacia la deuda soberana se multiplica.' },
    { titular: 'Deuda pública bajo sospecha fiscal', efectos: { bonos: 0.80 }, descripcion: 'Dudas sobre el pago provocan una venta masiva de bonos del Estado.' },
    { titular: 'Estabilidad macroeconómica sin precedentes', efectos: { bonos: 1.05, bienes: 1.03 }, descripcion: 'Calma total: la deuda soberana y el ladrillo avanzan sin sobresaltos.' },
    { titular: 'Recesión técnica confirmada: refugio en deuda', efectos: { bonos: 1.06, acciones: 0.78, bienes: 0.90 }, descripcion: 'La economía se contrae, pero los inversionistas corren a protegerse en bonos.' },
    { titular: 'Calificación crediticia elevada a AAA', efectos: { bonos: 1.09 }, descripcion: 'La deuda nacional se vuelve oro puro para los fondos internacionales.' },
    { titular: 'Impago en economía emergente contagia', efectos: { bonos: 0.85 }, descripcion: 'El miedo al contagio golpea todos los mercados de deuda.' },

    // --- MACRO GLOBAL (20): mueven varios activos a la vez ---
    { titular: 'Pandemia global fuerza confinamientos', efectos: { acciones: 0.75, materias: 0.85, bienes: 0.88, bonos: 1.04 }, descripcion: 'El comercio se paraliza, pero los refugios seguros resisten e incluso suben.' },
    { titular: 'Vacuna universal disponible: euforia total', efectos: { acciones: 1.22, materias: 1.10, bienes: 1.12, bonos: 0.96 }, descripcion: 'El regreso a la normalidad lanza a la baja los refugios y dispara el riesgo.' },
    { titular: 'Colapso de banco regional siembra pánico', efectos: { acciones: 0.78, materias: 0.85, bienes: 0.82, bonos: 1.02 }, descripcion: 'El miedo al contagio financiero empuja el dinero hacia la deuda segura.' },
    { titular: 'Paz histórica entre potencias rivales', efectos: { acciones: 1.15, materias: 0.95, bienes: 1.08, bonos: 1.02 }, descripcion: 'Optimismo mundial: el petróleo pierde su prima de riesgo y la bolsa celebra.' },
    { titular: 'Guerra comercial entre superpotencias', efectos: { acciones: 0.82, materias: 0.88, bonos: 1.03 }, descripcion: 'Aranceles mutuos frenan el comercio global y castigan a las corporaciones.' },
    { titular: 'Inflación descontrolada erosiona ahorros', efectos: { acciones: 0.86, materias: 1.12, bienes: 0.90, bonos: 0.78 }, descripcion: 'Las materias primas se vuelven refugio de valor mientras los bonos se derriten.' },
    { titular: 'Tratado de libre comercio histórico firmado', efectos: { acciones: 1.10, materias: 1.08, bienes: 1.05, bonos: 1.01 }, descripcion: 'Aranceles cero entre potencias revitaliza industrias de punta a punta.' },
    { titular: 'Huelga mundial de transporte paraliza puertos', efectos: { acciones: 0.88, materias: 0.86, bienes: 0.94 }, descripcion: 'Las cadenas de suministro rotas detienen fábricas y constructoras.' },
    { titular: 'Avance decisivo en fusión nuclear', efectos: { acciones: 1.12, materias: 0.92 }, descripcion: 'Energía casi ilimitada abarata la industria y hunde el petróleo.' },
    { titular: 'Crisis energética europea encarece todo', efectos: { materias: 1.15, acciones: 0.90, bonos: 1.01 }, descripcion: 'Gas y petróleo por las nubes; la industria europea entra en jaque.' },
    { titular: 'Grandes bancos adoptan criptoactivos', efectos: { acciones: 1.07, materias: 1.05 }, descripcion: 'La legitimidad institucional inyecta euforia digital a todo el mercado.' },
    { titular: 'Prohibición de criptoactivos en grandes economías', efectos: { acciones: 0.93, materias: 0.95 }, descripcion: 'La huida de capitales digitales enfría el apetito por el riesgo.' },
    { titular: 'Boom turístico mundial pos-crisis', efectos: { acciones: 1.06, bienes: 1.09 }, descripcion: 'Viajes récord activan la hotelería, el comercio y la construcción.' },
    { titular: 'Huracán devastador castiga infraestructura', efectos: { bienes: 0.85, materias: 1.08, acciones: 0.90 }, descripcion: 'Reconstrucción millonaria: materiales caros, propiedades dañadas.' },
    { titular: 'Acuerdo climático vinculante global', efectos: { materias: 1.10, acciones: 1.05, bonos: 1.02 }, descripcion: 'Metales verdes y tecnología limpia entran en plena expansión.' },
    { titular: 'Escándalo de corrupción gubernamental', efectos: { acciones: 0.91, bonos: 0.93 }, descripcion: 'La incertidumbre política enfría la inversión local y extranjera.' },
    { titular: 'Reforma fiscal reduce impuestos a empresas', efectos: { acciones: 1.13 }, descripcion: 'Menos tributos significan beneficios corporativos más gordos.' },
    { titular: 'Drones autónomos revolucionan logística', efectos: { acciones: 1.08, materias: 1.04 }, descripcion: 'Entregas más baratas y rápidas benefician a toda la economía.' },
    { titular: 'Generación millennial hereda fortunas', efectos: { bienes: 1.08, acciones: 1.05 }, descripcion: 'La mayor transferencia de riqueza de la historia dispara la demanda de activos.' },
    { titular: 'Confianza del consumidor en máximo histórico', efectos: { acciones: 1.09, bienes: 1.05 }, descripcion: 'Gasto récord de las familias infla los beneficios corporativos.' }
];

// =====================================================
// 3. UTILIDADES
// =====================================================

/** Fisher-Yates: baraja un array sin mutar el original */
function barajar(array) {
    const m = [...array];
    for (let i = m.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
}

/** Formatea un número como moneda: $12,345.67 */
function formatMoney(n) {
    const num = parseFloat(n);
    if (isNaN(num)) return '$0.00';
    const abs = Math.abs(num).toFixed(2);
    const parts = abs.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (num < 0 ? '-$' : '$') + parts.join('.');
}

/** Hash simple y estable de un texto → uint32 (para semillas) */
function semillaDe(texto) {
    let h = 1779033703 ^ String(texto).length;
    for (let i = 0; i < String(texto).length; i++) {
        h = Math.imul(h ^ String(texto).charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
}

/** PRNG determinista mulberry32: mismo seed ⇒ misma secuencia */
function mulberry32(semilla) {
    let a = semilla >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Variación neutral de mercado según la volatilidad del activo */
function variacionNeutra(volatilidad, rng) {
    const azar = rng ? rng() : Math.random();
    return 1 + (azar * 2 - 1) * volatilidad;
}

/**
 * Sanitiza texto ingresado por el usuario:
 * elimina caracteres peligrosos y limita longitud (anti-XSS).
 */
function sanitizarTexto(texto, maxLen = 20) {
    return String(texto ?? '')
        .replace(/[<>&"'`\\\/]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLen);
}

/** Código de sala legible: 6 caracteres sin ambiguos */
const ALFABETO_SALA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generarCodigoSala() {
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += ALFABETO_SALA[Math.floor(Math.random() * ALFABETO_SALA.length)];
    }
    return codigo;
}

// =====================================================
// 4. PERFIL PERSISTENTE (recordar al usuario)
// =====================================================
const CLAVE_PERFIL = 'perfilFortuna';

function obtenerPerfil() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_PERFIL)) || {};
    } catch (e) {
        return {};
    }
}

function guardarPerfil(parche) {
    const perfil = { ...obtenerPerfil(), ...parche };
    localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
    return perfil;
}

// =====================================================
// 5. ESTADO DE PARTIDA INDIVIDUAL (localStorage)
// En multijugador el estado vive en Firebase; aquí solo se
// usa para el modo solo.
// =====================================================
const CLAVE_PARTIDA = 'estadoPartida';

function nuevaPartidaSolo() {
    const estado = {
        modo: 'solo',
        semilla: Math.floor(Math.random() * 2147483647),
        capitalActual: CAPITAL_INICIAL,
        añoActual: 0,
        noticias: barajar(poolNoticias).slice(0, TOTAL_RONDAS),
        historial: [],
        resultadoUltima: null
    };
    localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(estado));
    return estado;
}

function obtenerEstadoPartida() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_PARTIDA));
    } catch (e) {
        return null;
    }
}

function guardarEstadoPartida(estado) {
    localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(estado));
}

function limpiarEstadoPartida() {
    localStorage.removeItem(CLAVE_PARTIDA);
}

/**
 * Efectos deterministas de una ronda: para cada activo devuelve
 * el modificador aplicado (noticia si lo afecta, ruido neutral
 * si no). Con la misma semilla base TODAS las computadoras
 * obtienen exactamente los mismos números (clave del online).
 */
function efectosDeRonda(semillaBase, indiceRonda, noticia) {
    const rng = mulberry32(semillaDe(`${semillaBase}#${indiceRonda}`));
    const efectos = {};
    ORDEN_ASSETS.forEach(clave => {
        if (noticia.efectos && noticia.efectos[clave] !== undefined) {
            efectos[clave] = noticia.efectos[clave];
        } else {
            efectos[clave] = variacionNeutra(ASSETS[clave].volatilidad, rng);
        }
    });
    return efectos;
}

/**
 * Calcula el cierre de una ronda con montos por activo.
 * @param {Object} noticia  Noticia de la ronda
 * @param {Object} efectos  Modificadores por activo (efectosDeRonda)
 * @param {Object} montos   Dinero asignado: { acciones: 500, ... }
 * @param {Number} capitalAnterior
 */
function calcularRonda(noticia, efectos, montos, capitalAnterior) {
    const desglose = {};
    let totalInvertido = 0;
    let retornoTotal = 0;

    ORDEN_ASSETS.forEach(clave => {
        const monto = Math.max(0, parseFloat(montos?.[clave]) || 0);
        const efecto = efectos[clave];
        const rendimiento = monto * efecto;
        desglose[clave] = {
            clave,
            nombre: ASSETS[clave].nombre,
            emoji: ASSETS[clave].emoji,
            monto,
            efecto,
            rendimiento,
            neto: rendimiento - monto,
            afectado: noticia.efectos && noticia.efectos[clave] !== undefined
        };
        totalInvertido += monto;
        retornoTotal += rendimiento;
    });

    const efectivo = Math.max(0, capitalAnterior - totalInvertido);
    const nuevoCapital = retornoTotal + efectivo;

    return {
        titular: noticia.titular,
        descripcion: noticia.descripcion,
        desglose,
        totalInvertido,
        efectivo,
        nuevoCapital,
        netoTotal: nuevoCapital - capitalAnterior
    };
}

/**
 * Serie de precios de cada activo desde el inicio hasta una
 * ronda dada (determinista). Sirve para mostrar precio y tendencia.
 */
function evolucionPrecios(noticias, semillaBase, hastaIndice) {
    const precios = {};
    ORDEN_ASSETS.forEach(c => { precios[c] = PRECIO_BASE; });
    const serie = [{ ...precios }];
    for (let r = 0; r <= hastaIndice && r < noticias.length; r++) {
        const efectos = efectosDeRonda(semillaBase, r, noticias[r]);
        ORDEN_ASSETS.forEach(c => { precios[c] *= efectos[c]; });
        serie.push({ ...precios });
    }
    return serie;
}

// =====================================================
// 6. CONTROLADORES DE INTERFAZ (por pantalla)
// Cada página declara <body data-pagina="menu|tablero|...">
// — esto sustituye la detección frágil por IDs de v2.0.
// =====================================================

// ---- 6.1 MENÚ PRINCIPAL ----
function inicializarMenuPrincipal() {
    console.log('▶ Fortuna v3.0 — Menú Principal');

    const inputNombre = document.getElementById('player-name');
    const avatarItems = document.querySelectorAll('.avatar-item');
    const btnSolo = document.getElementById('btn-jugar-solo');
    const btnCrearSala = document.getElementById('btn-crear-sala');
    const btnUnirse = document.getElementById('btn-unirse');
    const inputCodigo = document.getElementById('input-codigo-sala');
    const btnComoJugar = document.getElementById('btn-como-jugar');
    const modalComoJugar = document.getElementById('modal-como-jugar');
    const chipPerfil = document.getElementById('chip-perfil');

    // --- Recordar al usuario: restaurar perfil ---
    const perfil = obtenerPerfil();
    if (inputNombre && perfil.nombreUsuario) {
        inputNombre.value = perfil.nombreUsuario;
    }
    if (perfil.avatarPerfil) {
        avatarItems.forEach(a => {
            a.classList.toggle('active', a.dataset.perfil === perfil.avatarPerfil);
        });
    }
    if (chipPerfil && perfil.nombreUsuario) {
        chipPerfil.hidden = false;
        chipPerfil.querySelector('.chip-nombre').textContent = `Continuando como ${perfil.nombreUsuario}`;
    }

    // --- Selección de avatar (guarda en el perfil) ---
    avatarItems.forEach(item => {
        item.addEventListener('click', () => {
            avatarItems.forEach(a => a.classList.remove('active'));
            item.classList.add('active');
            guardarPerfil({ avatarPerfil: item.dataset.perfil, avatarEmoji: item.dataset.id });
        });
    });

    function perfilActual() {
        const nombre = sanitizarTexto(inputNombre ? inputNombre.value : '', 20) || 'Jugador';
        const activo = document.querySelector('.avatar-item.active') || avatarItems[0];
        return {
            nombreUsuario: nombre,
            avatarPerfil: activo ? activo.dataset.perfil : 'Empresario',
            avatarEmoji: activo ? (activo.dataset.id || '🧔') : '🧔'
        };
    }

    // --- Jugar individual ---
    if (btnSolo) {
        btnSolo.addEventListener('click', () => {
            const p = perfilActual();
            guardarPerfil(p);
            nuevaPartidaSolo();
            window.location.href = 'tablero_juego.html';
        });
    }

    // --- Multijugador (delegado en multijugador.js) ---
    if (btnCrearSala) {
        btnCrearSala.addEventListener('click', () => {
            const p = perfilActual();
            guardarPerfil(p);
            if (window.FortunaMulti && window.FortunaMulti.disponible()) {
                window.FortunaMulti.crearSala(p);
            } else {
                mostrarAvisoFirebase();
            }
        });
    }

    function intentarUnirse() {
        const p = perfilActual();
        guardarPerfil(p);
        const codigo = (inputCodigo.value || '').toUpperCase().trim();
        if (!/^[A-Z0-9]{6}$/.test(codigo)) {
            alert('🔑 Escribe un código de sala válido (6 letras/números).');
            inputCodigo.focus();
            return;
        }
        if (window.FortunaMulti && window.FortunaMulti.disponible()) {
            window.FortunaMulti.unirseASala(codigo, p);
        } else {
            mostrarAvisoFirebase();
        }
    }

    if (btnUnirse && inputCodigo) {
        btnUnirse.addEventListener('click', intentarUnirse);
        inputCodigo.addEventListener('keydown', e => {
            if (e.key === 'Enter') intentarUnirse();
        });
        // Link compartido ?sala=CODIGO → precargar y auto-enfocar
        const params = new URLSearchParams(window.location.search);
        const salaParam = (params.get('sala') || '').toUpperCase().trim();
        if (/^[A-Z0-9]{6}$/.test(salaParam)) {
            inputCodigo.value = salaParam;
            setTimeout(() => inputCodigo.focus(), 300);
        }
    }

    // --- Modal Cómo Jugar ---
    if (btnComoJugar && modalComoJugar) {
        btnComoJugar.addEventListener('click', () => {
            modalComoJugar.classList.add('abierto');
        });
        modalComoJugar.querySelectorAll('[data-cerrar-modal]').forEach(btn => {
            btn.addEventListener('click', () => modalComoJugar.classList.remove('abierto'));
        });
        modalComoJugar.addEventListener('click', e => {
            if (e.target === modalComoJugar) modalComoJugar.classList.remove('abierto');
        });
    }

    /** Aviso cuando Firebase aún no está configurado */
    function mostrarAvisoFirebase() {
        alert(
            '🌐 MODO EN LÍNEA SIN CONFIGURAR\n\n' +
            'Para jugar en línea necesitas conectar Firebase (gratis):\n\n' +
            '1. Crea un proyecto en console.firebase.google.com\n' +
            '2. Activa Firestore y Autenticación anónima\n' +
            '3. Copia tu configuración en js/config_firebase.js\n\n' +
            'Guía completa en el README del proyecto.\n' +
            'Mientras tanto puedes jugar en modo individual.'
        );
    }
}

// ---- 6.2 TABLERO DE JUEGO ----
async function inicializarTablero() {
    console.log('▶ Fortuna v3.0 — Tablero');

    const params = new URLSearchParams(window.location.search);
    const codigoSala = (params.get('sala') || '').toUpperCase();
    const esOnline = !!codigoSala && !!(window.FortunaMulti && window.FortunaMulti.disponible());

    // Referencias de UI
    const balanceEl = document.getElementById('balance');
    const yearEl = document.getElementById('year-display');
    const newsEl = document.getElementById('news-text');
    const miniAvatar = document.getElementById('mini-avatar-emoji');
    const gridEl = document.getElementById('assets-grid');
    const totalAsignadoEl = document.getElementById('total-asignado');
    const efectivoEl = document.getElementById('efectivo-restante');
    const progressFill = document.getElementById('progress-fill');
    const barraProgreso = document.getElementById('barra-progreso');
    const btnConfirmar = document.getElementById('btn-invertir');
    const statusMp = document.getElementById('mp-status');

    // ---------- Obtener contexto de partida ----------
    let contexto = null; // {noticias, indiceRonda, capital, semillaBase}

    if (esOnline) {
        // Espera AMBAS instantáneas (sala + mi jugador) para evitar carreras
        // al navegar y no renderizar nunca un capital equivocado.
        const datos = await window.FortunaMulti.esperarTodo();
        if (!datos || datos.sala.estado !== 'jugando') {
            window.location.href = 'menu_principal.html';
            return;
        }
        contexto = {
            online: true,
            codigo: codigoSala,
            noticias: datos.sala.noticias,
            indiceRonda: datos.sala.rondaActual,
            capital: datos.mi.capital ?? CAPITAL_INICIAL,
            semillaBase: codigoSala
        };
    } else {
        const estado = obtenerEstadoPartida();
        if (!estado || estado.modo !== 'solo') {
            window.location.href = 'menu_principal.html';
            return;
        }
        contexto = {
            online: false,
            noticias: estado.noticias,
            indiceRonda: estado.añoActual,
            capital: estado.capitalActual,
            semillaBase: estado.semilla
        };
    }

    const noticia = contexto.noticias[contexto.indiceRonda];
    const perfil = obtenerPerfil();

    // ---------- Encabezado ----------
    if (balanceEl) balanceEl.textContent = formatMoney(contexto.capital);
    if (yearEl) yearEl.textContent = `Año ${contexto.indiceRonda + 1}/${TOTAL_RONDAS}`;
    if (newsEl) newsEl.textContent = `"${noticia.titular}"`;
    if (miniAvatar) {
        miniAvatar.textContent = perfil.avatarEmoji || '🧔';
        miniAvatar.style.display = 'flex';
        miniAvatar.style.alignItems = 'center';
        miniAvatar.style.justifyContent = 'center';
        miniAvatar.style.fontSize = '1.5rem';
    }
    if (statusMp) statusMp.hidden = !contexto.online;

    // ---------- Tarjetas de activos con montos ----------
    const seriePrecios = evolucionPrecios(contexto.noticias, contexto.semillaBase, contexto.indiceRonda);
    const preciosActuales = seriePrecios[seriePrecios.length - 1];
    const preciosAnteriores = seriePrecios[Math.max(0, seriePrecios.length - 2)];

    const inputs = {};

    function crearTarjetaActivo(clave) {
        const a = ASSETS[clave];
        const precio = preciosActuales[clave];
        const previo = preciosAnteriores[clave];
        const tendencia = precio >= previo ? 'up' : 'down';
        const flecha = precio >= previo ? '▲' : '▼';

        const card = document.createElement('div');
        card.className = `asset-card card-glass riesgo-${a.claseRiesgo}`;
        card.dataset.asset = clave;

        const icono = document.createElement('div');
        icono.className = 'asset-icon';
        icono.textContent = a.emoji;

        const titulo = document.createElement('h4');
        titulo.textContent = a.nombre;

        const badge = document.createElement('span');
        badge.className = `riesgo-badge riesgo-${a.claseRiesgo}`;
        badge.textContent = `Riesgo ${a.riesgo}`;

        const precioLinea = document.createElement('p');
        precioLinea.className = 'precio-linea';
        precioLinea.textContent = `${formatMoney(precio)} `;
        const trendSpan = document.createElement('span');
        trendSpan.className = `trend ${tendencia}`;
        trendSpan.textContent = `${flecha}${((precio / previo - 1) * 100).toFixed(1)}%`;
        precioLinea.appendChild(trendSpan);

        const wrap = document.createElement('div');
        wrap.className = 'monto-wrap';
        const signo = document.createElement('span');
        signo.className = 'moneda-signo';
        signo.textContent = '$';
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'monto-input';
        input.id = `monto-${clave}`;
        input.min = '0';
        input.step = '50';
        input.placeholder = '0';
        input.inputMode = 'numeric';
        input.setAttribute('aria-label', `Monto a invertir en ${a.nombre}`);
        wrap.appendChild(signo);
        wrap.appendChild(input);

        const quick = document.createElement('div');
        quick.className = 'quick-btns';
        [['+$100', 'sumar', 100], ['+$500', 'sumar', 500], ['MAX', 'max', 0], ['✕', 'limpiar', 0]].forEach(([texto, modo, cant]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'quick-btn';
            b.textContent = texto;
            b.addEventListener('click', () => aplicarQuick(clave, modo, cant));
            quick.appendChild(b);
        });

        card.appendChild(icono);
        card.appendChild(titulo);
        card.appendChild(badge);
        card.appendChild(precioLinea);
        card.appendChild(wrap);
        card.appendChild(quick);

        input.addEventListener('input', actualizarResumen);
        inputs[clave] = input;
        return card;
    }

    if (gridEl) {
        ORDEN_ASSETS.forEach(clave => gridEl.appendChild(crearTarjetaActivo(clave)));
    }

    function leerMontos() {
        const montos = {};
        ORDEN_ASSETS.forEach(clave => {
            montos[clave] = Math.max(0, Math.floor(parseFloat(inputs[clave]?.value) || 0));
        });
        return montos;
    }

    function totalAsignado() {
        return Object.values(leerMontos()).reduce((a, b) => a + b, 0);
    }

    function aplicarQuick(clave, modo, cant) {
        const input = inputs[clave];
        if (!input) return;
        let valor = Math.max(0, parseInt(input.value) || 0);
        const otros = totalAsignado() - valor;
        const disponible = Math.max(0, contexto.capital - otros);

        if (modo === 'sumar') valor += cant;
        else if (modo === 'max') valor = disponible;
        else valor = 0;

        input.value = Math.min(valor, disponible);
        actualizarResumen();
    }

    function actualizarResumen() {
        const total = totalAsignado();
        const excede = total > contexto.capital;
        if (totalAsignadoEl) {
            totalAsignadoEl.textContent = formatMoney(total);
            totalAsignadoEl.classList.toggle('over-limit', excede);
        }
        if (efectivoEl) {
            efectivoEl.textContent = formatMoney(Math.max(0, contexto.capital - total));
            efectivoEl.classList.toggle('over-limit', excede);
        }
        if (progressFill && barraProgreso) {
            const pct = Math.min(100, (total / contexto.capital) * 100);
            progressFill.style.width = pct + '%';
            progressFill.classList.toggle('over-limit', excede);
            progressFill.classList.toggle('full', !excede && total === contexto.capital);
            barraProgreso.classList.toggle('over-limit', excede);
        }
        if (btnConfirmar) btnConfirmar.disabled = excede || total <= 0;
    }

    // ---------- Confirmación ----------
    let confirmado = false;

    async function confirmarEstrategia(auto) {
        if (confirmado) return;
        const montos = leerMontos();
        const total = Object.values(montos).reduce((a, b) => a + b, 0);

        if (!auto) {
            if (total > contexto.capital) {
                alert('⚠️ Has asignado más dinero del que tienes.');
                return;
            }
            if (total === 0) {
                alert('⚠️ Debes invertir al menos en un activo (o espera al temporizador para quedarte en efectivo).');
                return;
            }
        }

        confirmado = true;
        const efectos = efectosDeRonda(contexto.semillaBase, contexto.indiceRonda, noticia);
        const resultado = calcularRonda(noticia, efectos, montos, contexto.capital);

        try {
            if (contexto.online) {
                await window.FortunaMulti.confirmarRonda({
                    ronda: contexto.indiceRonda,
                    montos,
                    resultado,
                    capitalAnterior: contexto.capital
                });
                window.FortunaMulti.navegarA(`resultados_ronda.html?sala=${contexto.codigo}`);
            } else {
                const estado = obtenerEstadoPartida();
                estado.resultadoUltima = { ...resultado, año: estado.añoActual };
                estado.historial.push({
                    año: estado.añoActual + 1,
                    capitalAnterior: contexto.capital,
                    capitalDespues: resultado.nuevoCapital,
                    neto: resultado.netoTotal,
                    titular: noticia.titular,
                    montos: { ...montos }
                });
                estado.capitalActual = resultado.nuevoCapital;
                guardarEstadoPartida(estado);
                window.location.href = 'resultados_ronda.html';
            }
        } catch (err) {
            confirmado = false;
            console.error(err);
            alert('❌ No se pudo confirmar la ronda: ' + err.message);
        }
    }

    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => confirmarEstrategia(false));
    }

    // ---------- Temporizador ----------
    iniciarTemporizador(DURACION_TURNO_SEG, restante => {
        const timerEl = document.getElementById('timer-seconds');
        if (timerEl) {
            timerEl.textContent = restante > 0 ? `${restante}s` : '⏰';
            timerEl.classList.toggle('urgent', restante <= 10);
        }
    }, () => confirmarEstrategia(true));

    actualizarResumen();

    // ---------- Estado visible de jugadores listos (online) ----------
    if (contexto.online) {
        window.FortunaMulti.alCambiarSala(snap => {
            if (!snap) return;
            if (snap.estado === 'finalizada') {
                window.FortunaMulti.navegarA(`final_partida.html?sala=${contexto.codigo}`);
            } else if (snap.rondaActual > contexto.indiceRonda) {
                // Otro jugador avanzó la ronda antes de que confirmaras:
                // te quedaste atrás, vuelve al tablero con la ronda nueva.
                window.FortunaMulti.navegarA(`tablero_juego.html?sala=${contexto.codigo}`);
            }
        });
        window.FortunaMulti.actualizarListosUI(statusMp);
    }
}

/** Temporizador regresivo genérico */
function iniciarTemporizador(segundos, onTick, onFin) {
    const timerEl = document.getElementById('timer-seconds');
    if (!timerEl) { if (onFin) onFin(); return; }

    let restante = segundos;
    onTick(restante);

    const intervalo = setInterval(() => {
        restante--;
        onTick(restante);
        if (restante <= 0) {
            clearInterval(intervalo);
            if (onFin) onFin();
        }
    }, 1000);
}

// ---- 6.3 RESULTADOS DE RONDA ----
async function inicializarResultados() {
    console.log('▶ Fortuna v3.0 — Resultados');

    const params = new URLSearchParams(window.location.search);
    const codigoSala = (params.get('sala') || '').toUpperCase();
    const esOnline = !!codigoSala && !!(window.FortunaMulti && window.FortunaMulti.disponible());

    const roundTitle = document.getElementById('round-title');
    const titularEl = document.getElementById('titular-noticia');
    const explicacionEl = document.getElementById('explicacion-noticia');
    const capitalAntEl = document.getElementById('capital-anterior');
    const capitalNuevoEl = document.getElementById('capital-actual');
    const netoEl = document.getElementById('valor-resultado-neto');
    const breakdownEl = document.getElementById('sector-breakdown');
    const clasificacionSeccion = document.getElementById('clasificacion-seccion');
    const clasificacionLista = document.getElementById('clasificacion-lista');
    const esperaOverlay = document.getElementById('espera-overlay');
    const esperaTexto = document.getElementById('espera-texto');
    const btnNext = document.getElementById('btn-next');

    function pintarResultado(res) {
        if (roundTitle) roundTitle.textContent = `CIERRE DE AÑO ${(res.año ?? 0) + 1}`;
        if (titularEl) titularEl.textContent = res.titular || '';
        if (explicacionEl) explicacionEl.textContent = res.descripcion || '';
        if (capitalAntEl) capitalAntEl.textContent = formatMoney(res.capitalAnterior);
        if (capitalNuevoEl) capitalNuevoEl.textContent = formatMoney(res.nuevoCapital);
        if (netoEl) {
            netoEl.textContent = (res.netoTotal >= 0 ? '+' : '') + formatMoney(res.netoTotal);
            netoEl.className = res.netoTotal >= 0 ? 'resultado--positivo' : 'resultado--negativo';
        }

        // Desglose por activo construido con DOM seguro (sin innerHTML)
        if (breakdownEl) {
            breakdownEl.textContent = '';
            let hayFilas = false;
            Object.values(res.desglose || {}).forEach(d => {
                if (!(d.monto > 0)) return;
                hayFilas = true;

                const fila = document.createElement('div');
                fila.className = 'sector-row';

                const nombre = document.createElement('span');
                nombre.className = 'sector-name';
                nombre.textContent = `${d.emoji} ${d.nombre}: ${formatMoney(d.monto)} ${d.afectado ? '⚡' : '~'} (${((d.efecto - 1) * 100 >= 0 ? '+' : '')}${((d.efecto - 1) * 100).toFixed(1)}%)`;

                const resultado = document.createElement('span');
                resultado.className = `sector-result ${d.neto >= 0 ? 'positive' : 'negative'}`;
                resultado.textContent = (d.neto >= 0 ? '+' : '') + formatMoney(d.neto);

                fila.appendChild(nombre);
                fila.appendChild(resultado);
                breakdownEl.appendChild(fila);
            });
            breakdownEl.hidden = !hayFilas;
        }
    }

    if (esOnline) {
        // ----- MODO EN LÍNEA -----
        if (btnNext) btnNext.hidden = true;
        if (clasificacionSeccion) clasificacionSeccion.hidden = false;
        if (esperaOverlay) esperaOverlay.hidden = false;

        await window.FortunaMulti.esperarTodo();
        const miSnap = window.FortunaMulti.obtenerMiJugador();
        const salaSnap = window.FortunaMulti.obtenerCacheSala();
        if (!miSnap || !salaSnap) {
            window.location.href = 'menu_principal.html';
            return;
        }

        const noticia = (salaSnap.noticias || [])[miSnap.rondaConfirmada];
        pintarResultado({
            año: miSnap.rondaConfirmada,
            titular: noticia ? noticia.titular : '',
            descripcion: noticia ? noticia.descripcion : '',
            capitalAnterior: miSnap.capitalAnteriorUltima,
            nuevoCapital: miSnap.capital,
            netoTotal: miSnap.netoUltima,
            desglose: reconstruirDesglose(miSnap.desgloseUltima)
        });

        // Clasificación en vivo
        const pintarClasificacion = jugadores => {
            if (!clasificacionLista) return;
            clasificacionLista.textContent = '';
            [...jugadores]
                .sort((a, b) => b.capital - a.capital)
                .forEach((j, i) => {
                    const fila = document.createElement('div');
                    fila.className = 'clasi-fila' + (j.uid === miSnap.uid ? ' yo' : '');
                    const pos = document.createElement('span');
                    pos.className = 'clasi-pos';
                    pos.textContent = `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} ${j.nombre}`;
                    const cap = document.createElement('span');
                    cap.className = 'clasi-capital';
                    cap.textContent = formatMoney(j.capital);
                    fila.appendChild(pos);
                    fila.appendChild(cap);
                    clasificacionLista.appendChild(fila);
                });
            const listos = jugadores.filter(j => j.rondaConfirmada >= salaSnap.rondaActual).length;
            if (esperaTexto) esperaTexto.textContent = `⏳ Esperando jugadores… (${listos}/${jugadores.length} listos)`;
        };

        window.FortunaMulti.pintarClasificacion(pintarClasificacion);

        // Avance de ronda / finalización.
        // La comparación es contra la ronda que YO completé (rondaConfirmada),
        // no contra la instantánea con la que cargó esta página: si llegué
        // tarde y la sala ya avanzó, igual debo saltar al tablero nuevo.
        window.FortunaMulti.alCambiarSala(sala => {
            if (!sala) return;
            if (sala.estado === 'finalizada') {
                window.FortunaMulti.navegarA(`final_partida.html?sala=${codigoSala}`);
            } else if (sala.rondaActual > miSnap.rondaConfirmada) {
                window.FortunaMulti.navegarA(`tablero_juego.html?sala=${codigoSala}`);
            }
        });
    } else {
        // ----- MODO SOLO -----
        const estado = obtenerEstadoPartida();
        if (!estado || !estado.resultadoUltima) {
            window.location.href = 'menu_principal.html';
            return;
        }
        pintarResultado({ ...estado.resultadoUltima, desglose: reconstruirDesglose(estado.resultadoUltima.desglose) });

        if (btnNext) {
            btnNext.textContent = estado.añoActual >= TOTAL_RONDAS - 1
                ? '🏆 VER RESULTADOS FINALES'
                : `CONTINUAR → AÑO ${estado.añoActual + 2}`;
            btnNext.addEventListener('click', irAlSiguienteAño);
        }
    }

    /** Convierte el desglose guardado (objeto plano) en estructura utilizable */
    function reconstruirDesglose(guardado) {
        const out = {};
        Object.entries(guardado || {}).forEach(([clave, d]) => { out[clave] = d; });
        return out;
    }
}

/** Avanza al siguiente año (modo solo) o termina la partida */
function irAlSiguienteAño() {
    const estado = obtenerEstadoPartida();
    if (!estado) {
        window.location.href = 'menu_principal.html';
        return;
    }
    if (estado.añoActual < TOTAL_RONDAS - 1) {
        estado.añoActual++;
        guardarEstadoPartida(estado);
        window.location.href = 'tablero_juego.html';
    } else {
        window.location.href = 'final_partida.html';
    }
}

// ---- 6.4 PANTALLA FINAL ----
async function inicializarFinal() {
    console.log('▶ Fortuna v3.0 — Final');

    const params = new URLSearchParams(window.location.search);
    const codigoSala = (params.get('sala') || '').toUpperCase();
    const esOnline = !!codigoSala && !!(window.FortunaMulti && window.FortunaMulti.disponible());

    const statCapIni = document.getElementById('stat-capital-inicial');
    const statCapFin = document.getElementById('stat-capital-final');
    const statRend = document.getElementById('stat-rendimiento');
    const statMejor = document.getElementById('stat-mejor-ronda');
    const perfilIcono = document.getElementById('perfil-icono');
    const perfilTitulo = document.getElementById('perfil-titulo');
    const perfilDesc = document.getElementById('perfil-descripcion');
    const endSubtitle = document.querySelector('.end-subtitle');
    const podioSeccion = document.getElementById('podio-seccion');
    const podioLista = document.getElementById('podio-lista');
    const btnNueva = document.getElementById('btn-nueva-partida');

    let historial = [];
    let capitalFinal = CAPITAL_INICIAL;
    let nombre = 'Jugador';

    if (esOnline) {
        await window.FortunaMulti.esperarSala();
        const miSnap = window.FortunaMulti.obtenerMiJugador();
        capitalFinal = miSnap ? miSnap.capital : CAPITAL_INICIAL;
        nombre = miSnap ? miSnap.nombre : nombre;
        historial = []; // el detalle por rondas no se persiste completo en línea
        if (podioSeccion && podioLista) {
            podioSeccion.hidden = false;
            window.FortunaMulti.pintarClasificacion(jugadores => {
                podioLista.textContent = '';
                [...jugadores]
                    .sort((a, b) => b.capital - a.capital)
                    .forEach((j, i) => {
                        const fila = document.createElement('div');
                        fila.className = 'podium-item rank-' + Math.min(i + 1, 3);
                        const badge = document.createElement('div');
                        badge.className = `rank-badge ${['gold', 'silver', 'bronze'][i] || 'plain'}`;
                        badge.textContent = i + 1;
                        const detalles = document.createElement('div');
                        detalles.className = 'player-details';
                        const nom = document.createElement('p');
                        nom.className = 'player-name';
                        nom.textContent = `${j.avatarEmoji || ''} ${j.nombre}`.trim();
                        const riqueza = document.createElement('p');
                        riqueza.className = 'final-wealth ' + (j.capital >= CAPITAL_INICIAL ? 'profit' : 'loss');
                        riqueza.textContent = formatMoney(j.capital);
                        detalles.appendChild(nom);
                        detalles.appendChild(riqueza);
                        if (i === 0) {
                            const copa = document.createElement('div');
                            copa.className = 'trophy-icon';
                            copa.textContent = '🏆';
                            fila.appendChild(copa);
                        }
                        fila.appendChild(badge);
                        fila.appendChild(detalles);
                        podioLista.appendChild(fila);
                    });
            });
        }
    } else {
        const estado = obtenerEstadoPartida();
        if (!estado) {
            window.location.href = 'menu_principal.html';
            return;
        }
        historial = estado.historial || [];
        capitalFinal = estado.capitalActual;
        nombre = obtenerPerfil().nombreUsuario || 'Jugador';
        limpiarEstadoPartida(); // fin del modo solo: liberar datos
    }

    // ----- Estadísticas -----
    const rendimientoTotal = ((capitalFinal - CAPITAL_INICIAL) / CAPITAL_INICIAL) * 100;

    if (statCapIni) statCapIni.textContent = formatMoney(CAPITAL_INICIAL);
    if (endSubtitle) endSubtitle.textContent = `${obtenerPerfil().avatarEmoji || ''} ${nombre} — Resultados después de ${TOTAL_RONDAS} años`.trim();

    if (statCapFin) {
        statCapFin.textContent = formatMoney(capitalFinal);
        statCapFin.className = 'stat-value ' + (capitalFinal >= CAPITAL_INICIAL ? 'profit' : 'loss');
    }

    if (statRend) {
        statRend.textContent = `${rendimientoTotal >= 0 ? '+' : ''}${rendimientoTotal.toFixed(1)}%`;
        statRend.className = 'stat-value ' + (rendimientoTotal >= 0 ? 'profit' : 'loss');
    }

    if (statMejor) {
        if (historial.length > 0) {
            const mejor = historial.reduce((best, r) => (r.neto > best.neto ? r : best), historial[0]);
            statMejor.textContent = `Año ${mejor.año} (${mejor.neto >= 0 ? '+' : ''}${formatMoney(mejor.neto)})`;
            statMejor.className = 'stat-value ' + (mejor.neto >= 0 ? 'profit' : 'loss');
        } else {
            statMejor.closest('.stat-card').hidden = true;
        }
    }

    // ----- Perfil de inversor -----
    const perfilInv = generarPerfilInversor(historial, capitalFinal);
    if (perfilIcono) perfilIcono.textContent = perfilInv.icono;
    if (perfilTitulo) perfilTitulo.textContent = perfilInv.titulo;
    if (perfilDesc) perfilDesc.textContent = perfilInv.desc;

    // ----- Nueva partida -----
    if (btnNueva) {
        btnNueva.addEventListener('click', () => {
            if (esOnline && window.FortunaMulti) {
                window.FortunaMulti.salirDeSala();
            }
            window.location.href = 'menu_principal.html';
        });
    }
}

/** Clasifica el estilo de inversión del jugador */
function generarPerfilInversor(historial, capitalFinal) {
    const rendimiento = ((capitalFinal - CAPITAL_INICIAL) / CAPITAL_INICIAL) * 100;

    // Promedio de exposición por activo (% del capital por ronda)
    const exposicion = {};
    ORDEN_ASSETS.forEach(c => { exposicion[c] = 0; });
    let rondasConcentradas = 0;
    let rondasDiversificadas = 0;

    if (historial.length > 0) {
        historial.forEach(ronda => {
            let suma = 0;
            ORDEN_ASSETS.forEach(c => { suma += ronda.montos?.[c] || 0; });
            let activosUsados = 0;
            let maxPct = 0;
            ORDEN_ASSETS.forEach(c => {
                const pct = suma > 0 ? ((ronda.montos?.[c] || 0) / suma) * 100 : 0;
                exposicion[c] += pct;
                if (pct > 0) activosUsados++;
                maxPct = Math.max(maxPct, pct);
            });
            if (maxPct >= 70) rondasConcentradas++;
            if (activosUsados >= 3) rondasDiversificadas++;
        });
        ORDEN_ASSETS.forEach(c => { exposicion[c] /= historial.length; });
    }

    const favorito = ORDEN_ASSETS.reduce((a, b) => (exposicion[b] > exposicion[a] ? b : a), 'acciones');

    if (rendimiento >= 100) return { icono: '🐂', titulo: 'El Toro de Wall Street', desc: `¡Duplicaste tu capital (+${rendimiento.toFixed(0)})! Tu audacia te llevó a la cima del mercado.` };
    if (rendimiento >= 50) return { icono: '🦅', titulo: 'Águila del Mercado', desc: `Vuelo alto con +${rendimiento.toFixed(0)}%. Detectaste oportunidades donde nadie más miraba.` };
    if (rondasConcentradas >= 6) return { icono: '🎰', titulo: 'El Apostador Intrépido', desc: rondasConcentradas >= 6 && rendimiento >= 0 ? 'Viviste al límite concentrando todo en un activo… ¡y el riesgo te premió!' : 'Viviste al límite concentrando todo en un activo, y esta vez el riesgo cobró factura.' };
    if (rondasDiversificadas >= 7) return { icono: '🛡️', titulo: 'Guardián del Tesoro', desc: 'Tu estrategia diversificada amortiguó las caídas. Prudencia de inversor veterano.' };
    if (favorito === 'bonos' && exposicion.bonos >= 50) return { icono: '🏦', titulo: 'Inversor Conservador', desc: 'Prefirió dormir tranquilo: dominaron los bonos. Rendimiento modesto pero sereno.' };
    if (favorito === 'materias' && exposicion.materias >= 40) return { icono: '🌾', titulo: 'Barón de las Materias Primas', desc: 'Leíste ciclos de escasez y abundancia como un trader experimentado.' };
    if (favorito === 'acciones' && exposicion.acciones >= 40) return { icono: '💻', titulo: 'Visionario Tech', desc: 'Confiaste en la innovación. La bolsa tecnológica definió tu destino.' };
    if (favorito === 'bienes' && exposicion.bienes >= 40) return { icono: '🏠', titulo: 'Magnate Inmobiliario', desc: 'Construiste tu imperio sobre el ladrillo: paciencia y solidez.' };
    if (rendimiento >= 0) return { icono: '📊', titulo: 'Estratega Equilibrado', desc: `Balance saludable entre riesgo y seguridad (+${rendimiento.toFixed(0)}%).` };
    if (rendimiento >= -20) return { icono: '🌧️', titulo: 'Sobreviviente del Mercado', desc: `Perdiste ${Math.abs(rendimiento).toFixed(0)}%, pero saliste con lecciones que valen oro.` };
    return { icono: '💸', titulo: 'Aprendiz de Finanzas', desc: `El mercado fue implacable (-${Math.abs(rendimiento).toFixed(0)}%), pero cada pérdida enseña. ¡Otra ronda!` };
}

// =====================================================
// 7. EVENTO PRINCIPAL — DETECCIÓN POR data-pagina
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎲 Fortuna Familiar v3.0 cargado');

    switch (document.body.getAttribute('data-pagina')) {
        case 'menu': inicializarMenuPrincipal(); break;
        case 'tablero': inicializarTablero(); break;
        case 'resultados': inicializarResultados(); break;
        case 'final': inicializarFinal(); break;
    }
});

// Exponer utilidades para multijugador.js
window.FortunaJuego = {
    ASSETS, ORDEN_ASSETS, poolNoticias,
    CAPITAL_INICIAL, TOTAL_RONDAS, DURACION_TURNO_SEG,
    PRECIO_BASE, ALFABETO_SALA,
    barajar, formatMoney, semillaDe, mulberry32,
    variacionNeutra, efectosDeRonda, calcularRonda, evolucionPrecios,
    sanitizarTexto, generarCodigoSala,
    obtenerPerfil, guardarPerfil
};
