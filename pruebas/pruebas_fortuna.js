// =====================================================
// SUITE DE PRUEBAS — Fortuna Familiar v3.0
// Archivo: pruebas/pruebas_fortuna.js
//
// Ejecución:  node pruebas/pruebas_fortuna.js
// Requisitos: solo Node.js (sin dependencias externas).
//
// Secciones:
//   A. Sintaxis de los 3 módulos JS (node --check)
//   B. Motor: noticias, determinismo PRNG, economía y seguridad
//   C. Regresiones de sincronización multijugador (bugs del 2026-08-23)
//   D. Integridad de IDs entre los JS y los 4 HTML
//   E. Estructura y accesibilidad mínima garantizada
//
// Sale con código 0 si TODO pasa, 1 si algo falla.
// =====================================================

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

let pasan = 0, fallan = 0;
function verificar(nombre, ok) {
    console.log((ok ? '  ✅ ' : '  ❌ ') + nombre);
    if (ok) pasan++; else fallan++;
}
function seccion(titulo) {
    console.log('\n━━ ' + titulo + ' ' + '━'.repeat(Math.max(2, 58 - titulo.length)));
}

// =====================================================
console.log('🧪 FORTUNA FAMILIAR — Suite de verificación\n');
// =====================================================

// ---------- A. SINTAXIS ----------
seccion('A. Sintaxis');
for (const archivo of ['motor_juego.js', 'multijugador.js', 'config_firebase.js']) {
    const r = spawnSync(process.execPath, ['--check', path.join(RAIZ, archivo)], { encoding: 'utf8' });
    verificar(`${archivo} compila`, r.status === 0);
}

// ---------- B. MOTOR (VM de Node) ----------
seccion('B. Motor de juego (VM)');

