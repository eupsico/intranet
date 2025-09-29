// Mapeamento dos status para os títulos das colunas
const COLUMNS_CONFIG = {
  inscricao_documentos: "1. Inscrição e Documentos",
  triagem_agendada: "2. Triagem Agendada",
  encaminhar_para_plantao: "3. Encaminhar para Plantão",
  em_atendimento_plantao: "4. Em Atendimento (Plantão)",
  encaminhar_para_pb: "5. Encaminhar para PB",
  aguardando_info_horarios: "6. Aguardando Info Horários",
  cadastrar_horario_psicomanager: "7. Cadastrar Horário Psicomanager",
  em_atendimento_pb: "8. Em Atendimento (PB)",
  pacientes_parcerias: "9. Pacientes Parcerias",
  grupos: "10. Grupos",
  desistencia: "11. Desistência",
  alta: "12. Alta",
};

let db; // Instância do Firestore
let allCardsData = {}; // Cache para os dados dos cards

/**
 * Função de inicialização do módulo, chamada pelo app.js
 * @param {object} firestoreDb - Instância do Firestore
 * @param {object} user - Dados do usuário autenticado
 * @param {object} userData - Dados do perfil do usuário
 */
export async function init(firestoreDb, user, userData) {
  db = firestoreDb;
  const contentArea = document.getElementById("content-area");

  try {
    // Carrega o HTML do quadro Kanban
    const response = await fetch("../page/trilha-paciente.html");
    if (!response.ok) throw new Error("Falha ao carregar o HTML da trilha.");
    contentArea.innerHTML = await response.text();

    setupColumns();
    setupModalControls();
    loadAndRenderCards();
  } catch (error) {
    console.error("Erro ao inicializar a Trilha do Paciente:", error);
    contentArea.innerHTML = `<div class="error-message">Erro ao carregar a Trilha do Paciente. Tente recarregar a página.</div>`;
  }
}

/**
 * Cria as colunas do Kanban no DOM com base na configuração.
 */
function setupColumns() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;

  kanbanBoard.innerHTML = Object.keys(COLUMNS_CONFIG)
    .map(
      (statusKey) => `
        <div class="kanban-column" id="column-${statusKey}" data-status="${statusKey}">
            <div class="kanban-column-header">
                <h3 class="kanban-column-title">
                    ${COLUMNS_CONFIG[statusKey]}
                    <span class="kanban-column-count" id="count-${statusKey}">0</span>
                </h3>
            </div>
            <div class="kanban-cards-container" id="cards-${statusKey}"></div>
        </div>
    `
    )
    .join("");
}

/**
 * Configura os botões e eventos do modal.
 */
function setupModalControls() {
  const modal = document.getElementById("card-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelModalBtn = document.getElementById("modal-cancel-btn");

  const closeModal = () => {
    modal.style.display = "none";
    document.getElementById("card-modal-body").innerHTML =
      '<div class="loading-spinner"></div>'; // Limpa o conteúdo
  };

  closeModalBtn.addEventListener("click", closeModal);
  cancelModalBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
}

/**
 * Carrega os cards do Firestore e os renderiza no quadro.
 */
function loadAndRenderCards() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;

  db.collection("trilhaPaciente").onSnapshot(
    (snapshot) => {
      // Limpa todas as colunas antes de redesenhar
      document
        .querySelectorAll(".kanban-cards-container")
        .forEach((container) => (container.innerHTML = ""));
      allCardsData = {};

      snapshot.forEach((doc) => {
        const cardData = { id: doc.id, ...doc.data() };
        allCardsData[cardData.id] = cardData; // Armazena no cache
        const cardElement = createCardElement(cardData);
        const container = document.getElementById(`cards-${cardData.status}`);
        if (container) {
          container.appendChild(cardElement);
        } else {
          console.warn(
            `Coluna para status "${cardData.status}" não encontrada.`
          );
        }
      });
      updateColumnCounts();
    },
    (error) => {
      console.error("Erro ao buscar cards do Firestore:", error);
      kanbanBoard.innerHTML = `<div class="error-message">Não foi possível carregar os dados dos pacientes.</div>`;
    }
  );
}

/**
 * Cria o elemento HTML para um card individual.
 * @param {object} cardData - Dados do paciente/card.
 * @returns {HTMLElement} O elemento do card.
 */
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

  // Adiciona evento de clique para abrir o modal
  card.addEventListener("click", () => openCardModal(cardData.id));
  return card;
}

/**
 * Atualiza a contagem de cards em cada coluna.
 */
function updateColumnCounts() {
  Object.keys(COLUMNS_CONFIG).forEach((statusKey) => {
    const container = document.getElementById(`cards-${statusKey}`);
    const countElement = document.getElementById(`count-${statusKey}`);
    if (container && countElement) {
      countElement.textContent = container.children.length;
    }
  });
}

/**
 * Abre o modal com os detalhes de um card específico.
 * @param {string} cardId - O ID do documento do card no Firestore.
 */
async function openCardModal(cardId) {
  const modal = document.getElementById("card-modal");
  const modalBody = document.getElementById("card-modal-body");
  const cardData = allCardsData[cardId];

  if (!cardData) {
    console.error("Dados do card não encontrados no cache:", cardId);
    return;
  }

  modal.style.display = "flex";

  try {
    // Carrega o módulo JS específico para a etapa (status) do card
    const stageModule = await import(`./stages/${cardData.status}.js`);
    if (stageModule && typeof stageModule.render === "function") {
      stageModule.render(modalBody, cardData, db);
    } else {
      // Módulo padrão para etapas sem lógica customizada
      modalBody.innerHTML = `<p><strong>Nome:</strong> ${
        cardData.nomeCompleto
      }</p><p><strong>Status:</strong> ${
        COLUMNS_CONFIG[cardData.status]
      }</p><p>Nenhuma ação customizada para esta etapa.</p>`;
    }
  } catch (error) {
    console.error(
      `Erro ao carregar o módulo para a etapa ${cardData.status}:`,
      error
    );
    modalBody.innerHTML = `<div class="error-message">Não foi possível carregar os detalhes desta etapa.</div>`;
  }
}
