import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const db = getFirestore();
const configRef = doc(db, "configuracoesSistema", "geral");

// --- LÓGICA DAS ABAS ---
function openTab(evt, tabName) {
  // Esconde todos os conteúdos de aba
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach((tab) => (tab.style.display = "none"));

  // Remove a classe 'active' de todos os links de aba
  const tabLinks = document.querySelectorAll(".tab-link");
  tabLinks.forEach((link) => link.classList.remove("active"));

  // Mostra a aba atual e adiciona a classe 'active' ao botão
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.classList.add("active");
}
// Torna a função acessível globalmente para o onclick no HTML
window.openTab = openTab;

// --- CARREGAR DADOS DO FIRESTORE ---
async function loadConfig() {
  const feedbackEl = document.getElementById("save-feedback");
  const spinner = document.getElementById("loading-spinner");
  spinner.style.display = "block";

  try {
    const docSnap = await getDoc(configRef);

    if (docSnap.exists()) {
      const configData = docSnap.data();
      // Preenche o formulário com os dados carregados
      populateForm(configData);
    } else {
      console.log(
        "Documento de configurações não encontrado! Será criado um novo ao salvar."
      );
      feedbackEl.textContent =
        "Nenhuma configuração encontrada. Preencha e salve para criar.";
      feedbackEl.style.color = "orange";
    }
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    feedbackEl.textContent = "Erro ao carregar as configurações.";
    feedbackEl.style.color = "red";
  } finally {
    spinner.style.display = "none";
  }
}

function populateForm(data) {
  const form = document.getElementById("config-form");
  // Itera sobre os mapas no objeto de dados (ex: financeiro, listas)
  for (const mapKey in data) {
    const mapData = data[mapKey];
    // Itera sobre as chaves dentro de cada mapa
    for (const fieldKey in mapData) {
      const fieldName = `${mapKey}.${fieldKey}`;
      const field = form.elements[fieldName];
      if (field) {
        // Se o dado for um array (para textareas de listas), junta com quebra de linha
        if (Array.isArray(mapData[fieldKey])) {
          field.value = mapData[fieldKey].join("\n");
        } else {
          field.value = mapData[fieldKey];
        }
      }
    }
  }
}

// --- SALVAR DADOS NO FIRESTORE ---
async function saveConfig() {
  const form = document.getElementById("config-form");
  const feedbackEl = document.getElementById("save-feedback");
  const spinner = document.getElementById("loading-spinner");
  const saveButton = document.getElementById("save-button");

  saveButton.disabled = true;
  spinner.style.display = "block";
  feedbackEl.textContent = "";

  const formData = new FormData(form);
  const configObject = {};

  // Transforma os dados do formulário no objeto estruturado com mapas
  for (const [key, value] of formData.entries()) {
    const [mapKey, fieldKey] = key.split(".");

    if (!configObject[mapKey]) {
      configObject[mapKey] = {}; // Cria o mapa se não existir (ex: 'financeiro': {})
    }

    // Verifica se o campo pertence a uma lista (pelo ID do textarea)
    const elementId = document.querySelector(`[name="${key}"]`).id;
    if (["salasPresenciais", "profissoes", "conselhos"].includes(elementId)) {
      // Converte o texto do textarea em um array, removendo linhas vazias
      configObject[mapKey][fieldKey] = value
        .split("\n")
        .filter((line) => line.trim() !== "");
    } else {
      configObject[mapKey][fieldKey] = value;
    }
  }

  try {
    // Usa setDoc com merge: true para criar ou atualizar o documento sem sobrescrever campos não gerenciados
    await setDoc(configRef, configObject, { merge: true });
    feedbackEl.textContent = "Configurações salvas com sucesso!";
    feedbackEl.style.color = "green";
  } catch (error) {
    console.error("Erro ao salvar configurações: ", error);
    feedbackEl.textContent = "Erro ao salvar. Verifique o console.";
    feedbackEl.style.color = "red";
  } finally {
    saveButton.disabled = false;
    spinner.style.display = "none";
    setTimeout(() => (feedbackEl.textContent = ""), 3000); // Limpa o feedback após 3 segundos
  }
}

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
  // Garante que a primeira aba esteja visível ao carregar
  document.querySelector(".tab-content").classList.add("active");
  document.querySelector(".tab-link").classList.add("active");

  // Carrega as configurações do Firestore
  loadConfig();

  // Adiciona o listener ao botão de salvar
  const saveButton = document.getElementById("save-button");
  saveButton.addEventListener("click", saveConfig);
});
