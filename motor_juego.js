// ==========================================
// MOTOR DE JUEGO - VERSIÓN FINAL (QA APPROVED)
// ==========================================

// 1. BASE DE DATOS DE NOTICIAS
const poolNoticias = [
    { titular: "¡Científicos crean carne de aire!", efectos: { tech: 1.25, food: 0.70, energy: 1.05, realestate: 1.00 } },
    { titular: "¡Gran sequía mundial afecta cosechas!", efectos: { tech: 1.00, food: 1.35, energy: 0.90, realestate: 1.10 } },
    { titular: "¡Falla masiva en red eléctrica global!", efectos: { tech: 0.60, food: 0.90, energy: 1.40, realestate: 0.85 } },
    { titular: "¡Turismo en Marte es una realidad!", efectos: { tech: 1.15, food: 1.00, energy: 1.50, realestate: 0.70 } },
    { titular: "¡Nueva Ley: Casas de impresión 3D obligatorias!", efectos: { tech: 1.20, food: 1.00, energy: 1.00, realestate: 1.30 } }
];

// 2. DETECTOR DE NAVEGACIÓN Y CARGA DE PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const paginaActual = path.split("/").pop();

    if (paginaActual === 'menu_principal.html' || paginaActual === '') {
        inicializarMenuPrincipal();
    } else if (paginaActual === 'tablero_juego.html') {
        prepararTablero();
    } else if (paginaActual === 'resultados_ronda.html') {
        procesarMercado();
    } else if (paginaActual === 'final_partida.html') {
        mostrarPodioFinal();
    }
});

// 3. LÓGICA DE MENÚ (QA: Selección de Avatares corregida)
function inicializarMenuPrincipal() {
    const avatarItems = document.querySelectorAll('.avatar-item');
    const btnCrear = document.querySelector('.btn-primary');

    avatarItems.forEach(item => {
        item.onclick = () => {
            // Visual: Quitar activo de otros, poner al actual
            avatarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Guardar selección de avatar (se guarda el ID o la ruta de imagen)
            const imgPath = item.querySelector('img').src;
            localStorage.setItem('avatar_seleccionado', imgPath);
            console.log("Avatar guardado:", imgPath);
        };
    });

    if (btnCrear) {
        btnCrear.onclick = (e) => {
            e.preventDefault();
            const nombre = document.getElementById('player-name').value || "Jugador 1";
            
            // QA: No usamos clear() para no borrar el avatar. Limpiamos selectivamente.
            localStorage.removeItem('año');
            localStorage.removeItem('inversion_actual');
            
            // Valores de inicio de partida
            localStorage.setItem('nombre_jugador', nombre);
            localStorage.setItem('capital', 10000); 
            localStorage.setItem('año', 1);
            
            window.location.href = 'tablero_juego.html';
        };
    }
}

