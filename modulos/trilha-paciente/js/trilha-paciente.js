// Arquivo: modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 3.0.1 (Refatorado com arquivos de stages separados - Completo)

export function trilhaModuleinit(db, user, userData) {
  const board = document.getElementById("kanban-board");
  const modal = document.getElementById("card-modal");
  const modalContent = document.getElementById("modal-body-content");
  const modalCloseBtn = document.getElementById("modal-close");
  const modalTitle = document.getElementById("modal-title");

  // Mapeamento de Status para o arquivo JS correspondente
  const stageModules = {
    inscricao_documentos: "./stages/1-inscricao-documentos.js",
    triagem_agendada: "./stages/2-triagem-agendada.js",
    encaminhar_plantao: "./stages/3-encaminhar-plantao.js",
  };

  const columns = {
    inscricao_documentos: "Inscrição e Documentos",
    triagem_agendada: "Triagem Agendada",
    encaminhar_plantao: "Encaminhar para Plantão",
    em_atendimento_plantao: "Em Atendimento (Plantão)",
    encaminhar_pb: "Encaminhar para PB",
    aguardando_horarios: "Aguardando Info Horários",
    cadastrar_psicomanager: "Cadastrar Horário Psicomanager",
    em_atendimento_pb: "Em Atendimento (PB)",
    pacientes_parcerias: "Pacientes Parcerias",
    grupos: "Grupos",
    desistencia: "Desistência",
    alta: "Alta",
  };

  function renderBoard() {
    board.innerHTML = "";
    for (const key in columns) {
      const columnEl = document.createElement("div");
      columnEl.className = "kanban-column";
      columnEl.dataset.columnId = key;
      columnEl.innerHTML = `<div class="column-header"><h3>${columns[key]}</h3></div><div class="column-cards" id="col-${key}"></div>`;
      board.appendChild(columnEl);
    }
  }

  async function loadCards() {
    try {
      const snapshot = await db
        .collection("trilhaPaciente")
        .orderBy("timestamp", "desc")
        .get();
      snapshot.forEach((doc) => {
        const cardData = { id: doc.id, ...doc.data() };
        createCardElement(cardData);
      });
    } catch (error) {
      console.error("Erro ao carregar cards:", error);
    }
  }

  function createCardElement(cardData) {
    const cardEl = document.createElement("div");
    cardEl.className = "kanban-card";
    cardEl.dataset.cardId = cardData.id;
    cardEl.innerHTML = `<div class="card-title">${cardData.nomeCompleto}</div><div class="card-info">CPF: ${cardData.cpf}</div>`;
    cardEl.addEventListener("click", () => openModal(cardData));
    const column = document.getElementById(
      `col-${cardData.status || "inscricao_documentos"}`
    );
    if (column) {
      column.appendChild(cardEl);
    }
  }

  async function openModal(cardData) {
    modalTitle.textContent = `Paciente: ${cardData.nomeCompleto}`;

    const modulePath = stageModules[cardData.status];
    if (!modulePath) {
      modalContent.innerHTML = `<p>Etapa não configurada: ${cardData.status}</p>`;
      modal.style.display = "flex";
      return;
    }

    try {
      const stageModule = await import(modulePath);
      const context = {
        db,
        updateCard,
        closeModal: () => (modal.style.display = "none"),
      };

      stageModule.render(cardData, modalContent, context);
      stageModule.initListeners(cardData, modalContent, context);
    } catch (error) {
      console.error(
        `Erro ao carregar o módulo do estágio ${cardData.status}:`,
        error
      );
      modalContent.innerHTML = `<p class="error-message">Erro ao carregar os detalhes desta etapa.</p>`;
    }

    modal.style.display = "flex";
  }

  modalCloseBtn.addEventListener("click", () => {
    modal.style.display = "none";
    modalContent.innerHTML = "";
  });

  async function updateCard(cardId, data) {
    const button = modal.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Salvando...";
    }
    try {
      await db
        .collection("trilhaPaciente")
        .doc(cardId)
        .update({ ...data, lastUpdated: new Date() });
      modal.style.display = "none";
      renderBoard();
      await loadCards();
    } catch (error) {
      console.error("Erro ao atualizar o card:", error);
      alert("Não foi possível atualizar o card.");
      if (button) {
        button.disabled = false;
        button.textContent = "Salvar Alterações";
      }
    }
  }

  // --- INICIALIZAÇÃO ---
  renderBoard();
  loadCards();
}
