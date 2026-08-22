// =====================================================
// CONFIGURACIÓN DE FIREBASE — Fortuna Familiar v3.0
//
// ⚠️  PASOS PARA ACTIVAR EL MODO EN LÍNEA (gratis):
//
// 1. Ve a https://console.firebase.google.com y crea un
//    proyecto nuevo (ej. "fortuna-familiar").
//
// 2. En el panel izquierdo entra a "Compilación →
//    Firestore Database" y pulsa "Crear base de datos"
//    (modo de producción está bien).
//
// 3. Entra a "Compilación → Authentication → Sign-in
//    method" y activa el proveedor "Anónimo".
//
// 4. Vuelve a la vista general del proyecto (icono ⚙️ →
//    Configuración del proyecto) y en la sección
//    "Tus apps" registra una app web (</>). Firebase te
//    mostrará un objeto firebaseConfig con estos campos.
//
// 5. Copia aquí abajo los valores que te dio Firebase,
//    reemplazando los textos en MAYÚSCULAS.
//
// 6. Pega el contenido del archivo firestore.rules de este
//    proyecto en "Firestore → Reglas" y publica.
//
// 🔒 NOTA DE SEGURIDAD: la apiKey de una app web NO es un
// secreto (Firebase la diseña así); la protección real la
// dan las reglas de firestore.rules, que limitan quién
// puede leer/escribir cada dato.
// =====================================================

const FIREBASE_CONFIG = {
    apiKey: "PEGA_AQUI_TU_API_KEY",
    authDomain: "PEGA_AQUI_TU_AUTH_DOMAIN",
    projectId: "PEGA_AQUI_TU_PROJECT_ID",
    storageBucket: "PEGA_AQUI_TU_STORAGE_BUCKET",
    messagingSenderId: "PEGA_AQUI_TU_SENDER_ID",
    appId: "PEGA_AQUI_TU_APP_ID"
};
