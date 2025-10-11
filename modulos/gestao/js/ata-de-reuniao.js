// /modulos/gestao/js/ata-de-reuniao.js
// VERSÃO 4.0 (CORRIGIDA - Com busca de gestores do Firestore e lógica aprimorada)

import { db } from "../../../assets/js/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
  ref as dbRef,
  push,
  set,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

let atividadesPlanoAcao = [];
let gestoresCache = []; // Cache para armazenar a lista de gestores e evitar múltiplas buscas
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyqUqnwTJX1yh3i5h8CNJJ0r0u0MqI6Pvbte0lnuyVKStS7UR28czQWyQzUhp8X3pIaaQ/exec";

/**
 * Função de inicialização do módulo, EXPORTADA para ser chamada pelo painel-gestao.js.
 */
export async function init(user, userData) {
  console.log("[ATA] Módulo de Registro de Ata iniciado.");
  // Busca os gestores uma vez e armazena em cache
  await fetchGestores();
  // Cria o formulário
  createNewAtaForm();
}

/**
 * Busca usuários com a função 'gestor' no Firestore e armazena em cache.
 */
async function fetchGestores() {
  if (gestoresCache.length > 0) return; // Usa o cache se já foi preenchido

  try {
    const usuariosRef = collection(db, "usuarios");
    const q = query(
      usuariosRef,
      where("funcoes", "array-contains", "gestor"),
      orderBy("nome")
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      gestoresCache = snapshot.docs.map((doc) => doc.data().nome);
      console.log("[ATA] Gestores encontrados:", gestoresCache);
    } else {
      console.warn(
        "[ATA] Nenhum usuário com a função 'gestor' foi encontrado."
      );
    }
  } catch (error) {
    console.error("[ATA] Erro ao buscar gestores:", error);
  }
}

/**
 * Gera o HTML do formulário e o insere no container.
 */
function createNewAtaForm() {
  atividadesPlanoAcao = [];
  const container = document.getElementById("new-ata-card-container");
  if (!container) {
    console.error(
      "[ATA] Erro: Container #new-ata-card-container não encontrado."
    );
    return;
  }

  container.innerHTML = `
        <div class="form-group"><label class="form-title-label">Tipo de Reunião</label><select class="form-control ata-tipo"><option value="" disabled selected>Selecione...</option><option value="Reunião Conselho administrativo">Reunião Conselho administrativo</option><option value="Reunião com Gestor">Reunião com Gestor</option><option value="Reunião Técnica">Reunião Técnica</option><option value="Outros">Outros</option></select><span class="error-message"></span></div>
        <div class="form-group gestor-select-field" style="display: none;"><label class="form-title-label">Nome do Gestor</label><select class="form-control ata-nome-gestor"><option value="">Selecione...</option></select><span class="error-message"></span></div>
        <div class="form-row cols-3">
            <div class="form-group"><label class="form-title-label">Data da Reunião</label><input type="date" class="form-control ata-date"><span class="error-message"></span></div>
            <div class="form-group"><label class="form-title-label">Hora de Início</label><input type="time" class="form-control ata-start-time"><span class="error-message"></span></div>
            <div class="form-group"><label class="form-title-label">Hora de Fim</label><input type="time" class="form-control ata-end-time"><span class="error-message"></span></div>
        </div>
        <div class="form-group tecnica-field duracao-field-container" style="display: none;"><label class="form-title-label">Duração (minutos)</label><input type="number" class="form-control ata-duracao"><span class="error-message"></span></div>
        <div class="form-group tecnica-field" style="display: none;"><label class="form-title-label">Responsável</label><input type="text" class="form-control ata-responsavel-tecnica"><span class="error-message"></span></div>
        <div class="form-group participantes-field" style="display: none;"><label class="form-title-label">Participantes</label><div class="participantes-checkbox-container" style="display: none;"></div><input type="text" class="form-control ata-participantes-input" style="display: none;" placeholder="Nomes separados por vírgula"><span class="error-message"></span></div>
        <div class="form-group"><label class="form-title-label" id="pauta-label">Tema da Reunião</label><textarea class="form-control ata-pauta" rows="3"></textarea><span class="error-message"></span></div>
        <div class="form-group gestao-field" style="display: none;"><label class="form-title-label">Pontos Discutidos</label><textarea class="form-control ata-pontos" rows="4"></textarea><span class="error-message"></span></div>
        <div class="form-group gestao-field" style="display: none;"><label class="form-title-label">Decisões</label><textarea class="form-control ata-decisoes" rows="4"></textarea><span class="error-message"></span></div>
        <div class="form-group gestao-field plano-de-acao" style="display: none;"><label class="form-title-label">Plano de Ação</label><div class="form-group"><label>Responsável</label><select id="plano-responsavel" class="form-control"><option value="">Selecione...</option></select></div><div class="form-group"><label>Descrição</label><textarea id="plano-descricao" class="form-control" rows="3"></textarea></div><div class="form-group"><label>Prazo</label><input type="date" id="plano-prazo" class="form-control"></div><button type="button" class="action-button add-activity-btn" id="add-activity">Adicionar Atividade</button><span id="activity-error-feedback" class="error-message" style="text-align:center;"></span><div id="lista-atividades"></div></div>
        <div class="form-group gestao-field" style="display: none;"><label class="form-title-label">Temas p/ Próxima Reunião</label><textarea class="form-control ata-temas-proxima" rows="3"></textarea><span class="error-message"></span></div>
        <div class="form-group gestao-field" style="display: none;"><label class="form-title-label">Data da Próxima Reunião</label><input type="datetime-local" class="form-control ata-proxima-reuniao"><span class="error-message"></span></div>
        <div id="form-status-message" class="status-message"></div>
        <div class="button-bar"><button type="button" class="action-button save-btn">Salvar Ata</button></div>
    `;

  populateGestorFields();
  setupEventListeners(container);
}

