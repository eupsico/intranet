/**
 * Renderiza o conteúdo do modal para a etapa "Inscrição e Documentos".
 * @param {HTMLElement} modalBody - O corpo do modal onde o conteúdo será inserido.
 * @param {object} cardData - Os dados do card do paciente.
 * @param {object} db - A instância do Firestore.
 */
export function render(modalBody, cardData, db) {
  const responsavelInfo =
    cardData.responsavel && cardData.responsavel.nome
      ? `Responsável: ${cardData.responsavel.nome}`
      : "";

  const dataNascimentoFormatada = cardData.dataNascimento
    ? new Date(cardData.dataNascimento + "T03:00:00").toLocaleDateString(
        "pt-BR"
      )
    : "Não informada";

  modalBody.innerHTML = `
        <h3 class="form-section-title">Confirmação de Dados</h3>
        <div class="confirmation-box" id="confirmation-text">
Por favor, confirme se os dados abaixo estão corretos:
Nome: ${cardData.nomeCompleto}
Data de Nascimento: ${dataNascimentoFormatada}
Telefone: ${cardData.telefoneCelular}
CPF: ${cardData.cpf}
E-mail: ${cardData.email}
Responsável: ${responsavelInfo}
        </div>
        <p>Copie o texto acima e envie para o paciente para confirmação.</p>

        <h3 class="form-section-title">Checklist para Agendar Triagem</h3>
        <div class="checklist-group">
            <div class="form-grid-2-col">
                 <div class="form-group"><input type="checkbox" id="chk-docs" name="checklist"><label for="chk-docs">Enviou os documentos</label></div>
                <div class="form-group"><input type="checkbox" id="chk-confirmou" name="checklist"><label for="chk-confirmou">Confirmou os dados</label></div>
                <div class="form-group"><input type="checkbox" id="chk-pasta" name="checklist"><label for="chk-pasta">Criou Pasta no Drive</label></div>
                <div class="form-group"><input type="checkbox" id="chk-pagamento" name="checklist"><label for="chk-pagamento">Efetuou o pagamento</label></div>
                <div class="form-group"><input type="checkbox" id="chk-isento" name="checklist"><label for="chk-isento">Isento da triagem</label></div>
                <div class="form-group"><input type="checkbox" id="chk-desistiu" name="checklist"><label for="chk-desistiu">Desistiu do processo</label></div>
            </div>
           
             <div id="isento-motivo-section" class="form-group hidden-section">
                <label for="isento-motivo">Informe o motivo da isenção:</label>
                <textarea id="isento-motivo" class="form-control"></textarea>
            </div>
            
            <div id="desistencia-motivo-section" class="form-group hidden-section">
                <label for="desistencia-motivo">Informe o motivo da desistência:</label>
                <textarea id="desistencia-motivo" class="form-control"></textarea>
            </div>
        </div>

        <div id="agendamento-section">
            <h3 class="form-section-title">Agendamento da Triagem</h3>
            <div class="form-grid-2-col">
                <div class="form-group"><label for="assistente-social">Nome da Assistente Social</label><select id="assistente-social" class="form-control"><option value="">Carregando...</option></select></div>
                <div class="form-group"><label for="assistente-email">E-mail da Assistente Social</label><input type="email" id="assistente-email" class="form-control" disabled></div>
            </div>
            <div class="form-grid-3-col">
                <div class="form-group"><label for="tipo-triagem">Tipo de Triagem</label><select id="tipo-triagem" class="form-control"><option value="">Selecione...</option><option value="Online">Online</option><option value="Presencial">Presencial</option></select></div>
                <div class="form-group"><label for="data-triagem">Data da Triagem</label><input type="date" id="data-triagem" class="form-control"></div>
                <div class="form-group"><label for="hora-triagem">Horário da Triagem</label><input type="time" id="hora-triagem" class="form-control"></div>
            </div>
        </div>
    `;

  loadAssistentesSociais(db);
  setupEventListeners();

  const saveButton = document.getElementById("modal-save-btn");
  saveButton.onclick = () => save(cardData.id, db);
}

