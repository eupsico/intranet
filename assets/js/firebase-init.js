
// Arquivo: assets/js/firebase-init.js
// Versão: 2.0 (Modernizado para Firebase v9+ Modular)
// Descrição: Inicializa o Firebase com a nova API modular e exporta as instâncias dos serviços.

// Funções importadas dos módulos do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- CONFIGURAÇÃO ÚNICA DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDJqPJjDDIGo7uRewh3pw1SQZOpMgQJs5M",
    authDomain: "eupsico-agendamentos-d2048.firebaseapp.com",
    databaseURL: "https://eupsico-agendamentos-d2048-default-rtdb.firebaseio.com",
    projectId: "eupsico-agendamentos-d2048",
    storageBucket: "eupsico-agendamentos-d2048.appspot.com",
    messagingSenderId: "1041518416343",
    appId: "1:1041518416343:web:0a11c03c205b802ed7bb92"
};

// --- INICIALIZAÇÃO E EXPORTAÇÃO ---
// Inicializa o app Firebase
const app = initializeApp(firebaseConfig);

// Obtém as instâncias dos serviços
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta as instâncias dos serviços e as funções necessárias para outros módulos
export {
    auth,
    db,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    collection,
    doc,
    getDoc
};