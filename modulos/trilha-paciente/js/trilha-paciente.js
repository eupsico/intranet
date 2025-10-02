// Arquivo: /modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 2.2 (CORRIGIDO)

// Mapeamento dos status para os títulos das colunas
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

let db, functions, user, userData;
let allCardsData = {};
let currentColumnFilter = [];

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
  functions = firebase.functions(); // Garante que 'functions' esteja disponível
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
    if (event.target === modal) {
      closeModal();
    }
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
  const modalBody = document.getElementById("card-modal-body");
  const cardData = allCardsData[cardId];

  if (!cardData) {
    console.error("Dados do card não encontrados:", cardId);
    return;
  }

  modal.style.display = "flex";
  modalBody.innerHTML = '<div class="loading-spinner"></div>';

  // Mostra o botão de salvar, que pode ser escondido pelo módulo se necessário
  document.getElementById("modal-save-btn").style.display = "inline-block";

  try {
    // ===== ALTERAÇÃO PRINCIPAL APLICADA AQUI =====
    // A lógica foi reescrita para importar o módulo e chamar a função 'setup' correta.

    // Mapeamento de status para o nome da função de setup
    const stageModules = {
      encaminhar_para_plantao: {
        name: "setupEmAtendimentoPlantao",
        path: "./stages/em_atendimento_plantao.js",
      },
      em_atendimento_plantao: {
        name: "setupAgendamentoConfirmadoPlantao",
        path: "./stages/agendamento_confirmado_plantao.js",
      },
      encaminhar_para_pb: {
        name: "setupEncaminharParaPb",
        path: "./stages/encaminhar_para_pb.js",
      },
      aguardando_info_horarios: {
        name: "setupAguardandoInfoHorarios", // Esta função ainda não existe, mas a estrutura está pronta
        path: "./stages/aguardando_info_horarios.js",
      },
      cadastrar_horario_psicomanager: {
        name: "setupCadastrarHorarioPsicomanager",
        path: "./stages/cadastrar_horario_psicomanager.js",
      },
      // Adicione outros status aqui conforme for criando os arquivos
    };

    const moduleInfo = stageModules[cardData.status];

    if (moduleInfo) {
      const stageModule = await import(moduleInfo.path);
      const setupFunction = stageModule[moduleInfo.name];

      if (typeof setupFunction === "function") {
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
        // Erro caso a função de setup não seja encontrada no módulo
        throw new Error(
          `A função ${moduleInfo.name} não foi encontrada no módulo ${moduleInfo.path}`
        );
      }
    } else {
      // Comportamento padrão para status que não têm um módulo JS customizado
      modalBody.innerHTML = `<p><strong>Nome:</strong> ${
        cardData.nomeCompleto
      }</p>
                                   <p><strong>Status:</strong> ${
                                     COLUMNS_CONFIG[cardData.status] ||
                                     cardData.status
                                   }</p>
                                   <p>Nenhuma ação customizada para esta etapa.</p>`;
      document.getElementById("modal-save-btn").style.display = "none";
    }
  } catch (error) {
    console.error(
      `Erro ao carregar o módulo para a etapa ${cardData.status}:`,
      error
    );
    modalBody.innerHTML = `<div class="error-message">Não foi possível carregar os detalhes desta etapa.</div>`;
  }
}
