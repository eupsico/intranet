// Arquivo: assets/js/firebase-init.js
// Versão: FINAL (Modernizado para Firebase v9+ Modular)
// Descrição: Inicializa o Firebase com a nova API modular e exporta todas as instâncias e funções necessárias para a aplicação.

// Funções importadas dos módulos do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
    getFirestore, collection, query, where, orderBy, getDocs, 
    getDoc, doc, setDoc, updateDoc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta tudo que a aplicação precisa
export {
    auth,
    db,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    addDoc,
    serverTimestamp
};