/**
 * Usa a lista de gestores em cache para preencher os campos relevantes.
 */
function populateGestorFields() {
  const container = document.getElementById("new-ata-card-container");
  if (!container || gestoresCache.length === 0) return;

  const gestorSelect = container.querySelector(".ata-nome-gestor");
  const responsavelSelect = container.querySelector("#plano-responsavel");
  const checkboxContainer = container.querySelector(
    ".participantes-checkbox-container"
  );

  const optionsHtml = gestoresCache
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("");
  const checkboxesHtml = gestoresCache
    .map(
      (name) =>
        `<div><label><input type="checkbox" class="participante-check" value="${name}"> ${name}</label></div>`
    )
    .join("");

  gestorSelect.innerHTML += optionsHtml;
  responsavelSelect.innerHTML += optionsHtml; // Popula todos os gestores aqui inicialmente
  checkboxContainer.innerHTML = checkboxesHtml;
}

function setupEventListeners(container) {
  container.addEventListener("change", (e) => {
    // Lógica para mostrar/esconder campos baseada no TIPO de reunião
    if (e.target.classList.contains("ata-tipo")) {
      const tipo = e.target.value;
      // ... (código para mostrar/esconder seções do formulário - sem alterações)
      // ... (Este bloco de código é longo, mas não precisa ser alterado)
      const pautaLabel = container.querySelector("#pauta-label");

      container
        .querySelectorAll(
          ".tecnica-field, .gestao-field, .gestor-select-field, .participantes-field"
        )
        .forEach((el) => (el.style.display = "none"));
      container
        .querySelectorAll(
          ".ata-participantes-input, .participantes-checkbox-container"
        )
        .forEach((el) => (el.style.display = "none"));

      if (tipo === "Reunião Técnica") {
        container
          .querySelectorAll(".tecnica-field")
          .forEach((el) => (el.style.display = "block"));
        container.querySelector(".duracao-field-container").style.display =
          "none";
        pautaLabel.textContent = "Tema da Reunião";
      } else {
        container
          .querySelectorAll(".gestao-field")
          .forEach((el) => (el.style.display = "block"));
        pautaLabel.textContent = "Pauta da Reunião";
        if (tipo === "Reunião Conselho administrativo") {
          container.querySelector(".participantes-field").style.display =
            "block";
          container.querySelector(
            ".participantes-checkbox-container"
          ).style.display = "grid";
        } else if (tipo === "Reunião com Gestor") {
          container.querySelector(".gestor-select-field").style.display =
            "block";
        } else if (tipo === "Outros") {
          container.querySelector(".participantes-field").style.display =
            "block";
          container.querySelector(".ata-participantes-input").style.display =
            "block";
        }
      }
    }

    // **NOVA LÓGICA:** Quando um gestor é selecionado em "Reunião com Gestor"
    if (e.target.classList.contains("ata-nome-gestor")) {
      const nomeGestorSelecionado = e.target.value;
      const responsavelPlanoAcao =
        container.querySelector("#plano-responsavel");

      if (nomeGestorSelecionado) {
        // Define o valor do dropdown do plano de ação para ser o mesmo gestor
        responsavelPlanoAcao.value = nomeGestorSelecionado;
      } else {
        // Se nenhum gestor for selecionado, reseta o dropdown do plano de ação
        responsavelPlanoAcao.value = "";
      }
    }
  });

  // O listener de 'click' não precisa de alterações na sua lógica principal
  container.addEventListener("click", async (e) => {
    // ... (código para adicionar atividade, remover atividade e salvar ata)
    // ... (Este bloco de código é longo, mas não precisa ser alterado)
    if (e.target.id === "add-activity") {
      const errorSpan = container.querySelector("#activity-error-feedback");
      const responsavel = container.querySelector("#plano-responsavel").value;
      const descricao = container.querySelector("#plano-descricao").value;
      const prazo = container.querySelector("#plano-prazo").value;
      if (responsavel && descricao && prazo) {
        atividadesPlanoAcao.push({
          responsavel,
          descricao,
          prazo,
          status: "A Fazer",
        });
        renderPlanoAcaoList();
        container.querySelector("#plano-descricao").value = "";
        container.querySelector("#plano-prazo").value = "";
        // Não reseta o responsável, pois pode ser o gestor selecionado
        // container.querySelector('#plano-responsavel').value = '';
        errorSpan.textContent = "";
      } else {
        errorSpan.textContent = "Preencha todos os campos da atividade.";
      }
    }
    if (e.target.classList.contains("remove-activity-btn")) {
      const index = parseInt(e.target.dataset.index, 10);
      atividadesPlanoAcao.splice(index, 1);
      renderPlanoAcaoList();
    }
    if (e.target.classList.contains("save-btn")) {
      await handleSaveAta(e.target, container);
    }
  });
}

