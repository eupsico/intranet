// Arquivo: /modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 3.2 (Implementa configuração de regras de movimentação pelo admin)

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
let movementRules = {}; // Armazena as regras de movimentação

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

    await loadMovementRules();
    setupColumns();
    setupAllModalControls();
    setupEventListeners();
    setupAdminControls(); // Mostra controles de admin se aplicável
    loadAndRenderCards();
  } catch (error) {
    console.error("Erro ao inicializar o Kanban:", error);
    container.innerHTML = `<div class="error-message">Erro ao carregar o Kanban.</div>`;
  }
}

async function loadMovementRules() {
  try {
    const doc = await db.collection("config").doc("trilhaRules").get();
    if (doc.exists) {
      movementRules = doc.data();
      console.log("Regras de movimentação carregadas:", movementRules);
    } else {
      console.warn(
        "Nenhuma regra de movimentação encontrada. Usando padrão (mover para etapa anterior)."
      );
      // Define uma regra padrão se nenhuma existir
      movementRules = currentColumnFilter.reduce((acc, status, index) => {
        if (index > 0) {
          acc[status] = [currentColumnFilter[index - 1]];
        }
        return acc;
      }, {});
    }
  } catch (error) {
    console.error("Erro ao carregar regras de movimentação:", error);
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

  // Modal de Configuração
  const configModal = document.getElementById("config-modal");
  document
    .getElementById("close-config-modal-btn")
    .addEventListener("click", () => (configModal.style.display = "none"));
  configModal.addEventListener("click", (e) => {
    if (e.target === configModal) configModal.style.display = "none";
  });

  // Modal de Mover para Trás
  const moveBackModal = document.getElementById("move-back-modal");
  document
    .getElementById("close-move-back-modal-btn")
    .addEventListener("click", () => (moveBackModal.style.display = "none"));
  document
    .getElementById("cancel-move-back-btn")
    .addEventListener("click", () => (moveBackModal.style.display = "none"));
  moveBackModal.addEventListener("click", (e) => {
    if (e.target === moveBackModal) moveBackModal.style.display = "none";
  });
  document
    .getElementById("confirm-move-back-btn")
    .addEventListener("click", confirmMoveBack);
}

function setupAdminControls() {
  if (currentUserData.funcoes?.includes("admin")) {
    const container = document.getElementById("kanban-config-button-container");
    if (!container) return;

    const configButton = document.createElement("button");
    configButton.id = "config-kanban-btn";
    configButton.className = "action-button";
    configButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Configurar Trilha`;
    configButton.addEventListener("click", openConfigModal);
    container.appendChild(configButton);
  }
}

async function openConfigModal() {
  const modal = document.getElementById("config-modal");
  const container = document.getElementById("config-rules-container");
  container.innerHTML = '<div class="loading-spinner"></div>';
  modal.style.display = "flex";

  let html = "";
  currentColumnFilter.forEach((fromStatus, index) => {
    if (index === 0) return; // Não pode mover para trás da primeira coluna

    const possibleDestinations = currentColumnFilter.slice(0, index);
    const allowedDestinations = movementRules[fromStatus] || [];

    html += `
            <div class="config-rule-row">
                <div class="config-rule-label">A partir de <strong>${
                  COLUMNS_CONFIG[fromStatus]
                }</strong>, pode retornar para:</div>
                <div class="config-rule-options">
                    <select multiple class="form-control" data-from-status="${fromStatus}">
                        ${possibleDestinations
                          .map(
                            (toStatus) => `
                            <option value="${toStatus}" ${
                              allowedDestinations.includes(toStatus)
                                ? "selected"
                                : ""
                            }>
                                ${COLUMNS_CONFIG[toStatus]}
                            </option>
                        `
                          )
                          .join("")}
                    </select>
                </div>
            </div>
        `;
  });

  container.innerHTML = html;
  container.querySelectorAll("select[multiple]").forEach((select) => {
    select.addEventListener("change", async (event) => {
      const fromStatus = event.target.dataset.fromStatus;
      const selectedOptions = Array.from(event.target.selectedOptions).map(
        (opt) => opt.value
      );
      movementRules[fromStatus] = selectedOptions;
      try {
        await db
          .collection("config")
          .doc("trilhaRules")
          .set(movementRules, { merge: true });
        console.log(`Regras para '${fromStatus}' atualizadas.`);
        loadAndRenderCards(); // Re-renderiza para mostrar/ocultar setas
      } catch (error) {
        console.error("Erro ao salvar regra:", error);
        alert("Falha ao salvar a regra. Tente novamente.");
      }
    });
  });
}

function setupEventListeners() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;

  kanbanBoard.addEventListener("click", (event) => {
    const cardElement = event.target.closest(".kanban-card");
    if (!cardElement) return;

    const actionElement = event.target.closest("[data-action]");

    if (actionElement) {
      const action = actionElement.dataset.action;
      const cardId = cardElement.dataset.id;

      if (action === "move-back") {
        openMoveBackModal(cardId);
      }
    } else {
      const cardId = cardElement.dataset.id;
      openCardModal(cardId);
    }
  });
}

function openMoveBackModal(cardId) {
  const cardData = allCardsData[cardId];
  if (!cardData) return;

  const allowedDestinations = movementRules[cardData.status] || [];

  const modal = document.getElementById("move-back-modal");
  const select = document.getElementById("move-back-stage-select");

  document.getElementById("move-back-patient-name").textContent =
    cardData.nomeCompleto;
  document.getElementById("move-back-card-id").value = cardId;

  select.innerHTML = '<option value="">Selecione uma etapa...</option>';
  allowedDestinations.forEach((statusKey) => {
    select.innerHTML += `<option value="${statusKey}">${COLUMNS_CONFIG[statusKey]}</option>`;
  });

  modal.style.display = "flex";
}

async function confirmMoveBack() {
  const cardId = document.getElementById("move-back-card-id").value;
  const newStatus = document.getElementById("move-back-stage-select").value;

  if (!cardId || !newStatus) {
    alert("Por favor, selecione uma etapa de destino.");
    return;
  }

  const button = document.getElementById("confirm-move-back-btn");
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
    console.log(
      `Paciente ${cardId} movido para ${newStatus} por ${currentUserData.nome}`
    );
    document.getElementById("move-back-modal").style.display = "none";
  } catch (error) {
    console.error("Erro ao mover o card:", error);
    alert("Ocorreu um erro ao tentar mover o paciente.");
  } finally {
    button.disabled = false;
    button.textContent = "Confirmar Retorno";
  }
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

  const allowedMoves = movementRules[cardData.status] || [];
  const canMoveBack = allowedMoves.length > 0;

  const moveBackIcon = `
    <div class="card-actions">
        <span class="action-icon" data-action="move-back" title="Retornar para etapa anterior">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        </span>
    </div>`;

  card.innerHTML = `
      <div class="card-content">
        <p class="card-patient-name">${
          cardData.nomeCompleto || "Nome não informado"
        }</p>
        <p class="card-patient-cpf">CPF: ${cardData.cpf || "Não informado"}</p>
      </div>
      ${canMoveBack ? moveBackIcon : ""}`;
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

  modalTitle.textContent = `Detalhes: ${cardData.nomeCompleto}`;
  modal.style.display = "flex";
  modalBody.innerHTML = '<div class="loading-spinner"></div>';
  saveButton.style.display = "inline-block";

  try {
    const stage = cardData.status;
    const stageModule = await import(
      `./stages/${stage}.js?v=${new Date().getTime()}`
    );
    const contentElement = await stageModule.render(
      cardId,
      cardData.nomeCompleto,
      cardData
    );
    modalBody.innerHTML = "";
    modalBody.appendChild(contentElement);

    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);

    if (typeof stageModule.save === "function") {
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
