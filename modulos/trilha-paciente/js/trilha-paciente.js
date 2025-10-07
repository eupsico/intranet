// Arquivo: /modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 9.0 (Migração para a sintaxe modular do Firebase v9)

// 1. Importa todas as funções necessárias do nosso arquivo de configuração central
import {
  db,
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
} from "../../../assets/js/firebase-init.js";

const COLUMNS_CONFIG = {
  inscricao_documentos: "Inscrição e Documentos",
  triagem_agendada: "Triagem Agendada",
  encaminhar_para_plantao: "Encaminhar para Plantão",
  em_atendimento_plantao: "Em Atendimento (Plantão)",
  agendamento_confirmado_plantao: "Agendamento Confirmado (Plantão)",
  encaminhar_para_pb: "Encaminhar para PB",
  aguardando_info_horarios: "Aguardando Info Horários",
  cadastrar_horario_psicomanager: "Cadastrar Horário Psicomanager",
  em_atendimento_pb: "Em Atendimento (PB)",
  pacientes_parcerias: "Pacientes Parcerias",
  grupos: "Grupos",
  desistencia: "Desistência",
  alta: "Alta",
};

let allCardsData = {};
let currentColumnFilter = [];
let currentUserData = {};
let unsubscribe; // Variável para guardar a função de 'unsubscribe' do listener do Firestore

/**
 * Inicializa o painel Kanban.
 * @param {object} authUser - O objeto do usuário autenticado.
 * @param {object} authData - Os dados do usuário do Firestore.
 * @param {HTMLElement} container - O elemento container onde o painel será renderizado.
 * @param {string[]} columnFilter - A lista de status a serem exibidos como colunas.
 */
export async function init(db, authUser, authData, container, columnFilter) {
  currentColumnFilter = columnFilter;
  currentUserData = authData;

  // Cancela qualquer listener anterior para evitar múltiplas execuções
  if (unsubscribe) {
    unsubscribe();
  }

  try {
    const response = await fetch("../page/trilha-paciente.html");
    if (!response.ok) throw new Error("Falha ao carregar o HTML da trilha.");
    container.innerHTML = await response.text();

    setupColumns();
    setupAllModalControls();
    setupEventListeners();
    loadAndRenderCards();
  } catch (error) {
    console.error("Erro ao inicializar o Kanban:", error);
    container.innerHTML = `<div class="error-message">Erro ao carregar o Kanban.</div>`;
  }
}

/**
 * Constrói as colunas do Kanban no DOM.
 */
function setupColumns() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;
  kanbanBoard.innerHTML = currentColumnFilter
    .map(
      (statusKey) => `
        <div class="kanban-column" id="column-${statusKey}" data-status="${statusKey}">
            <div class="kanban-column-header">
                <h3 class="kanban-column-title">
                    ${COLUMNS_CONFIG[statusKey] || statusKey}
                    <span class="kanban-column-count" id="count-${statusKey}">0</span>
                </h3>
            </div>
            <div class="kanban-cards-container" id="cards-${statusKey}"></div>
        </div>`
    )
    .join("");
}

/**
 * Configura o listener em tempo real (onSnapshot) para carregar e atualizar os cards.
 */
function loadAndRenderCards() {
  // Cria a referência para a coleção
  const trilhaRef = collection(db, "trilhaPaciente");

  // Cria a consulta (query) para buscar apenas os documentos com os status visíveis
  const q = query(trilhaRef, where("status", "in", currentColumnFilter));

  // Inicia o listener em tempo real e guarda a função de 'unsubscribe'
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      // Limpa os cards de todas as colunas
      document
        .querySelectorAll(".kanban-cards-container")
        .forEach((c) => (c.innerHTML = ""));
      allCardsData = {};

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        allCardsData[data.id] = data;

        const cardElement = createCardElement(data);
        const container = document.getElementById(`cards-${data.status}`);
        if (container) {
          container.appendChild(cardElement);
        }
      });

      updateColumnCounts();
    },
    (error) => {
      console.error("Erro ao buscar cards em tempo real:", error);
    }
  );
}

/**
 * Cria o elemento HTML para um card do Kanban.
 * @param {object} cardData - Os dados do paciente para o card.
 * @returns {HTMLElement} O elemento <div> do card.
 */
function createCardElement(cardData) {
  const card = document.createElement("div");
  card.className = "kanban-card";
  card.dataset.id = cardData.id;
  card.innerHTML = `
  <p class="card-patient-name">${
    cardData.nomeCompleto || "Nome não informado"
  }</p>
  <p class="card-patient-cpf">CPF: ${cardData.cpf || "Não informado"}</p>`;
  return card;
}

/**
 * Atualiza a contagem de cards em cada cabeçalho de coluna.
 */
function updateColumnCounts() {
  currentColumnFilter.forEach((statusKey) => {
    const countEl = document.getElementById(`count-${statusKey}`);
    const container = document.getElementById(`cards-${statusKey}`);
    if (countEl && container) {
      countEl.textContent = container.children.length;
    }
  });
}

/**
 * Configura os controles de todos os modais da página (fechar, cancelar, etc.).
 */
