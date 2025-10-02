// Arquivo: assets/js/firebase-init.js
// Versão: 1.5 (Final, Completa e Corrigida para compatibilidade total)

// --- CONFIGURAÇÃO ÚNICA DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDJqPJjDDIGo7uRewh3pw1SQZOpMgQJs5M",
  authDomain: "eupsico-agendamentos-d2048.firebaseapp.com",
  databaseURL: "https://eupsico-agendamentos-d2048-default-rtdb.firebaseio.com",
  projectId: "eupsico-agendamentos-d2048",
  storageBucket: "eupsico-agendamentos-d2048.firebasestorage.app",
  messagingSenderId: "1041518416343",
  appId: "1:1041518416343:web:087006662ffcfa12d7bb92",
};

// --- INICIALIZAÇÃO E EXPORTAÇÃO ---
// Garante que o Firebase seja inicializado apenas uma vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporta as instâncias dos serviços usando a sintaxe de compatibilidade
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();
const storage = firebase.storage(); // Adicionado para consistência
const rtdb = firebase.database(); // Adicionado para consistência

// Adiciona uma exportação global 'firebase' para garantir compatibilidade com scripts mais antigos
window.firebase = firebase;

export { auth, db, functions, storage, rtdb, firebase };
