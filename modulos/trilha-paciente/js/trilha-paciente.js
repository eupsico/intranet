// Arquivo: /modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 3.1 (Adiciona funcionalidade de mover card para a etapa anterior)

import { db } from "../../../assets/js/firebase-init.js";

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
let currentUserData = {}; // Armazena dados do usuário logado

export async function init(
  firestoreDb,
  authUser,
  authData,
  container,
  columnFilter
) {
  currentColumnFilter = columnFilter;
  currentUserData = authData; // Salva os dados do usuário para logs

  try {
    const response = await fetch("../page/trilha-paciente.html");
    if (!response.ok) throw new Error("Falha ao carregar o HTML da trilha.");
    container.innerHTML = await response.text();

    setupColumns();
    setupModalControls();
    setupEventListeners(); // <-- NOVO: Centraliza os event listeners
    loadAndRenderCards();
  } catch (error) {
    console.error("Erro ao inicializar o Kanban:", error);
    container.innerHTML = `<div class="error-message">Erro ao carregar o Kanban.</div>`;
  }
}

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
        </div>
    `
    )
    .join("");
}

function setupModalControls() {
  const modal = document.getElementById("card-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelModalBtn = document.getElementById("modal-cancel-btn");

  const closeModal = () => {
    modal.style.display = "none";
    document.getElementById("card-modal-body").innerHTML =
      '<div class="loading-spinner"></div>';
  };

  closeModalBtn.addEventListener("click", closeModal);
  cancelModalBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
}

// NOVO: Função para centralizar os event listeners, usando delegação de eventos
function setupEventListeners() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;

  kanbanBoard.addEventListener("click", (event) => {
    const cardElement = event.target.closest(".kanban-card");
    if (!cardElement) return;

    const actionElement = event.target.closest("[data-action]");

    if (actionElement) {
      // Se um elemento de ação (como o botão de voltar) foi clicado
      const action = actionElement.dataset.action;
      const cardId = cardElement.dataset.id;

      if (action === "move-back") {
        handleMoveBack(cardId);
      }
    } else {
      // Se o corpo do card foi clicado (e não um botão de ação)
      const cardId = cardElement.dataset.id;
      openCardModal(cardId);
    }
  });
}

async function handleMoveBack(cardId) {
  const cardData = allCardsData[cardId];
  if (!cardData) {
    console.error("Dados do card não encontrados para mover.");
    return;
  }

  const currentStatusIndex = currentColumnFilter.indexOf(cardData.status);

  if (currentStatusIndex > 0) {
    const previousStatus = currentColumnFilter[currentStatusIndex - 1];
    const previousStatusName = COLUMNS_CONFIG[previousStatus] || previousStatus;

    if (
      confirm(
        `Tem certeza que deseja retornar o paciente "${cardData.nomeCompleto}" para a etapa "${previousStatusName}"?`
      )
    ) {
      try {
        await db
          .collection("trilhaPaciente")
          .doc(cardId)
          .update({
            status: previousStatus,
            lastUpdate: new Date(),
            lastUpdatedBy: currentUserData.nome || "N/A",
          });
        console.log(
          `Paciente ${cardId} movido para ${previousStatus} por ${currentUserData.nome}`
        );
      } catch (error) {
        console.error("Erro ao mover o card:", error);
        alert("Ocorreu um erro ao tentar mover o paciente. Tente novamente.");
      }
    }
  }
}

function loadAndRenderCards() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;

  db.collection("trilhaPaciente").onSnapshot(
    (snapshot) => {
      document
        .querySelectorAll(".kanban-cards-container")
        .forEach((container) => (container.innerHTML = ""));
      allCardsData = {};

      snapshot.forEach((doc) => {
        const cardData = {
          id: doc.id,
          ...doc.data(),
        };
        allCardsData[cardData.id] = cardData;

        if (currentColumnFilter.includes(cardData.status)) {
          const cardElement = createCardElement(cardData);
          const container = document.getElementById(`cards-${cardData.status}`);
          if (container) container.appendChild(cardElement);
        }
      });
      updateColumnCounts();
    },
    (error) => {
      console.error("Erro ao buscar cards:", error);
      kanbanBoard.innerHTML = `<div class="error-message">Não foi possível carregar os dados.</div>`;
    }
  );
}

function createCardElement(cardData) {
  const card = document.createElement("div");
  card.className = "kanban-card";
  card.dataset.id = cardData.id;

  // Verifica se o card pode ser movido para trás
  const currentStatusIndex = currentColumnFilter.indexOf(cardData.status);
  const canMoveBack = currentStatusIndex > 0;

  // Ícone de seta para voltar
  const moveBackIcon = `
    <div class="card-actions">
        <span class="action-icon" data-action="move-back" title="Retornar para etapa anterior">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        </span>
    </div>
  `;

  card.innerHTML = `
      <div class="card-content">
        <p class="card-patient-name">${
          cardData.nomeCompleto || "Nome não informado"
        }</p>
        <p class="card-patient-cpf">CPF: ${cardData.cpf || "Não informado"}</p>
      </div>
      ${canMoveBack ? moveBackIcon : ""}
    `;
  return card;
}

function updateColumnCounts() {
  currentColumnFilter.forEach((statusKey) => {
    const container = document.getElementById(`cards-${statusKey}`);
    const countElement = document.getElementById(`count-${statusKey}`);
    if (container && countElement) {
      countElement.textContent = container.children.length;
    }
  });
}

async function openCardModal(cardId) {
  const modal = document.getElementById("card-modal");
  const modalTitle = document.getElementById("card-modal-title");
  const modalBody = document.getElementById("card-modal-body");
  const saveButton = document.getElementById("modal-save-btn");
  const cardData = allCardsData[cardId];

  if (!cardData) return;

  modalTitle.textContent = `Detalhes do Paciente: ${cardData.nomeCompleto}`;
  modal.style.display = "flex";
  modalBody.innerHTML = '<div class="loading-spinner"></div>';
  saveButton.style.display = "inline-block";

  try {
    const stage = cardData.status;
    // Adiciona um sufixo para evitar cache do navegador ao carregar módulos
    const stageModule = await import(
      `./stages/${stage}.js?v=${new Date().getTime()}`
    );

    // Chama a função render e insere o conteúdo no modal
    const contentElement = await stageModule.render(
      cardId,
      cardData.nomeCompleto
    );
    modalBody.innerHTML = "";
    modalBody.appendChild(contentElement);

    // Clona o botão Salvar para remover listeners antigos e adiciona o novo
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);

    if (typeof stageModule.save === "function") {
      newSaveButton.addEventListener("click", async () => {
        newSaveButton.disabled = true;
        newSaveButton.textContent = "Salvando...";
        try {
          // Passa os dados do usuário para a função save
          await stageModule.save(cardId, currentUserData);
          modal.style.display = "none";
          // A atualização dos cards é automática pelo onSnapshot
        } catch (error) {
          console.error("Erro ao salvar:", error);
          alert("Erro ao salvar: " + error.message);
        } finally {
          newSaveButton.disabled = false;
          newSaveButton.textContent = "Salvar";
        }
      });
    } else {
      // Se não houver função save, esconde o botão
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