function setupAllModalControls() {
  // Modal Principal de Detalhes
  const cardModal = document.getElementById("card-modal");
  document
    .getElementById("close-modal-btn")
    .addEventListener("click", () => (cardModal.style.display = "none"));
  document
    .getElementById("modal-cancel-btn")
    .addEventListener("click", () => (cardModal.style.display = "none"));
  cardModal.addEventListener("click", (e) => {
    if (e.target === cardModal) cardModal.style.display = "none";
  }); // Modal de Mover Card

  const moveModal = document.getElementById("move-card-modal");
  document
    .getElementById("close-move-card-modal-btn")
    .addEventListener("click", () => (moveModal.style.display = "none"));
  document
    .getElementById("cancel-move-btn")
    .addEventListener("click", () => (moveModal.style.display = "none"));
  moveModal.addEventListener("click", (e) => {
    if (e.target === moveModal) moveModal.style.display = "none";
  });
  document
    .getElementById("confirm-move-btn")
    .addEventListener("click", confirmMove);
}

/**
 * Configura o evento de clique para abrir os detalhes de um card.
 */
function setupEventListeners() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;

  kanbanBoard.addEventListener("click", (event) => {
    const cardElement = event.target.closest(".kanban-card");
    if (cardElement) {
      const cardId = cardElement.dataset.id;
      openCardModal(cardId);
    }
  });
}

// ----- LÓGICA DE MOVIMENTAÇÃO DE CARD -----

function openMoveModal(cardId, cardData) {
  const moveModal = document.getElementById("move-card-modal");
  const select = document.getElementById("move-card-stage-select");

  document.getElementById("move-card-patient-name").textContent =
    cardData.nomeCompleto;
  document.getElementById("move-card-id").value = cardId;

  select.innerHTML = ""; // Limpa opções antigas
  for (const key in COLUMNS_CONFIG) {
    if (key !== cardData.status) {
      select.innerHTML += `<option value="${key}">${COLUMNS_CONFIG[key]}</option>`;
    }
  }

  document.getElementById("card-modal").style.display = "none";
  moveModal.style.display = "flex";
}

async function confirmMove() {
  const cardId = document.getElementById("move-card-id").value;
  const newStatus = document.getElementById("move-card-stage-select").value;

  if (!cardId || !newStatus) {
    alert("Seleção inválida.");
    return;
  }

  const button = document.getElementById("confirm-move-btn");
  button.disabled = true;
  button.textContent = "Movendo...";

  try {
    // Sintaxe v9 para atualizar o documento
    const cardRef = doc(db, "trilhaPaciente", cardId);
    await updateDoc(cardRef, {
      status: newStatus,
      lastUpdate: new Date(),
      lastUpdatedBy: currentUserData.nome || "N/A",
    });
    document.getElementById("move-card-modal").style.display = "none";
  } catch (error) {
    console.error("Erro ao mover o card:", error);
    alert("Ocorreu um erro ao tentar mover o paciente.");
  } finally {
    button.disabled = false;
    button.textContent = "Confirmar Movimentação";
  }
}

// ----- LÓGICA DO MODAL DE DETALHES DO CARD -----

async function openCardModal(cardId) {
  const modal = document.getElementById("card-modal");
  const modalTitle = document.getElementById("card-modal-title");
  const modalBody = document.getElementById("card-modal-body");
  const saveButton = document.getElementById("modal-save-btn");
  const moveButton = document.getElementById("modal-move-btn");
  const cardData = allCardsData[cardId];

  if (!cardData) return;

  modalTitle.textContent = `Detalhes: ${cardData.nomeCompleto}`;
  modal.style.display = "flex";
  modalBody.innerHTML = '<div class="loading-spinner"></div>';
  saveButton.style.display = "inline-block";
  moveButton.style.display = "inline-block"; // Clona e substitui o botão para remover listeners antigos

  const newMoveButton = moveButton.cloneNode(true);
  moveButton.parentNode.replaceChild(newMoveButton, moveButton);
  newMoveButton.addEventListener("click", () =>
    openMoveModal(cardId, cardData)
  );

  try {
    const stage = cardData.status; // Carrega o módulo JS da etapa específica
    const stageModule = await import(
      `./stages/${stage}.js?v=${new Date().getTime()}`
    );

    const contentElement = await stageModule.render(
      cardId,
      cardData,
      currentUserData
    );
    modalBody.innerHTML = "";
    modalBody.appendChild(contentElement);

    // Clona e substitui o botão de salvar para remover listeners antigos
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);

    if (typeof stageModule.save === "function") {
      newSaveButton.style.display = "inline-block";
      newSaveButton.addEventListener("click", async () => {
        newSaveButton.disabled = true;
        newSaveButton.textContent = "Salvando...";
        try {
          // Passa o corpo do modal para a função save, se ela precisar acessar os inputs
          await stageModule.save(cardId, cardData, modalBody);
          modal.style.display = "none";
        } catch (error) {
          console.error("Erro ao salvar:", error);
          alert("Erro ao salvar: " + error.message);
        } finally {
          newSaveButton.disabled = false;
          newSaveButton.textContent = "Salvar";
        }
      });
    } else {
      newSaveButton.style.display = "none";
    }
  } catch (error) {
    console.error(
      `Erro ao carregar o módulo para a etapa ${cardData.status}:`,
      error
    );
    modalBody.innerHTML = `<div class="error-message">Não foi possível carregar os detalhes desta etapa.</div>`;
    saveButton.style.display = "none";
  }
}
