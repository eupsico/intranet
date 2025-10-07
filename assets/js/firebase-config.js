// src/assets/js/firebase-config.js

// Suas credenciais do Firebase ficam isoladas aqui.
const firebaseConfig = {
  apiKey: "AIzaSyDJqPJjDDIGo7uRewh3pw1SQZOpMgQJs5M",
  authDomain: "eupsico-agendamentos-d2048.firebaseapp.com",
  databaseURL: "https://eupsico-agendamentos-d2048-default-rtdb.firebaseio.com",
  projectId: "eupsico-agendamentos-d2048",
  storageBucket: "eupsico-agendamentos-d2048.appspot.com",
  messagingSenderId: "1041518416343",
  appId: "1:1041518416343:web:087006662ffcfa12d7bb92",
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Exporta as instâncias que serão usadas em outros lugares do app
export const auth = firebase.auth();
export const db = firebase.firestore();
export const rtdb = firebase.database();
