// Arquivo: /modulos/admin/js/configuracoes.js
// Versão: 2.0 (Com gerenciamento de Faixas de Contribuição)

import { db, doc, getDoc, setDoc } from "../../../assets/js/firebase-init.js";

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
      const data = docSnap.data();
      populateForm(data);
      // --- INÍCIO DA ALTERAÇÃO ---
      renderFaixasTable(data.financeiro?.faixasContribuicao || []);
      // --- FIM DA ALTERAÇÃO ---
    } else {
      console.log("Documento de configurações não encontrado!");
      feedbackEl.textContent =
        "Nenhuma configuração salva. Preencha e salve para criar.";
      feedbackEl.style.color = "orange";
      // --- INÍCIO DA ALTERAÇÃO ---
      renderFaixasTable([]); // Renderiza a tabela vazia
      // --- FIM DA ALTERAÇÃO ---
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
    if (mapKey === "financeiro") continue; // Pula o mapa financeiro para não sobrescrever a tabela
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
  // Preenche os campos de financeiro manualmente, exceto as faixas
  if (data.financeiro) {
    const financeiroForm = document.querySelector("#financeiro");
    financeiroForm.querySelector("#percentualSupervisao").value =
      data.financeiro.percentualSupervisao || "";
    financeiroForm.querySelector("#diaLimiteComprovantes").value =
      data.financeiro.diaLimiteComprovantes || "";
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

  // --- INÍCIO DA ALTERAÇÃO ---
  // Coleta os dados da tabela de faixas e os transforma em um array de objetos
  const faixas = [];
  const faixasTbody = document.getElementById("faixas-contribuicao-tbody");
  faixasTbody.querySelectorAll("tr").forEach((row) => {
    const ateSalarios = row.querySelector(
      'input[data-field="ateSalarios"]'
    ).value;
    const percentual = row.querySelector(
      'input[data-field="percentual"]'
    ).value;
    if (ateSalarios && percentual) {
      faixas.push({
        ateSalarios: parseFloat(ateSalarios),
        percentual: parseFloat(percentual),
      });
    }
  });
  // Ordena as faixas pelo número de salários antes de salvar
  faixas.sort((a, b) => a.ateSalarios - b.ateSalarios);

  if (!configObject.financeiro) configObject.financeiro = {};
  configObject.financeiro.faixasContribuicao = faixas;
  // --- FIM DA ALTERAÇÃO ---

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

// --- INÍCIO DA ALTERAÇÃO ---
// Funções para gerenciar a tabela de faixas de contribuição
function renderFaixasTable(faixas = []) {
  const tbody = document.getElementById("faixas-contribuicao-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (faixas.length > 0) {
    faixas.forEach((faixa) => {
      const newRow = createFaixaRow(faixa);
      tbody.appendChild(newRow);
    });
  }
}

function createFaixaRow(faixa = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
        <td><input type="number" step="0.1" placeholder="Ex: 1.5" data-field="ateSalarios" value="${
          faixa.ateSalarios || ""
        }"></td>
        <td><input type="number" step="1" placeholder="Ex: 7" data-field="percentual" value="${
          faixa.percentual || ""
        }"></td>
        <td><button type="button" class="btn-remover-faixa">-</button></td>
    `;
  tr.querySelector(".btn-remover-faixa").addEventListener("click", () => {
    tr.remove();
  });
  return tr;
}
// --- FIM DA ALTERAÇÃO ---

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

  // --- INÍCIO DA ALTERAÇÃO ---
  // Adiciona o listener para o botão "Adicionar Faixa"
  const addFaixaBtn = document.getElementById("btn-adicionar-faixa");
  if (addFaixaBtn) {
    addFaixaBtn.addEventListener("click", () => {
      const tbody = document.getElementById("faixas-contribuicao-tbody");
      tbody.appendChild(createFaixaRow());
    });
  }
  // --- FIM DA ALTERAÇÃO ---

  window.openTab = openTab;
}
