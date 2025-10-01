// Mapeamento dos status para os títulos das colunas
const COLUMNS_CONFIG = {
  inscricao_documentos: "Inscrição e Documentos",
  triagem_agendada: "Triagem Agendada",
  encaminhar_para_plantao: "Encaminhar para Plantão",
  em_atendimento_plantao: "Em Atendimento (Plantão)",
  encaminhar_para_pb: "Encaminhar para PB",
  aguardando_info_horarios: "Aguardando Info Horários",
  cadastrar_horario_psicomanager: "Cadastrar Horário Psicomanager",
  em_atendimento_pb: "Em Atendimento (PB)",
  pacientes_parcerias: "Pacientes Parcerias",
  grupos: "Grupos",
  desistencia: "Desistência",
  alta: "Alta",
};

let db; // Instância do Firestore
let allCardsData = {}; // Cache para os dados dos cards
let currentColumnFilter = []; // Filtro de colunas ativas

/**
 * Função de inicialização do Kanban, chamada pelo painel.
 * @param {object} firestoreDb - Instância do Firestore
 * @param {object} user - Dados do usuário autenticado
 * @param {object} userData - Dados do perfil do usuário
 * @param {HTMLElement} container - O elemento onde o Kanban será renderizado.
 * @param {string[]} columnFilter - Um array com os status das colunas a serem exibidas.
 */
export async function init(
  firestoreDb,
  user,
  userData,
  container,
  columnFilter
) {
  db = firestoreDb;
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

/**
 * Cria as colunas do Kanban no DOM com base no filtro ativo.
 */
function setupColumns() {
  const kanbanBoard = document.getElementById("kanban-board");
  if (!kanbanBoard) return;

  // Filtra as colunas a serem exibidas
  kanbanBoard.innerHTML = currentColumnFilter
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
  // ... (Esta função permanece exatamente a mesma da versão anterior)
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
    if (event.target === modal) {
      closeModal();
    }
  });
}

/**
 * Carrega os cards do Firestore e os renderiza nas colunas visíveis.
 */
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
        const cardData = { id: doc.id, ...doc.data() };
        allCardsData[cardData.id] = cardData;

        // Só renderiza o card se a sua coluna estiver no filtro atual
        if (currentColumnFilter.includes(cardData.status)) {
          const cardElement = createCardElement(cardData);
          const container = document.getElementById(`cards-${cardData.status}`);
          if (container) {
            container.appendChild(cardElement);
          }
        }
      });
      updateColumnCounts();
    },
    (error) => {
      console.error("Erro ao buscar cards do Firestore:", error);
      kanbanBoard.innerHTML = `<div class="error-message">Não foi possível carregar os dados.</div>`;
    }
  );
}

/**
 * Cria o elemento HTML para um card individual.
 * @param {object} cardData - Dados do paciente/card.
 * @returns {HTMLElement} O elemento do card.
 */
function createCardElement(cardData) {
  // ... (Esta função permanece exatamente a mesma da versão anterior)
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

/**
 * Atualiza a contagem de cards em cada coluna visível.
 */
function updateColumnCounts() {
  currentColumnFilter.forEach((statusKey) => {
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
  // ... (Esta função permanece a mesma, mas adicionei a importação do CSS para o painel)
  const modal = document.getElementById("card-modal");
  const modalBody = document.getElementById("card-modal-body");
  const cardData = allCardsData[cardId];

  if (!cardData) {
    console.error("Dados do card não encontrados:", cardId);
    return;
  }

  modal.style.display = "flex";

  try {
    const stageModule = await import(`./stages/${cardData.status}.js`);
    if (stageModule && typeof stageModule.render === "function") {
      stageModule.render(modalBody, cardData, db);
    } else {
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