// O restante das funções (renderPlanoAcaoList, handleSaveAta) permanecem as mesmas.
// ... (cole o restante do seu código de ata-de-reuniao.js aqui)

function renderPlanoAcaoList() {
  const lista = document.getElementById("lista-atividades");
  if (!lista) return;
  lista.innerHTML = atividadesPlanoAcao
    .map((atividade, index) => {
      const prazo = new Date(atividade.prazo).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      });
      return `<div class="atividade-item"><span><strong>${atividade.responsavel}:</strong> ${atividade.descricao} (Prazo: ${prazo})</span><button type="button" class="remove-activity-btn" data-index="${index}">X</button></div>`;
    })
    .join("");
}

async function handleSaveAta(saveButton, form) {
  const originalButtonText = saveButton.textContent;
  const statusBox = form.querySelector("#form-status-message");
  statusBox.style.display = "none";
  let hasErrors = false;

  form
    .querySelectorAll(".error-message")
    .forEach((span) => (span.textContent = ""));
  const validate = (selector, condition, message = "Campo obrigatório.") => {
    const element = form.querySelector(selector);
    const formGroup = element.closest(".form-group");
    if (
      condition &&
      formGroup &&
      getComputedStyle(formGroup).display !== "none"
    ) {
      formGroup.querySelector(".error-message").textContent = message;
      hasErrors = true;
    }
  };

  const tipo = form.querySelector(".ata-tipo").value;
  validate(".ata-tipo", !tipo);
  validate(".ata-date", !form.querySelector(".ata-date").value);
  validate(".ata-start-time", !form.querySelector(".ata-start-time").value);
  validate(".ata-end-time", !form.querySelector(".ata-end-time").value);
  validate(".ata-pauta", !form.querySelector(".ata-pauta").value);

  if (tipo === "Reunião Técnica") {
    validate(
      ".ata-responsavel-tecnica",
      !form.querySelector(".ata-responsavel-tecnica").value
    );
  } else if (tipo) {
    validate(".ata-pontos", !form.querySelector(".ata-pontos").value);
    validate(".ata-decisoes", !form.querySelector(".ata-decisoes").value);
    if (tipo === "Reunião Conselho administrativo") {
      validate(
        ".participantes-checkbox-container",
        form.querySelectorAll(".participante-check:checked").length === 0,
        "Selecione pelo menos um participante."
      );
    } else if (tipo === "Reunião com Gestor") {
      validate(
        ".ata-nome-gestor",
        !form.querySelector(".ata-nome-gestor").value
      );
    } else if (tipo === "Outros") {
      validate(
        ".ata-participantes-input",
        !form.querySelector(".ata-participantes-input").value
      );
    }
  }

  if (hasErrors) {
    statusBox.textContent = "Por favor, preencha todos os campos obrigatórios.";
    statusBox.className = "alert alert-danger";
    statusBox.style.display = "block";
    return;
  }

  saveButton.textContent = "Gerando Documento...";
  saveButton.disabled = true;

  let participantes = "",
    nomeGestor = "";
  if (tipo === "Reunião Conselho administrativo")
    participantes = Array.from(
      form.querySelectorAll(".participante-check:checked")
    )
      .map((cb) => cb.value)
      .join(", ");
  else if (tipo === "Reunião com Gestor") {
    nomeGestor = form.querySelector(".ata-nome-gestor").value;
    participantes = nomeGestor;
  } else if (tipo === "Outros")
    participantes = form.querySelector(".ata-participantes-input").value;

  let duracaoFinal;
  if (tipo === "Reunião Técnica") {
    const inicio = new Date(
      `1970-01-01T${form.querySelector(".ata-start-time").value}`
    );
    const fim = new Date(
      `1970-01-01T${form.querySelector(".ata-end-time").value}`
    );
    duracaoFinal = (fim - inicio) / 60000 + 60;
  } else {
    duracaoFinal = form.querySelector(".ata-duracao").value;
  }

  const dataToSave = {
    tipo,
    nomeGestor,
    participantes,
    dataReuniao: form.querySelector(".ata-date").value,
    horaInicio: form.querySelector(".ata-start-time").value,
    horaFim: form.querySelector(".ata-end-time").value,
    duracao: duracaoFinal,
    pauta: form.querySelector(".ata-pauta").value,
    responsavelTecnica: form.querySelector(".ata-responsavel-tecnica").value,
    pontos: form.querySelector(".ata-pontos").value,
    decisoes: form.querySelector(".ata-decisoes").value,
    planoDeAcao: atividadesPlanoAcao,
    temasProximaReuniao: form.querySelector(".ata-temas-proxima").value,
    proximaReuniao: form.querySelector(".ata-proxima-reuniao").value,
  };

  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(dataToSave),
      mode: "no-cors",
    });

    console.warn(
      "[ATA] Enviado para Apps Script. Aguardando URL do PDF ser salva separadamente se a integração estiver configurada."
    );

    saveButton.textContent = "Salvando dados...";

    // Salva os dados no Realtime Database
    const newAtaRef = push(dbRef(getDatabase(), "gestao/atas"));
    await set(newAtaRef, dataToSave);

    form.innerHTML = `<div class="alert alert-success"><h2>Ata Salva com Sucesso!</h2><p>O documento foi salvo e o registro guardado.</p></div><br><button class="action-button" style="background-color:#007bff;" id="register-new-ata">Registrar Nova Ata</button>`;
    form
      .querySelector("#register-new-ata")
      .addEventListener("click", createNewAtaForm);
  } catch (error) {
    statusBox.textContent = "Falha ao salvar: " + error.message;
    statusBox.className = "alert alert-danger";
    statusBox.style.display = "block";
    saveButton.textContent = originalButtonText;
    saveButton.disabled = false;
  }
}
