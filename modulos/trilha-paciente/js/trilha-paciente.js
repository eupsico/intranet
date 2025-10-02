// Arquivo: /modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 2.1 (CORRIGIDO E ATUALIZADO)

// Mapeamento dos status para os títulos das colunas
const COLUMNS_CONFIG = {
  inscricao_documentos: "Inscrição e Documentos",
  triagem_agendada: "Triagem Agendada",
  encaminhar_para_plantao: "Encaminhar para Plantão",
  em_atendimento_plantao: "Em Atendimento (Plantão)",
  agendamento_confirmado_plantao: "Agendamento Confirmado (Plantão)", // Adicionado
  encaminhar_para_pb: "Encaminhar para PB",
  aguardando_info_horarios: "Aguardando Info Horários",
  cadastrar_horario_psicomanager: "Cadastrar Horário Psicomanager",
  em_atendimento_pb: "Em Atendimento (PB)",
  pacientes_parcerias: "Pacientes Parcerias",
  grupos: "Grupos",
  desistencia: "Desistência",
  alta: "Alta",
};

let db, functions, user, userData; // Instâncias globais para o módulo
let allCardsData = {}; // Cache para os dados dos cards
let currentColumnFilter = []; // Filtro de colunas ativas

/**
 * Função de inicialização do Kanban, chamada pelo painel.
 */
export async function init(
  firestoreDb,
  authUser,
  authData,
  container,
  columnFilter
) {
  db = firestoreDb;
  user = authUser;
  userData = authData;
  // functions continua a ser pego de um escopo superior se disponível ou inicializado aqui.
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
 */
async function openCardModal(cardId) {
  const modal = document.getElementById("card-modal");
  const modalBody = document.getElementById("card-modal-body");
  const cardData = allCardsData[cardId];

  if (!cardData) {
    console.error("Dados do card não encontrados:", cardId);
    return;
  }

  modal.style.display = "flex";
  modalBody.innerHTML = '<div class="loading-spinner"></div>';

  try {
    // ===== ALTERAÇÃO PRINCIPAL APLICADA AQUI =====
    // Mapeia o status para a função setup correspondente.
    const stageSetupFunctions = {
      inscricao_documentos: () =>
        import("./stages/inscricao_documentos.js").then(
          (m) => m.setupInscricaoDocumentos
        ),
      triagem_agendada: () =>
        import("./stages/triagem_agendada.js").then(
          (m) => m.setupTriagemAgendada
        ),
      encaminhar_para_plantao: () =>
        import("./stages/encaminhar_para_plantao.js").then(
          (m) => m.setupEncaminharParaPlantao
        ),
      em_atendimento_plantao: () =>
        import("./stages/em_atendimento_plantao.js").then(
          (m) => m.setupEmAtendimentoPlantao
        ),
      agendamento_confirmado_plantao: () =>
        import("./stages/agendamento_confirmado_plantao.js").then(
          (m) => m.setupAgendamentoConfirmadoPlantao
        ),
      encaminhar_para_pb: () =>
        import("./stages/encaminhar_para_pb.js").then(
          (m) => m.setupEncaminharParaPb
        ),
      aguardando_info_horarios: () =>
        import("./stages/aguardando_info_horarios.js").then(
          (m) => m.setupAguardandoInfoHorarios
        ),
      cadastrar_horario_psicomanager: () =>
        import("./stages/cadastrar_horario_psicomanager.js").then(
          (m) => m.setupCadastrarHorarioPsicomanager
        ),
    };

    const getSetupFunction = stageSetupFunctions[cardData.status];

    if (getSetupFunction) {
      const setupFunction = await getSetupFunction();
      const contentElement = setupFunction(
        db,
        functions,
        cardId,
        cardData,
        user,
        userData
      );
      modalBody.innerHTML = "";
      modalBody.appendChild(contentElement);
    } else {
      // Fallback para status sem módulo JS customizado
      modalBody.innerHTML = `<p><strong>Nome:</strong> ${
        cardData.nomeCompleto
      }</p>
                                   <p><strong>Status:</strong> ${
                                     COLUMNS_CONFIG[cardData.status]
                                   }</p>
                                   <p>Nenhuma ação customizada para esta etapa.</p>`;
    }
  } catch (error) {
    console.error(
      `Erro ao carregar o módulo para a etapa ${cardData.status}:`,
      error
    );
    modalBody.innerHTML = `<div class="error-message">Não foi possível carregar os detalhes desta etapa.</div>`;
  }
}