// 4. LÓGICA DEL TABLERO (QA: Carga de Capital Acumulado)
function prepararTablero() {
    const añoActual = parseInt(localStorage.getItem('año')) || 1;
    const capitalTotal = parseFloat(localStorage.getItem('capital')) || 10000;

    // Actualizar todos los indicadores de año y balance
    document.querySelectorAll('.label').forEach(el => el.innerText = `AÑO ${añoActual}/10`);
    const balanceElem = document.getElementById('balance');
    if (balanceElem) balanceElem.innerText = `$${capitalTotal.toLocaleString('es-CO')}`;

    // Cargar Avatar
    const imgAvatar = document.querySelector('.player-avatar img');
    const avatarSrc = localStorage.getItem('avatar_seleccionado');
    if (imgAvatar && avatarSrc) imgAvatar.src = avatarSrc;

    // Noticia
    const noticiaTurno = poolNoticias[Math.floor(Math.random() * poolNoticias.length)];
    localStorage.setItem('noticia_activa', JSON.stringify(noticiaTurno));
    document.getElementById('news-text').innerText = `"${noticiaTurno.titular}"`;

    // Sliders con validación 100%
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(s => {
        s.value = 0;
        s.oninput = () => {
            let suma = 0;
            sliders.forEach(sl => suma += parseInt(sl.value));
            if (suma > 100) s.value = parseInt(s.value) - (suma - 100);
            s.closest('.asset-card').querySelector('span').innerText = s.value + "%";
            guardarInversionTemporal();
        };
    });

    // Reloj
    let tiempo = 30;
    const timerDisplay = document.getElementById('timer-seconds');
    const cuentaRegresiva = setInterval(() => {
        tiempo--;
        if (timerDisplay) timerDisplay.innerText = tiempo + "s";
        if (tiempo <= 0) {
            clearInterval(cuentaRegresiva);
            const btn = document.querySelector('.btn-confirm');
            if(btn) btn.click();
        }
    }, 1000);

    const btnConfirmar = document.querySelector('.btn-confirm');
    if (btnConfirmar) {
        btnConfirmar.onclick = () => {
            clearInterval(cuentaRegresiva);
            guardarInversionTemporal();
            window.location.href = 'resultados_ronda.html';
        };
    }
}

// 5. CÁLCULO DE RESULTADOS (QA: Verificación de interés compuesto)
function procesarMercado() {
    const noticia = JSON.parse(localStorage.getItem('noticia_activa'));
    const inversion = JSON.parse(localStorage.getItem('inversion_actual')) || {tech:0, food:0, energy:0, realestate:0};
    const capitalAnterior = parseFloat(localStorage.getItem('capital')) || 10000;
    const añoActual = parseInt(localStorage.getItem('año')) || 1;

    // Cálculo matemático
    let factorRendimiento = (inversion.tech * noticia.efectos.tech) + 
                            (inversion.food * noticia.efectos.food) + 
                            (inversion.energy * noticia.efectos.energy) + 
                            (inversion.realestate * noticia.efectos.realestate);
    
    let totalInv = inversion.tech + inversion.food + inversion.energy + inversion.realestate;
    factorRendimiento += (1 - totalInv); // Lo que no se invirtió se mantiene

    const nuevoCapital = Math.round(capitalAnterior * factorRendimiento);
    
    // PERSISTENCIA CRÍTICA: Aquí se guarda el capital para el próximo año
    localStorage.setItem('capital', nuevoCapital);

    // UI
    document.getElementById('round-title').innerText = `CIERRE DEL AÑO ${añoActual}`;
    const bal = document.getElementById('final-balance');
    if (bal) {
        bal.innerText = `$${nuevoCapital.toLocaleString('es-CO')}`;
        bal.style.color = nuevoCapital >= capitalAnterior ? "#4ade80" : "#f87171";
    }

    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
        btnNext.onclick = () => {
            if (añoActual >= 10) {
                window.location.href = 'final_partida.html';
            } else {
                localStorage.setItem('año', añoActual + 1);
                window.location.href = 'tablero_juego.html';
            }
        };
    }
}

function guardarInversionTemporal() {
    const sliders = document.querySelectorAll('input[type="range"]');
    let inv = { tech: 0, food: 0, energy: 0, realestate: 0 };
    sliders.forEach(s => {
        const card = s.closest('.asset-card');
        const val = parseInt(s.value) / 100;
        if (card.classList.contains('tech')) inv.tech = val;
        if (card.classList.contains('food')) inv.food = val;
        if (card.classList.contains('energy')) inv.energy = val;
        if (card.classList.contains('realestate')) inv.realestate = val;
    });
    localStorage.setItem('inversion_actual', JSON.stringify(inv));
}

function mostrarPodioFinal() {
    const total = parseFloat(localStorage.getItem('capital'));
    const display = document.querySelector('.final-wealth');
    if(display) display.innerText = `$${total.toLocaleString('es-CO')}`;
}