async function loadAssistentesSociais(db) {
  const select = document.getElementById("assistente-social");
  const emailInput = document.getElementById("assistente-email");
  try {
    const snapshot = await db
      .collection("usuarios")
      .where("funcoes", "array-contains", "servico_social")
      .where("inativo", "==", false)
      .get();
    select.innerHTML = '<option value="">Selecione...</option>';
    const assistentes = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      assistentes.push({ id: doc.id, nome: data.nome, email: data.email });
    });
    assistentes.sort((a, b) => a.nome.localeCompare(b.nome));
    assistentes.forEach((assistente) => {
      const option = document.createElement("option");
      option.value = assistente.nome;
      option.textContent = assistente.nome;
      option.dataset.email = assistente.email;
      select.appendChild(option);
    });
    select.addEventListener("change", (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      emailInput.value = selectedOption.dataset.email || "";
    });
  } catch (error) {
    console.error("Erro ao carregar assistentes sociais:", error);
    select.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

function setupEventListeners() {
  // ... (Esta função permanece a mesma da versão anterior, corrigida)
  const chkPagamento = document.getElementById("chk-pagamento");
  const chkIsento = document.getElementById("chk-isento");
  const chkDesistiu = document.getElementById("chk-desistiu");
  const isentoSection = document.getElementById("isento-motivo-section");
  const desistiuSection = document.getElementById("desistencia-motivo-section");
  const agendamentoSection = document.getElementById("agendamento-section");
  const allCheckboxes = document.querySelectorAll('input[name="checklist"]');

  isentoSection.style.display = "none";
  desistiuSection.style.display = "none";

  chkIsento.addEventListener("change", function () {
    isentoSection.style.display = this.checked ? "block" : "none";
    if (this.checked) {
      chkPagamento.checked = false;
      chkPagamento.disabled = true;
      chkDesistiu.checked = false;
      chkDesistiu.disabled = true;
      desistiuSection.style.display = "none";
    } else {
      chkPagamento.disabled = false;
      chkDesistiu.disabled = false;
    }
  });

  chkPagamento.addEventListener("change", function () {
    if (this.checked) {
      chkIsento.checked = false;
      chkIsento.disabled = true;
      chkDesistiu.checked = false;
      chkDesistiu.disabled = true;
      isentoSection.style.display = "none";
      desistiuSection.style.display = "none";
    } else {
      chkIsento.disabled = false;
      chkDesistiu.disabled = false;
    }
  });

  chkDesistiu.addEventListener("change", function () {
    const isDesistente = this.checked;
    desistiuSection.style.display = isDesistente ? "block" : "none";
    agendamentoSection.style.display = isDesistente ? "none" : "block";
    allCheckboxes.forEach((chk) => {
      if (chk.id !== "chk-desistiu") {
        chk.disabled = isDesistente;
        if (isDesistente) chk.checked = false;
      }
    });
    if (isDesistente) {
      chkIsento.checked = false;
      isentoSection.style.display = "none";
    }
  });
}

async function save(cardId, db) {
  const chkDesistiu = document.getElementById("chk-desistiu").checked;
  const desistiuMotivo = document
    .getElementById("desistencia-motivo")
    .value.trim();

  let dataToUpdate = {};
  let newStatus = "";

  if (chkDesistiu) {
    if (!desistiuMotivo) {
      alert("Por favor, informe o motivo da desistência.");
      return;
    }
    dataToUpdate = {
      status: "desistencia",
      desistenciaMotivo: desistiuMotivo,
      lastUpdate: new Date(),
    };
    newStatus = "Desistência";
  } else {
    const isento = document.getElementById("chk-isento").checked;
    const camposObrigatorios = {
      "chk-docs": "Enviar os documentos",
      "chk-confirmou": "Confirmar os dados",
      "chk-pasta": "Criar a pasta no Drive",
      "assistente-social": "Selecionar a assistente social",
      "tipo-triagem": "Selecionar o tipo de triagem",
      "data-triagem": "Informar a data da triagem",
      "hora-triagem": "Informar o horário da triagem",
    };
    if (!isento) camposObrigatorios["chk-pagamento"] = "Confirmar o pagamento";

    for (const [id, nome] of Object.entries(camposObrigatorios)) {
      const element = document.getElementById(id);
      if (
        (element.type === "checkbox" && !element.checked) ||
        (element.type !== "checkbox" && !element.value)
      ) {
        alert(`Campo obrigatório não preenchido: ${nome}`);
        return;
      }
    }

    dataToUpdate = {
      status: "triagem_agendada",
      isentoTriagem: isento,
      motivoIsencao: document.getElementById("isento-motivo").value.trim(),
      assistenteSocialNome: document.getElementById("assistente-social").value,
      assistenteSocialEmail: document.getElementById("assistente-email").value,
      tipoTriagem: document.getElementById("tipo-triagem").value,
      dataTriagem: document.getElementById("data-triagem").value,
      horaTriagem: document.getElementById("hora-triagem").value,
      lastUpdate: new Date(),
    };
    newStatus = "Triagem Agendada";
  }

  try {
    const saveButton = document.getElementById("modal-save-btn");
    saveButton.textContent = "Salvando...";
    saveButton.disabled = true;

    await db.collection("trilhaPaciente").doc(cardId).update(dataToUpdate);

    // **AQUI ESTÁ A CORREÇÃO**
    // A mensagem de alerta foi simplificada para não depender da variável externa.
    alert(`Paciente movido para a etapa "${newStatus}" com sucesso!`);
    document.getElementById("close-modal-btn").click();
  } catch (error) {
    console.error("Erro ao salvar dados do card:", error);
    alert("Ocorreu um erro ao salvar as informações. Tente novamente.");
  } finally {
    const saveButton = document.getElementById("modal-save-btn");
    if (saveButton) {
      saveButton.textContent = "Salvar";
      saveButton.disabled = false;
    }
  }
}
