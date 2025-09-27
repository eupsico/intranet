// Arquivo: modulos/administrativo/js/trilha-paciente.js
export function init(db, user, userData) {
  const board = document.getElementById("kanban-board");
  const modal = document.getElementById("card-modal");
  const modalContent = document.getElementById("modal-body-content");
  const modalCloseBtn = document.getElementById("modal-close");

  // Mapeamento das colunas
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

  // --- RENDERIZAÇÃO INICIAL DO QUADRO ---
  function renderBoard() {
    for (const key in columns) {
      const columnEl = document.createElement("div");
      columnEl.className = "kanban-column";
      columnEl.dataset.columnId = key;
      columnEl.innerHTML = `
                <div class="column-header">
                    <h3>${columns[key]}</h3>
                </div>
                <div class="column-cards" id="col-${key}"></div>
            `;
      board.appendChild(columnEl);
    }
  }

  // --- CARREGAR E EXIBIR OS CARDS ---
  async function loadCards() {
    try {
      const snapshot = await db.collection("trilhaPaciente").get();
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
    cardEl.innerHTML = `
            <div class="card-title">${cardData.nomeCompleto}</div>
            <div class="card-info">CPF: ${cardData.cpf}</div>
        `;

    cardEl.addEventListener("click", () => openModal(cardData));

    const column = document.getElementById(`col-${cardData.status}`);
    if (column) {
      column.appendChild(cardEl);
    } else {
      // Se a coluna não existir (status inválido), coloca na primeira
      document.getElementById("col-inscricao_documentos").appendChild(cardEl);
    }
  }

  // --- LÓGICA DO MODAL ---
  function openModal(cardData) {
    // Renderiza o conteúdo do modal com base no status do card
    renderModalContent(cardData);
    modal.style.display = "flex";
  }

  modalCloseBtn.addEventListener("click", () => {
    modal.style.display = "none";
    modalContent.innerHTML = ""; // Limpa o conteúdo
  });

  function renderModalContent(cardData) {
    // Redireciona para a função de renderização específica da etapa
    switch (cardData.status) {
      case "inscricao_documentos":
        renderInscricaoDocumentos(cardData);
        break;
      // ... outras etapas virão aqui
      default:
        modalContent.innerHTML = `<p>Etapa não configurada: ${cardData.status}</p>`;
    }
  }

  // --- CONTEÚDO DA PRIMEIRA ETAPA: INSCRIÇÃO E DOCUMENTOS ---
  function renderInscricaoDocumentos(cardData) {
    const responsavelInfo =
      cardData.responsavel && cardData.responsavel.nome
        ? `<strong>Responsável:</strong> ${cardData.responsavel.nome}<br>`
        : "";

    modalContent.innerHTML = `
            <div class="info-copy-box">
                <h4>Preciso que você me confirme se os dados do paciente estão corretos:</h4>
                <p>
                    <strong>Nome:</strong> ${cardData.nomeCompleto}<br>
                    <strong>Data de nascimento:</strong> ${cardData.dataNascimento}<br>
                    ${responsavelInfo}
                    <strong>Telefone de contato:</strong> ${cardData.telefoneCelular}<br>
                    <strong>CPF:</strong> ${cardData.cpf}<br>
                    <strong>E-mail:</strong> ${cardData.email}
                </p>
            </div>

            <h4>Checklist para agendar triagem:</h4>
            <form id="form-inscricao">
                <div class="form-group">
                    <label><input type="checkbox" id="chk-dados" required> Confirmou os dados</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="chk-pagamento" required> Efetuou o pagamento</label>
                </div>
                <div class="form-group">
                     <label><input type="checkbox" id="chk-isento"> Isento da triagem</label>
                </div>
                <div id="motivo-isencao-container" class="form-group hidden-section">
                    <label for="motivo-isencao">Informe o motivo da isenção:</label>
                    <textarea id="motivo-isencao" class="form-control"></textarea>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="chk-desistiu"> Desistiu</label>
                </div>
                 <div id="motivo-desistencia-container" class="form-group hidden-section">
                    <label for="motivo-desistencia">Informe o motivo da desistência:</label>
                    <textarea id="motivo-desistencia" class="form-control"></textarea>
                </div>
                
                <hr>

                <div id="triagem-fields">
                    <div class="form-group">
                        <label>Enviou os documentos (RG, CPF, Comp. Endereço, Comp. Renda):</label>
                        <div class="upload-area">
                            <input type="file" id="doc-upload" multiple>
                            <div id="file-list"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="assistente-social">Nome Assistente Social:</label>
                        <select id="assistente-social" class="form-control" required></select>
                    </div>
                    <div class="form-group">
                        <label for="assistente-email">E-mail Assistente Social:</label>
                        <input type="email" id="assistente-email" class="form-control" readonly>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tipo-triagem">Tipo de triagem:</label>
                            <select id="tipo-triagem" class="form-control" required>
                                <option value="Online">Online</option>
                                <option value="Presencial">Presencial</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="data-triagem">Data da triagem:</label>
                            <input type="date" id="data-triagem" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="hora-triagem">Horário da triagem:</label>
                            <input type="time" id="hora-triagem" class="form-control" required>
                        </div>
                    </div>
                </div>
                
                <div class="button-bar">
                    <button type="submit" class="action-button">Mover para Triagem Agendada</button>
                </div>
            </form>
        `;

    setupInscricaoListeners(cardData);
  }

  function setupInscricaoListeners(cardData) {
    const chkIsento = document.getElementById("chk-isento");
    const chkDesistiu = document.getElementById("chk-desistiu");
    const motivoIsencaoContainer = document.getElementById(
      "motivo-isencao-container"
    );
    const motivoDesistenciaContainer = document.getElementById(
      "motivo-desistencia-container"
    );
    const triagemFields = document.getElementById("triagem-fields");

    chkIsento.addEventListener("change", (e) => {
      motivoIsencaoContainer.style.display = e.target.checked
        ? "block"
        : "none";
    });

    chkDesistiu.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      motivoDesistenciaContainer.style.display = isChecked ? "block" : "none";
      triagemFields.style.display = isChecked ? "none" : "block";
      // Lógica para tornar campos não obrigatórios se desistiu
    });

    // ... Lógica para upload de arquivos, popular assistentes sociais e salvar...
  }

  // --- INICIALIZAÇÃO ---
  renderBoard();
  loadCards();
}
