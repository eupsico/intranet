// Arquivo: /modulos/admin/js/configuracoes.js
// Versão: 4.1 (COMPLETO E CORRIGIDO - Departamentos integrados ao 'geral')

import { db, doc, getDoc, setDoc } from "../../../assets/js/firebase-init.js";

// A referência agora é apenas para o documento 'geral'
const configRef = doc(db, "configuracoesSistema", "geral");

// --- LÓGICA DAS ABAS ---
function openTab(evt, tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => (tab.style.display = "none"));
  document
    .querySelectorAll(".tab-link")
    .forEach((link) => link.classList.remove("active"));
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.classList.add("active");
}

// --- LÓGICA DE CARREGAMENTO E SALVAMENTO ---
async function loadConfig() {
  const feedbackEl = document.getElementById("save-feedback");
  const spinner = document.getElementById("loading-spinner");
  spinner.style.display = "block";

  try {
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Função para preencher todos os campos do formulário
      populateForm(data);
      // Função específica para renderizar a tabela de faixas
      renderFaixasTable(data.financeiro?.faixasContribuicao || []);
    } else {
      console.warn(
        "Documento de configurações não encontrado! Um novo será criado ao salvar."
      );
      feedbackEl.textContent =
        "Nenhuma configuração salva. Preencha e salve para criar.";
      feedbackEl.style.color = "orange";
      // Renderiza a tabela de faixas vazia se não houver dados
      renderFaixasTable([]);
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
  for (const mapKey in data) {
    if (!data.hasOwnProperty(mapKey)) continue;
    const mapData = data[mapKey];
    for (const fieldKey in mapData) {
      if (!mapData.hasOwnProperty(fieldKey)) continue;

      // Ignora o array de faixas, pois ele é renderizado pela função renderFaixasTable
      if (fieldKey === "faixasContribuicao") continue;

      const fieldName = `${mapKey}.${fieldKey}`;
      const field = form.elements[fieldName];
      if (field) {
        // Se o valor for um array (como as listas), junta com quebra de linha para preencher a textarea
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
  saveButton.disabled = true;
  spinner.style.display = "block";
  feedbackEl.textContent = "";

  const configObject = {};
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    const [mapKey, fieldKey] = key.split(".");
    if (!mapKey || !fieldKey) continue;
    if (!configObject[mapKey]) {
      configObject[mapKey] = {};
    }

    const element = document.querySelector(`[name="${key}"]`);
    // Converte o valor das textareas na aba 'listas' de string para array
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

  // Coleta os dados da tabela de faixas dinamicamente
  const faixas = [];
  document
    .getElementById("faixas-contribuicao-tbody")
    .querySelectorAll("tr")
    .forEach((row) => {
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
  // Ordena as faixas antes de salvar
  faixas.sort((a, b) => a.ateSalarios - b.ateSalarios);

  if (!configObject.financeiro) configObject.financeiro = {};
  configObject.financeiro.faixasContribuicao = faixas;

  try {
    // Salva o objeto completo no documento 'geral'
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

// --- FUNÇÕES PARA GERENCIAR A TABELA DE FAIXAS DE CONTRIBUIÇÃO ---
function renderFaixasTable(faixas = []) {
  const tbody = document.getElementById("faixas-contribuicao-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (faixas.length > 0) {
    faixas.forEach((faixa) => tbody.appendChild(createFaixaRow(faixa)));
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
  tr.querySelector(".btn-remover-faixa").addEventListener("click", () =>
    tr.remove()
  );
  return tr;
}

/**
 * Função de inicialização do módulo de configurações.
 */
export function init() {
  console.log("⚙️ Módulo de Configurações iniciado.");

  // Anexa a função de abrir abas ao objeto window para ser acessível pelo HTML
  window.openTab = openTab;

  // Clica na primeira aba para garantir que o conteúdo seja exibido
  document.querySelector(".tab-link")?.click();

  // Carrega os dados do Firestore
  loadConfig();

  // Adiciona o listener ao botão de salvar
  document.getElementById("save-button")?.addEventListener("click", saveConfig);

  // Adiciona o listener para o botão "Adicionar Faixa"
  document
    .getElementById("btn-adicionar-faixa")
    ?.addEventListener("click", () => {
      const tbody = document.getElementById("faixas-contribuicao-tbody");
      if (tbody) {
        tbody.appendChild(createFaixaRow());
      }
    });
}
