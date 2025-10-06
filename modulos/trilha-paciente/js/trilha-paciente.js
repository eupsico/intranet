// Arquivo: /modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 3.4 (Passa dados do usuário para a função render)

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
let currentUserData = {};

export async function init(
  firestoreDb,
  authUser,
  authData,
  container,
  columnFilter
) {
  currentColumnFilter = columnFilter;
  currentUserData = authData;

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

function setupAllModalControls() {
  // Modal Principal
  const cardModal = document.getElementById("card-modal");
  document
    .getElementById("close-modal-btn")
    .addEventListener("click", () => (cardModal.style.display = "none"));
  document
    .getElementById("modal-cancel-btn")
    .addEventListener("click", () => (cardModal.style.display = "none"));
  cardModal.addEventListener("click", (e) => {
    if (e.target === cardModal) cardModal.style.display = "none";
  });

  // Modal de Mover
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

function loadAndRenderCards() {
  db.collection("trilhaPaciente").onSnapshot(
    (snapshot) => {
      document
        .querySelectorAll(".kanban-cards-container")
        .forEach((c) => (c.innerHTML = ""));
      allCardsData = {};
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        allCardsData[data.id] = data;
        if (currentColumnFilter.includes(data.status)) {
          const cardElement = createCardElement(data);
          const container = document.getElementById(`cards-${data.status}`);
          if (container) container.appendChild(cardElement);
        }
      });
      updateColumnCounts();
    },
    (error) => {
      console.error("Erro ao buscar cards:", error);
    }
  );
}

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

function updateColumnCounts() {
  currentColumnFilter.forEach((statusKey) => {
    const countEl = document.getElementById(`count-${statusKey}`);
    const container = document.getElementById(`cards-${statusKey}`);
    if (countEl && container) {
      countEl.textContent = container.children.length;
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
    // Não adiciona a etapa atual na lista de opções
    if (key !== cardData.status) {
      select.innerHTML += `<option value="${key}">${COLUMNS_CONFIG[key]}</option>`;
    }
  }

  // Esconde o modal principal e exibe o modal de mover
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
    await db
      .collection("trilhaPaciente")
      .doc(cardId)
      .update({
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
// ----- FIM DA LÓGICA DE MOVIMENTAÇÃO -----

async function openCardModal(cardId) {
  const modal = document.getElementById("card-modal");
  const modalTitle = document.getElementById("card-modal-title");
  const modalBody = document.getElementById("card-modal-body");
  const saveButton = document.getElementById("modal-save-btn");
  const moveButton = document.getElementById("modal-move-btn"); // Botão "Mover"
  const cardData = allCardsData[cardId];
  if (!cardData) return;

  modalTitle.textContent = `Detalhes: ${cardData.nomeCompleto}`;
  modal.style.display = "flex";
  modalBody.innerHTML = '<div class="loading-spinner"></div>';
  saveButton.style.display = "inline-block";
  moveButton.style.display = "inline-block"; // Garante que o botão Mover apareça

  // Remove listeners antigos do botão "Mover" e adiciona o novo
  const newMoveButton = moveButton.cloneNode(true);
  moveButton.parentNode.replaceChild(newMoveButton, moveButton);
  newMoveButton.addEventListener("click", () =>
    openMoveModal(cardId, cardData)
  );

  try {
    const stage = cardData.status;
    const stageModule = await import(
      `./stages/${stage}.js?v=${new Date().getTime()}`
    );

    // ***** ALTERAÇÃO APLICADA AQUI *****
    // Agora passamos os dados do usuário logado (currentUserData) para a função render.
    const contentElement = await stageModule.render(
      cardId,
      cardData,
      currentUserData
    );
    modalBody.innerHTML = "";
    modalBody.appendChild(contentElement);

    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);

    if (typeof stageModule.save === "function") {
      newSaveButton.style.display = "inline-block";
      newSaveButton.addEventListener("click", async () => {
        newSaveButton.disabled = true;
        newSaveButton.textContent = "Salvando...";
        try {
          await stageModule.save(cardId, currentUserData);
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
