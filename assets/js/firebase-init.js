// Arquivo: assets/js/firebase-init.js
// Versão: 1.7 (Correção Crítica de Sintaxe)

// A variável global 'firebase' é carregada pelos scripts <script> no HTML.
// Este arquivo a utiliza para inicializar os serviços e exportá-los para os outros módulos.

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

// Exporta as instâncias dos serviços que serão usadas nos outros módulos
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();
const storage = firebase.storage();
const rtdb = firebase.database();

// A variável 'firebase' já é global, então não a exportamos. Apenas os serviços.
export { auth, db, functions, storage, rtdb };
// Fim do arquivo firebase-init.js
// Versão: 1.7 (Correção Crítica de Sintaxe)