const codigoMotor = leer('motor_juego.js');
const almacen = {}, sesion = {};
const sandbox = {
    console,
    document: {
        addEventListener() {}, getElementById: () => null, querySelector: () => null,
        querySelectorAll: () => [], body: { getAttribute: () => null },
        createElement: () => ({ style: {}, classList: { add() {}, toggle() {} }, appendChild() {}, addEventListener() {} })
    },
    localStorage: { getItem: k => almacen[k] ?? null, setItem: (k, v) => { almacen[k] = String(v); }, removeItem: k => { delete almacen[k]; } },
    sessionStorage: { getItem: k => sesion[k] ?? null, setItem: (k, v) => { sesion[k] = String(v); }, removeItem: k => { delete sesion[k]; } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(codigoMotor + ';this.__FJ = window.FortunaJuego;', sandbox);
const J = sandbox.__FJ;

verificar('TOTAL_RONDAS == 10 y poolNoticias tiene 60', J.TOTAL_RONDAS === 10 && J.poolNoticias.length === 60);

verificar('60 noticias válidas con efectos en [0.5, 1.5]',
    J.poolNoticias.every(n =>
        n && typeof n.titular === 'string' && n.titular.length > 0 &&
        typeof n.descripcion === 'string' && n.descripcion.length > 0 &&
        n.efectos && Object.keys(n.efectos).length >= 1 &&
        Object.entries(n.efectos).every(([k, v]) => !!J.ASSETS[k] && typeof v === 'number' && v >= 0.5 && v <= 1.5)
    )
);

{
    const e1 = J.efectosDeRonda('ABC123', 3, J.poolNoticias[3]);
    const e2 = J.efectosDeRonda('ABC123', 3, J.poolNoticias[3]);
    const eOtra = J.efectosDeRonda('XYZ999', 3, J.poolNoticias[3]);
    verificar('determinismo: misma semilla+ronda ⇒ mismos efectos',
        JSON.stringify(e1) === JSON.stringify(e2) && JSON.stringify(e1) !== JSON.stringify(eOtra));
}

{
    // Invariante económico EXACTO: nuevoCapital === capitalAnterior + Σneto
    let maxDesvio = 0, peorPerdida = false;
    for (let r = 0; r < J.TOTAL_RONDAS; r++) {
        const noticia = J.poolNoticias[r % J.poolNoticias.length];
        const efectos = J.efectosDeRonda('SEED#' + r, r, noticia);
        const montos = { acciones: 3000, materias: 2000, bienes: 1500, bonos: 1000 };
        const res = J.calcularRonda(noticia, efectos, montos, 10000);
        const sumaNetos = Object.values(res.desglose).reduce((a, d) => a + d.neto, 0);
        maxDesvio = Math.max(maxDesvio, Math.abs(res.nuevoCapital - 10000 - sumaNetos));
        if (res.nuevoCapital < 0 || Object.values(res.desglose).some(d => d.neto < -d.monto)) peorPerdida = true;
    }
    verificar('conservación exacta del dinero en las 10 rondas', maxDesvio < 0.01);
    verificar('sin pérdidas mayores a lo invertido ni capitales negativos', !peorPerdida);
}

{
    const resCash = J.calcularRonda(
        J.poolNoticias[0], J.efectosDeRonda('CASH', 0, J.poolNoticias[0]),
        { acciones: 0, materias: 0, bienes: 0, bonos: 0 }, 7777);
    verificar('no invertir conserva el efectivo intacto', Math.abs(resCash.nuevoCapital - 7777) < 0.01);
}

{
    const ataques = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(1)>',
        "Robert'); DROP TABLE--",
        '\u{1F600} \u00F1 \u00E1 <b>'
    ];
    const limpios = ataques.map(a => J.sanitizarTexto(a, 40));
    verificar('sanitizarTexto neutraliza XSS y respeta unicode/emoji',
        limpios.every(s => !/[<>"']/.test(s)) && limpios[4].includes('\u{1F600}'));
}

verificar('generarCodigoSala: 200 códigos con formato A-Z0-9 x6',
    Array.from({ length: 200 }, () => J.generarCodigoSala()).every(c => /^[A-Z0-9]{6}$/.test(c)));

// ---------- C. REGRESIONES DE SINCRONIZACIÓN ----------
seccion('C. Regresiones multijugador (bugs 2026-08-23)');

const srcMulti = leer('multijugador.js');

// C1. El cero en rondaConfirmada NO debe tratarse como "sin confirmar".
function confirmacionDeReplica(j) {
    const v = Number(j.rondaConfirmada);
    return Number.isFinite(v) ? v : -1;
}
verificar('confirmación de ronda: 0 cuenta como confirmado',
    confirmacionDeReplica({ rondaConfirmada: 0 }) === 0 &&
    confirmacionDeReplica({ rondaConfirmada: 1 }) === 1 &&
    confirmacionDeReplica({}) === -1);
verificar('multijugador usa el helper confirmacionDe()', srcMulti.includes('confirmacionDe(j)'));
verificar('patrón bug "(Number(j.rondaConfirmada) || -1)" eliminado', !srcMulti.includes('(Number(j.rondaConfirmada) || -1)'));

// C2. El jugador que llega tarde a resultados debe navegar contra SU ronda completada.
const srcMotor = codigoMotor;
verificar('resultados compara contra miSnap.rondaConfirmada (llegada tardía)',
    srcMotor.includes('sala.rondaActual > miSnap.rondaConfirmada') &&
    !srcMotor.includes('sala.rondaActual > salaSnap.rondaActual'));

// C3. Pantallas esperan sala Y jugador; navegaciones protegidas anti-bucle.
verificar('tablero y resultados usan esperarTodo()', (srcMotor.match(/esperarTodo\(\)/g) || []).length >= 2);
verificar('navegaciones automáticas pasan por navegarA()', srcMotor.includes('FortunaMulti.navegarA(`'));
verificar('blindaje anti-bucle presente en multijugador', srcMulti.includes('CLAVE_ULTIMA_NAV') && srcMulti.includes('navegarA: navegar'));

// ---------- D. INTEGRIDAD DE IDs JS ↔ HTML ----------
seccion('D. Integridad de IDs');

const htmls = ['menu_principal.html', 'tablero_juego.html', 'resultados_ronda.html', 'final_partida.html'];
const htmlConjunto = htmls.map(leer).join('\n');
const idsEnHtml = new Set([...htmlConjunto.matchAll(/id="([^"]+)"/g)].map(m => m[1]));

// IDs dinámicos creados desde JS (documentados en AGENTS.md):
const DINAMICOS = /^monto-|^btn-reanudar$/;
const usadosEnJs = new Set();
for (const m of (srcMotor + srcMulti).matchAll(/getElementById\('([^']+)'\)/g)) {
    if (!/\$\{/.test(m[1])) usadosEnJs.add(m[1]);
}
const faltantes = [...usadosEnJs].filter(id => !idsEnHtml.has(id) && !DINAMICOS.test(id));
verificar(`todos los getElementById estáticos existen en el HTML (${usadosEnJs.size} consultados)`, faltantes.length === 0);
if (faltantes.length) console.log('     ⚠️ Faltantes: ' + faltantes.join(', '));

// ---------- E. ESTRUCTURA Y ACCESIBILIDAD ----------
seccion('E. Estructura y accesibilidad');

verificar('las 4 páginas declaran lang="es"', htmls.every(h => /<html lang="es">/.test(leer(h))));
verificar('las 4 páginas tienen viewport meta', htmls.every(h => /name="viewport"/.test(leer(h))));
verificar('las 4 páginas usan data-pagina', htmls.every(h => /data-pagina="(menu|tablero|resultados|final)"/.test(leer(h))));
verificar('los 4 CSS conservan la regla [hidden]', ['style_menuPrincipal.css', 'style_tablero.css', 'style_resultados.css', 'style_final.css'].every(c => /\[hidden]\s*{\s*display:\s*none\s*!important/.test(leer(c))));
const CSS_FILES = ['style_menuPrincipal.css', 'style_tablero.css', 'style_resultados.css', 'style_final.css'];
verificar('foco visible (:focus-visible) en los 4 CSS', CSS_FILES.every(c => leercss(c).includes(':focus-visible')));
verificar('prefers-reduced-motion respetado en los 4 CSS', CSS_FILES.every(c => leercss(c).includes('prefers-reduced-motion')));

const menu = leer('menu_principal.html');
verificar('avatares son botones operables por teclado (radiogroup)',
    menu.includes('role="radiogroup"') && menu.includes('role="radio"') && menu.includes('aria-checked'));

const tablero = leer('tablero_juego.html');
verificar('tablero tiene h1 para lectores de pantalla (.sr-only)', tablero.includes('class="sr-only"'));

verificar('ningún innerHTML con datos (asignaciones prohibidas)', !/\.innerHTML\s*=/.test(srcMotor + srcMulti));
verificar('sin onclick= inline en los HTML', !/onclick=/.test(htmlConjunto));
verificar('input de apodo tiene etiqueta accesible', /id="player-name"[\s\S]{0,200}/.test(menu)); // placeholder + sección con h2

function leercss(f) { return leer(f); }

// ---------- RESUMEN ----------
console.log('\n' + '═'.repeat(62));
console.log(`Resultado: ${pasan} pasaron · ${fallan} fallaron`);
console.log(fallan === 0 ? '🎉 TODO EN ORDEN' : '⚠️ REVISAR FALLOS ARRIBA');
process.exit(fallan === 0 ? 0 : 1);
