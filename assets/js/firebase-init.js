// Arquivo: assets/js/firebase-init.js
// Versão: 1.1
// Descrição: Adiciona a inicialização e exportação do Firebase Storage.

// --- CONFIGURAÇÃO ÚNICA DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDJqPJjDDIGo7uRewh3pw1SQZOpMgQJs5M",
    authDomain: "eupsico-agendamentos-d2048.firebaseapp.com",
    databaseURL: "https://eupsico-agendamentos-d2048-default-rtdb.firebaseio.com",
    projectId: "eupsico-agendamentos-d2048",
    storageBucket: "eupsico-agendamentos-d2048.appspot.com", // Corrigido para o domínio correto do storage
    messagingSenderId: "1041518416343",
    appId: "1:1041518416343:web:0a11c03c205b802ed7bb92"
};

// --- INICIALIZAÇÃO E EXPORTAÇÃO ---
// Garante que o Firebase seja inicializado apenas uma vez
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Exporta as instâncias dos serviços para serem usadas em outros arquivos
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage(); // <-- ALTERAÇÃO 1: Inicializa o Storage

export { auth, db, storage }; // <-- ALTERAÇÃO 2: Exporta o Storage junto com os outros