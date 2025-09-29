// Arquivo: modulos/administrativo/js/trilha-paciente.js
export function init(db, user, userData) {
  const board = document.getElementById("kanban-board");
  const modal = document.getElementById("card-modal");
  const modalContent = document.getElementById("modal-body-content");
  const modalCloseBtn = document.getElementById("modal-close");
  const modalTitle = document.getElementById("modal-title");

  let assistentesSociais = [];

  // Mapeamento das colunas do Kanban
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
    board.innerHTML = ""; // Limpa o quadro para recarregar
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

  // --- CARREGAR E EXIBIR OS CARDS DO FIRESTORE ---
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
    cardEl.innerHTML = `
            <div class="card-title">${cardData.nomeCompleto}</div>
            <div class="card-info">CPF: ${cardData.cpf}</div>
        `;

    cardEl.addEventListener("click", () => openModal(cardData));

    const column = document.getElementById(
      `col-${cardData.status || "inscricao_documentos"}`
    );
    if (column) {
      column.appendChild(cardEl);
    }
  }

  // --- LÓGICA DO MODAL ---
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
      // Adicione outros 'cases' para as demais etapas aqui
      default:
        modalContent.innerHTML = `<p>Etapa não configurada: ${cardData.status}</p>`;
    }
  }

  // --- FUNÇÕES AUXILIARES ---
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

  function populateAssistentesSociaisSelect(selectElement) {
    selectElement.innerHTML = '<option value="">Selecione...</option>';
    assistentesSociais.forEach((as) => {
      selectElement.innerHTML += `<option value="${as.id}">${as.nome}</option>`;
    });
  }

  async function updateCard(cardId, data) {
    const button = modal.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Salvando...";
    }

    try {
      const cardRef = db.collection("trilhaPaciente").doc(cardId);
      await cardRef.update({ ...data, lastUpdated: new Date() });

      modal.style.display = "none";
      // Recarrega o kanban para refletir a mudança
      renderBoard();
      await loadCards();
    } catch (error) {
      console.error("Erro ao atualizar o card:", error);
      alert("Não foi possível atualizar o card. Tente novamente.");
      if (button) {
        button.disabled = false;
        button.textContent = "Salvar Alterações";
      }
    }
  }

  // --- RENDERIZAÇÃO E LÓGICA DA ETAPA 1: Inscrição e Documentos ---
  async function renderInscricaoDocumentos(cardData) {
    await fetchAssistentesSociais();
    const responsavelInfo =
      cardData.responsavel && cardData.responsavel.nome
        ? `<strong>Responsável:</strong> ${cardData.responsavel.nome}<br>`
        : "";

    modalContent.innerHTML = `
            <div class="info-copy-box">
                <h4>Preciso que você me confirme se os dados do paciente estão corretos:</h4>
                <p>
                    <strong>Nome:</strong> ${cardData.nomeCompleto}<br>
                    <strong>Data de nascimento:</strong> ${new Date(
                      cardData.dataNascimento + "T00:00:00"
                    ).toLocaleDateString("pt-BR")}<br>
                    ${responsavelInfo}
                    <strong>Telefone de contato:</strong> ${
                      cardData.telefoneCelular
                    }<br>
                    <strong>CPF:</strong> ${cardData.cpf}<br>
                    <strong>E-mail:</strong> ${cardData.email}
                </p>
            </div>

            <h4>Checklist para agendar triagem:</h4>
            <form id="form-etapa1">
                <div class="form-group">
                    <label><input type="checkbox" id="chk-dados" required> Confirmou os dados</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="chk-pagamento" required> Efetuou o pagamento</label>
                </div>
                <div class="form-group">
                     <label><input type="checkbox" id="chk-isento"> Isento da triagem</label>
                </div>
                <div id="motivo-isencao-container" class="form-group" style="display:none;">
                    <label for="motivo-isencao">Informe o motivo da isenção:</label>
                    <textarea id="motivo-isencao" class="form-control"></textarea>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="chk-desistiu"> Desistiu</label>
                </div>
                 <div id="motivo-desistencia-container" class="form-group" style="display:none;">
                    <label for="motivo-desistencia">Informe o motivo da desistência:</label>
                    <textarea id="motivo-desistencia" class="form-control"></textarea>
                </div>
                
                <hr>

                <div id="triagem-fields">
                    <div class="form-group">
                        <label>Enviou os documentos (RG, CPF, Comp. Endereço, Comp. Renda):</label>
                        <p style="font-size: 0.8em; color: #666;">Funcionalidade de upload em desenvolvimento.</p>
                        <div class="upload-area">
                            <input type="file" id="doc-upload" multiple disabled>
                            <div id="file-list"></div>
                        </div>
                    </div>
                     <div class="form-group">
                        <label><input type="checkbox" id="chk-drive" required> Criar Pasta no Drive do serviço social</label>
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
                    <button type="submit" class="action-button">Salvar e Mover</button>
                </div>
            </form>
        `;

    setupEtapa1Listeners(cardData);
  }

  function setupEtapa1Listeners(cardData) {
    const form = modalContent.querySelector("#form-etapa1");
    const chkIsento = form.querySelector("#chk-isento");
    const chkDesistiu = form.querySelector("#chk-desistiu");
    const motivoIsencaoContainer = form.querySelector(
      "#motivo-isencao-container"
    );
    const motivoDesistenciaContainer = form.querySelector(
      "#motivo-desistencia-container"
    );
    const triagemFields = form.querySelector("#triagem-fields");
    const selectAssistente = form.querySelector("#assistente-social");
    const emailAssistenteInput = form.querySelector("#assistente-email");

    populateAssistentesSociaisSelect(selectAssistente);

    chkIsento.addEventListener("change", (e) => {
      motivoIsencaoContainer.style.display = e.target.checked
        ? "block"
        : "none";
    });

    chkDesistiu.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      motivoDesistenciaContainer.style.display = isChecked ? "block" : "none";
      triagemFields.style.display = isChecked ? "none" : "block";

      // Torna os campos não obrigatórios se marcou desistência
      triagemFields.querySelectorAll("input, select").forEach((el) => {
        if (el.type !== "checkbox") el.required = !isChecked;
      });
    });

    selectAssistente.addEventListener("change", () => {
      const selectedId = selectAssistente.value;
      const assistente = assistentesSociais.find((as) => as.id === selectedId);
      emailAssistenteInput.value = assistente ? assistente.email : "";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const desistiu = chkDesistiu.checked;

      if (desistiu) {
        const motivo = motivoDesistenciaContainer.querySelector(
          "#motivo-desistencia"
        ).value;
        if (!motivo) {
          alert("Por favor, informe o motivo da desistência.");
          return;
        }
        await updateCard(cardData.id, {
          status: "desistencia",
          motivoDesistencia: motivo,
        });
      } else {
        // Validação
        if (!form.checkValidity()) {
          alert(
            "Por favor, preencha todos os campos obrigatórios do checklist e do agendamento."
          );
          form.reportValidity();
          return;
        }
        const isento = chkIsento.checked;
        const motivoIsencao =
          motivoIsencaoContainer.querySelector("#motivo-isencao").value;
        if (isento && !motivoIsencao) {
          alert("Por favor, informe o motivo da isenção.");
          return;
        }

        const dataToSave = {
          status: "triagem_agendada",
          dadosConfirmados: form.querySelector("#chk-dados").checked,
          pagamentoEfetuado: form.querySelector("#chk-pagamento").checked,
          isentoTriagem: isento,
          motivoIsencao: motivoIsencao,
          pastaDriveCriada: form.querySelector("#chk-drive").checked,
          assistenteSocialId: selectAssistente.value,
          assistenteSocialNome:
            selectAssistente.options[selectAssistente.selectedIndex].text,
          tipoTriagem: form.querySelector("#tipo-triagem").value,
          dataTriagem: form.querySelector("#data-triagem").value,
          horaTriagem: form.querySelector("#hora-triagem").value,
        };
        await updateCard(cardData.id, dataToSave);
      }
    });
  }

  // --- RENDERIZAÇÃO E LÓGICA DA ETAPA 2: Triagem Agendada ---
  function renderTriagemAgendada(cardData) {
    modalContent.innerHTML = `
            <div class="info-copy-box">
                <h4>🎉 Tudo pronto para a triagem! Seguem os detalhes:</h4>
                <p>
                    Sua triagem será <strong>${
                      cardData.tipoTriagem
                    }</strong>.<br>
                    <strong>Paciente:</strong> ${cardData.nomeCompleto}<br>
                    <strong>Data e horário:</strong> ${new Date(
                      cardData.dataTriagem + "T" + cardData.horaTriagem
                    ).toLocaleDateString("pt-BR")} às ${
      cardData.horaTriagem
    }<br>
                    <strong>Assistente Social:</strong> ${
                      cardData.assistenteSocialNome
                    }
                </p>
                <p><em>Posso ajudar em algo mais?</em></p>
            </div>
            <p>Aguardando preenchimento da ficha de triagem pela assistente social no módulo de Serviço Social...</p>
        `;
  }

  // --- INICIALIZAÇÃO ---
  renderBoard();
  loadCards();
}
