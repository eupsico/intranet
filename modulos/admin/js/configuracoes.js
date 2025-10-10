// --- INÍCIO DA CORREÇÃO ---
// Importa a instância 'db' já inicializada e as funções 'doc', 'getDoc', 'setDoc'
import { db, doc, getDoc, setDoc } from "../../../assets/js/firebase-init.js";
// --- FIM DA CORREÇÃO ---

// --- LÓGICA DAS ABAS ---
function openTab(evt, tabName) {
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach((tab) => (tab.style.display = "none"));

  const tabLinks = document.querySelectorAll(".tab-link");
  tabLinks.forEach((link) => link.classList.remove("active"));

  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.classList.add("active");
}

// --- LÓGICA DE CARREGAMENTO E SALVAMENTO ---
const configRef = doc(db, "configuracoesSistema", "geral");

async function loadConfig() {
  const feedbackEl = document.getElementById("save-feedback");
  const spinner = document.getElementById("loading-spinner");
  spinner.style.display = "block";

  try {
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) {
      populateForm(docSnap.data());
    } else {
      console.log(
        "Documento de configurações não encontrado! Será criado um novo ao salvar."
      );
      feedbackEl.textContent =
        "Nenhuma configuração salva. Preencha e salve para criar.";
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
  if (!form) return;
  for (const mapKey in data) {
    const mapData = data[mapKey];
    for (const fieldKey in mapData) {
      const fieldName = `${mapKey}.${fieldKey}`;
      const field = form.elements[fieldName];
      if (field) {
        if (Array.isArray(mapData[fieldKey])) {
          field.value = mapData[fieldKey].join("\n");
        } else {
          field.value = mapData[fieldKey];
        }
      }
    }
  }
}

async function saveConfig() {
  const form = document.getElementById("config-form");
  const feedbackEl = document.getElementById("save-feedback");
  const spinner = document.getElementById("loading-spinner");
  const saveButton = document.getElementById("save-button");
  if (!form || !feedbackEl || !spinner || !saveButton) return;

  saveButton.disabled = true;
  spinner.style.display = "block";
  feedbackEl.textContent = "";

  const formData = new FormData(form);
  const configObject = {};

  for (const [key, value] of formData.entries()) {
    const [mapKey, fieldKey] = key.split(".");
    if (!mapKey || !fieldKey) continue;

    if (!configObject[mapKey]) {
      configObject[mapKey] = {};
    }

    const element = document.querySelector(`[name="${key}"]`);
    if (
      element &&
      element.tagName === "TEXTAREA" &&
      key.startsWith("listas.")
    ) {
      configObject[mapKey][fieldKey] = value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
    } else {
      configObject[mapKey][fieldKey] = value;
    }
  }

  try {
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
    setTimeout(() => {
      if (feedbackEl) feedbackEl.textContent = "";
    }, 3000);
  }
}

/**
 * Função de inicialização do módulo de configurações.
 */
export function init() {
  console.log("⚙️ Módulo de Configurações iniciado.");

  const firstTabLink = document.querySelector(".tab-link");
  if (firstTabLink) {
    firstTabLink.click();
  }

  loadConfig();

  const saveButton = document.getElementById("save-button");
  if (saveButton) {
    saveButton.addEventListener("click", saveConfig);
    console.log("Listener de clique adicionado ao botão 'Salvar'.");
  } else {
    console.error("Botão 'Salvar' não encontrado no DOM.");
  }

  window.openTab = openTab;
}
