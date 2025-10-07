// Arquivo: assets/js/firebase-init.js
// Versão: 1.8 (Correção Crítica de Sintaxe)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// Adiciona as importações necessárias aqui
import {
  getFirestore,
  arrayUnion,
  deleteField,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";

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
//const auth = firebase.auth();
const auth = getAuth(app);
//const db = firebase.firestore();
const db = getFirestore(app);
//const functions = firebase.functions();
const functions = getFunctions(app, "southamerica-east1");
const storage = firebase.storage();
const rtdb = firebase.database();

// A variável 'firebase' já é global, então não a exportamos. Apenas os serviços.
export {
  db,
  functions,
  auth,
  onAuthStateChanged,
  httpsCallable,
  arrayUnion,
  deleteField,
  doc,
  updateDoc,
};
