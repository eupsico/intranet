// Arquivo: assets/js/firebase-init.js
// Versão: 9.2 (Adiciona Logs de depuração)

console.log("--- [LOG] Iniciando firebase-init.js ---");

// 1. Importa as funções de inicialização e os serviços
try {
  console.log("[LOG] Passo 1: Importando módulos do Firebase...");

  // Tenta importar usando os caminhos de módulo padrão
  var { initializeApp } = await import("firebase/app");
  var { getAuth, onAuthStateChanged } = await import("firebase/auth");
  var {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    orderBy,
    arrayUnion,
    deleteField,
  } = await import("firebase/firestore");
  var { getFunctions, httpsCallable } = await import("firebase/functions");
  var { getStorage } = await import("firebase/storage");
  var { getDatabase } = await import("firebase/database");

  console.log(
    "[LOG] Sucesso: Módulos do Firebase importados via 'firebase/...'"
  );
} catch (e) {
  console.error(
    "[LOG] FALHA ao importar via 'firebase/...'. Tentando importar via URL (CDN)...",
    e
  );

  // Se a primeira tentativa falhar, tenta importar via URL completa (plano B)
  try {
    var { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js"
    );
    var { getAuth, onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"
    );
    var {
      getFirestore,
      collection,
      doc,
      getDoc,
      getDocs,
      addDoc,
      updateDoc,
      deleteDoc,
      query,
      where,
      limit,
      orderBy,
      arrayUnion,
      deleteField,
    } = await import(
      "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"
    );
    var { getFunctions, httpsCallable } = await import(
      "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js"
    );
    var { getStorage } = await import(
      "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js"
    );
    var { getDatabase } = await import(
      "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js"
    );

    console.log("[LOG] Sucesso: Módulos do Firebase importados via URL (CDN).");
  } catch (e2) {
    console.error(
      "[LOG] FALHA CRÍTICA: Não foi possível importar o Firebase de nenhuma forma.",
      e2
    );
    alert(
      "Erro crítico ao carregar as dependências do Firebase. Verifique o console."
    );
  }
}

// 2. Sua configuração do Firebase
console.log("[LOG] Passo 2: Definindo a configuração do Firebase.");
const firebaseConfig = {
  apiKey: "AIzaSyDJqPJjDDIGo7uRewh3pw1SQZOpMgQJs5M",
  authDomain: "eupsico-agendamentos-d2048.firebaseapp.com",
  databaseURL: "https://eupsico-agendamentos-d2048-default-rtdb.firebaseio.com",
  projectId: "eupsico-agendamentos-d2048",
  storageBucket: "eupsico-agendamentos-d2048.appspot.com",
  messagingSenderId: "1041518416343",
  appId: "1:1041518416343:web:087006662ffcfa12d7bb92",
};

// 3. Inicializa os serviços do Firebase
console.log("[LOG] Passo 3: Inicializando os serviços do Firebase.");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");
const storage = getStorage(app);
const rtdb = getDatabase(app);
console.log("[LOG] Serviços inicializados com sucesso.");

// 4. Exporta todos os serviços e funções
console.log("[LOG] Passo 4: Exportando os serviços e funções.");
export {
  app,
  auth,
  db,
  functions,
  storage,
  rtdb,
  onAuthStateChanged,
  httpsCallable,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  arrayUnion,
  deleteField,
};
console.log("--- [LOG] Finalizado firebase-init.js ---");
