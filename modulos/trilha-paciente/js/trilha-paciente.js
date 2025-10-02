// Arquivo: /modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 3.0 (Estrutura de Módulos Padronizada)

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

export async function init(
  firestoreDb,
  authUser,
  authData,
  container,
  columnFilter
) {
  currentColumnFilter = columnFilter;

  try {
    const response = await fetch("../page/trilha-paciente.html");
    if (!response.ok) throw new Error("Falha ao carregar o HTML da trilha.");
    container.innerHTML = await response.text();

    setupColumns();
    setupModalControls();
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
  card.innerHTML = `
        <p class="card-patient-name">${
          cardData.nomeCompleto || "Nome não informado"
        }</p>
        <p class="card-patient-cpf">CPF: ${cardData.cpf || "Não informado"}</p>
    `;
  card.addEventListener("click", () => openCardModal(cardData.id));
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
    const stageModule = await import(`./stages/${stage}.js`);

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
          await stageModule.save(cardId);
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
