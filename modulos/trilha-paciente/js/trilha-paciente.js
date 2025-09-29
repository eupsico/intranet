// Arquivo: modulos/trilha-paciente/js/trilha-paciente.js
// Versão: 2.1.0 (Implementação da etapa "Encaminhar para Plantão")

export function init(db, user, userData) {
  const board = document.getElementById("kanban-board");
  const modal = document.getElementById("card-modal");
  const modalContent = document.getElementById("modal-body-content");
  const modalCloseBtn = document.getElementById("modal-close");
  const modalTitle = document.getElementById("modal-title");

  let assistentesSociais = [];
  let profissionaisAtendimento = []; // Lista para os psicólogos

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

  function openModal(cardData) {
    modalTitle.textContent = `Paciente: ${cardData.nomeCompleto}`;
    renderModalContent(cardData);
    modal.style.display = "flex";
  }

  modalCloseBtn.addEventListener("click", () => {
    modal.style.display = "none";
    modalContent.innerHTML = "";
  });

  function renderModalContent(cardData) {
    switch (cardData.status) {
      case "inscricao_documentos":
        renderInscricaoDocumentos(cardData);
        break;
      case "triagem_agendada":
        renderTriagemAgendada(cardData);
        break;
      case "encaminhar_plantao":
        renderEncaminharPlantao(cardData);
        break;
      default:
        modalContent.innerHTML = `<p>Etapa não configurada: ${cardData.status}</p>`;
    }
  }

  async function fetchAssistentesSociais() {
    if (assistentesSociais.length > 0) return;
    try {
      const snapshot = await db
        .collection("usuarios")
        .where("funcoes", "array-contains", "servico_social")
        .where("inativo", "==", false)
        .get();
      assistentesSociais = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Erro ao buscar assistentes sociais:", error);
    }
  }

  // NOVA FUNÇÃO para buscar psicólogos
  async function fetchProfissionaisAtendimento() {
    if (profissionaisAtendimento.length > 0) return;
    try {
      const snapshot = await db
        .collection("usuarios")
        .where("funcoes", "array-contains", "atendimento")
        .where("inativo", "==", false)
        .get();
      profissionaisAtendimento = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Erro ao buscar profissionais de atendimento:", error);
    }
  }

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

  // --- ETAPA 1: Inscrição e Documentos (código anterior) ---
  async function renderInscricaoDocumentos(cardData) {
    /* ...código da resposta anterior... */
  }
  function setupEtapa1Listeners(cardData) {
    /* ...código da resposta anterior... */
  }

  // --- ETAPA 2: Triagem Agendada (código anterior) ---
  function renderTriagemAgendada(cardData) {
    /* ...código da resposta anterior... */
  }

  // --- NOVA FUNÇÃO - ETAPA 3: Encaminhar para Plantão ---
  async function renderEncaminharPlantao(cardData) {
    await fetchProfissionaisAtendimento();

    // Dados vindos da ficha de triagem (serão preenchidos pela A.S. no futuro)
    const valorContribuicao = cardData.valorContribuicao || "Aguardando Ficha";
    const disponibilidadeTriagem =
      cardData.disponibilidadeTriagem || "Aguardando Ficha";
    const modalidadeAtendimento =
      cardData.modalidadeAtendimento || "Aguardando Ficha";
    const preferenciaAtendimento =
      cardData.preferenciaAtendimento || "Aguardando Ficha";

    modalContent.innerHTML = `
            <div class="info-copy-box">
                <h4>Dados do Paciente (pós-triagem):</h4>
                <p>
                    <strong>Nome:</strong> ${cardData.nomeCompleto}<br>
                    <strong>Valor da Contribuição:</strong> ${valorContribuicao}<br>
                    <strong>Disponibilidade (Ficha Inscrição):</strong> ${cardData.disponibilidadeGeral.join(
                      ", "
                    )}<br>
                    <strong>Disponibilidade (Assistente Social):</strong> ${disponibilidadeTriagem}<br>
                    <strong>Modalidade de Atendimento:</strong> ${modalidadeAtendimento}<br>
                    <strong>Preferência de Atendimento:</strong> ${preferenciaAtendimento}
                </p>
            </div>

            <form id="form-etapa3">
                <div class="form-group">
                    <label for="continua-terapia">Selecione abaixo se paciente deseja continuar com a terapia:</label>
                    <select id="continua-terapia" class="form-control" required>
                        <option value="">Selecione...</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                    </select>
                </div>

                <div id="motivo-nao-prosseguir-container" class="form-group" style="display:none;">
                    <label for="motivo-nao-prosseguir">Motivo de não prosseguir:</label>
                    <textarea id="motivo-nao-prosseguir" class="form-control"></textarea>
                </div>

                <div id="campos-encaminhamento" style="display:none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="plantao-profissional">Selecione o nome profissional do Plantão:</label>
                            <select id="plantao-profissional" class="form-control" required></select>
                        </div>
                        <div class="form-group">
                            <label for="plantao-tipo-profissional">O profissional que irá atender o paciente é:</label>
                            <select id="plantao-tipo-profissional" class="form-control" required>
                                <option value="Estagiario">Estagiário</option>
                                <option value="Voluntario">Voluntário</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="data-encaminhamento">Data do encaminhamento para o Plantão:</label>
                            <input type="date" id="data-encaminhamento" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="data-primeira-sessao">Data da primeira sessão:</label>
                            <input type="date" id="data-primeira-sessao" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="hora-primeira-sessao">Horário da primeira sessão:</label>
                            <input type="time" id="hora-primeira-sessao" class="form-control" required>
                        </div>
                    </div>
                     <div class="form-group">
                        <label for="atendimento-sera">O atendimento será:</label>
                        <select id="atendimento-sera" class="form-control" required>
                            <option value="Online">Online</option>
                            <option value="Presencial">Presencial</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="observacoes">Observações:</label>
                        <textarea id="observacoes" class="form-control"></textarea>
                    </div>
                </div>

                <div class="button-bar">
                    <button type="submit" class="action-button">Salvar e Mover</button>
                </div>
            </form>
        `;

    setupEtapa3Listeners(cardData);
  }

  function setupEtapa3Listeners(cardData) {
    const form = modalContent.querySelector("#form-etapa3");
    const continuaTerapiaSelect = form.querySelector("#continua-terapia");
    const motivoNaoProsseguirContainer = form.querySelector(
      "#motivo-nao-prosseguir-container"
    );
    const camposEncaminhamento = form.querySelector("#campos-encaminhamento");
    const selectProfissional = form.querySelector("#plantao-profissional");

    // Popula a lista de psicólogos
    selectProfissional.innerHTML = '<option value="">Selecione...</option>';
    profissionaisAtendimento.forEach((p) => {
      selectProfissional.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
    });

    continuaTerapiaSelect.addEventListener("change", () => {
      const continua = continuaTerapiaSelect.value === "sim";
      camposEncaminhamento.style.display = continua ? "block" : "none";
      motivoNaoProsseguirContainer.style.display =
        !continua && continuaTerapiaSelect.value !== "" ? "block" : "none";

      // Ajusta a obrigatoriedade dos campos
      camposEncaminhamento
        .querySelectorAll("input, select")
        .forEach((el) => (el.required = continua));
      motivoNaoProsseguirContainer.querySelector("textarea").required =
        !continua;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        form.reportValidity();
        return;
      }

      const querContinuar =
        form.querySelector("#continua-terapia").value === "sim";
      let dataToSave;

      if (querContinuar) {
        dataToSave = {
          status: "em_atendimento_plantao",
          continuaTerapia: true,
          plantaoProfissionalId: form.querySelector("#plantao-profissional")
            .value,
          plantaoProfissionalNome: form.querySelector("#plantao-profissional")
            .options[form.querySelector("#plantao-profissional").selectedIndex]
            .text,
          plantaoTipoProfissional: form.querySelector(
            "#plantao-tipo-profissional"
          ).value,
          dataEncaminhamentoPlantao: form.querySelector("#data-encaminhamento")
            .value,
          dataPrimeiraSessao: form.querySelector("#data-primeira-sessao").value,
          horaPrimeiraSessao: form.querySelector("#hora-primeira-sessao").value,
          plantaoTipoAtendimento: form.querySelector("#atendimento-sera").value,
          plantaoObservacoes: form.querySelector("#observacoes").value,
        };
      } else {
        dataToSave = {
          status: "desistencia", // Ou um novo status como 'nao_prosseguiu'
          continuaTerapia: false,
          motivoNaoProsseguiu: form.querySelector("#motivo-nao-prosseguir")
            .value,
        };
      }

      await updateCard(cardData.id, dataToSave);
    });
  }

  // --- INICIALIZAÇÃO ---
  renderBoard();
  loadCards();
}
