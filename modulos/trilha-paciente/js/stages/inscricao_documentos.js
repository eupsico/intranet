// Arquivo: /modulos/trilha-paciente/js/stages/inscricao_documentos.js
// Versão: 9.0 (Migração para a sintaxe modular do Firebase v9)

// 1. Importa todas as funções necessárias do nosso arquivo de configuração central
import {
  db,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "../../../../assets/js/firebase-init.js";

/**
 * Renderiza o conteúdo do modal para a etapa "Inscrição e Documentos".
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Objeto com todos os dados do paciente.
 * @returns {HTMLElement} - O elemento HTML para ser inserido no corpo do modal.
 */
export async function render(cardId, cardData, currentUserData) {
  const element = document.createElement("div");

  const responsavelInfo =
    cardData.responsavel && cardData.responsavel.nome
      ? `<strong>Responsável:</strong> ${cardData.responsavel.nome}`
      : "";

  const dataNascimentoFormatada = cardData.dataNascimento
    ? new Date(cardData.dataNascimento + "T03:00:00").toLocaleDateString(
        "pt-BR"
      )
    : "Não informada";

  element.innerHTML = `
    <h3 class="form-section-title">Confirmação de Dados</h3>
    <div class="confirmation-box" id="confirmation-text">
        <strong>Nome:</strong> ${cardData.nomeCompleto}<br>
        <strong>Data de Nascimento:</strong> ${dataNascimentoFormatada}<br>
        <strong>Telefone:</strong> ${cardData.telefoneCelular}<br>
        <strong>CPF:</strong> ${cardData.cpf}<br>
        <strong>E-mail:</strong> ${cardData.email}<br>
        ${responsavelInfo}
    </div>
    <p>Copie o texto acima e envie para o paciente para confirmação.</p>

    <form id="inscricao-form" class="stage-form">
        <h3 class="form-section-title">Checklist para Agendar Triagem</h3>
        <div class="checklist-group">
            <div class="form-grid-2-col">
                <div class="form-group"><label><input type="checkbox" id="chk-docs" name="checklist"> Enviou os documentos</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-confirmou" name="checklist"> Confirmou os dados</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-pasta" name="checklist"> Criou Pasta no Drive</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-pagamento" name="checklist"> Efetuou o pagamento</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-isento" name="checklist"> Isento da triagem</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-desistiu" name="checklist"> Desistiu do processo</label></div>
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
                <div class="form-group">
                    <label for="assistente-social">Nome da Assistente Social</label>
                    <select id="assistente-social" class="form-control" required><option value="">Carregando...</option></select>
                </div>
                <div class="form-group">
                    <label for="assistente-email">E-mail da Assistente Social</label>
                    <input type="email" id="assistente-email" class="form-control" disabled>
                </div>
            </div>
            <div class="form-grid-3-col">
                <div class="form-group">
                    <label for="tipo-triagem">Tipo de Triagem</label>
                    <select id="tipo-triagem" class="form-control" required>
                        <option value="">Selecione...</option>
                        <option value="Online">Online</option>
                        <option value="Presencial">Presencial</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="data-triagem">Data da Triagem</label>
                    <input type="date" id="data-triagem" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="hora-triagem">Horário da Triagem</label>
                    <input type="time" id="hora-triagem" class="form-control" required>
                </div>
            </div>
        </div>
    </form>
  `;

  loadAssistentesSociais(element);
  setupEventListeners(element);

  return element;
}

/**
 * Salva os dados do formulário da etapa "Inscrição e Documentos".
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Os dados atuais do paciente.
 * @param {HTMLElement} modalBody - O corpo do modal, contendo o formulário.
 */
export async function save(cardId, cardData, modalBody) {
  const chkDesistiu = modalBody.querySelector("#chk-desistiu").checked;
  const desistiuMotivo = modalBody
    .querySelector("#desistencia-motivo")
    .value.trim();

  let dataToUpdate = {};

  if (chkDesistiu) {
    if (!desistiuMotivo) {
      throw new Error("Por favor, informe o motivo da desistência.");
    }
    dataToUpdate = {
      status: "desistencia",
      desistenciaMotivo: desistiuMotivo,
    };
  } else {
    const isento = modalBody.querySelector("#chk-isento").checked;
    const camposObrigatorios = {
      "chk-docs": "Enviar os documentos",
      "chk-confirmou": "Confirmar os dados",
      "chk-pasta": "Criar a pasta no Drive",
      "assistente-social": "Selecionar a assistente social",
      "tipo-triagem": "Selecionar o tipo de triagem",
      "data-triagem": "Informar a data da triagem",
      "hora-triagem": "Informar o horário da triagem",
    };
    if (!isento) {
      camposObrigatorios["chk-pagamento"] = "Confirmar o pagamento";
    }

    for (const [id, nome] of Object.entries(camposObrigatorios)) {
      const element = modalBody.querySelector(`#${id}`);
      if (
        (element.type === "checkbox" && !element.checked) ||
        (element.type !== "checkbox" && !element.value)
      ) {
        throw new Error(`Campo obrigatório não preenchido: ${nome}`);
      }
    }

    const assistenteSelect = modalBody.querySelector("#assistente-social");
    const assistenteNome =
      assistenteSelect.options[assistenteSelect.selectedIndex].text;
    const assistenteEmail =
      assistenteSelect.options[assistenteSelect.selectedIndex].dataset.email;

    dataToUpdate = {
      status: "triagem_agendada",
      isentoTriagem: isento,
      motivoIsencao: modalBody.querySelector("#isento-motivo").value.trim(),
      assistenteSocialNome: assistenteNome,
      assistenteSocialEmail: assistenteEmail,
      tipoTriagem: modalBody.querySelector("#tipo-triagem").value,
      dataTriagem: modalBody.querySelector("#data-triagem").value,
      horaTriagem: modalBody.querySelector("#hora-triagem").value,
    };
  }

  dataToUpdate.lastUpdate = new Date();
  dataToUpdate.lastUpdatedBy = cardData.nome || "N/A";

  const docRef = doc(db, "trilhaPaciente", cardId);
  await updateDoc(docRef, dataToUpdate);
}

// --- Funções Auxiliares ---

async function loadAssistentesSociais(element) {
  const select = element.querySelector("#assistente-social");
  const emailInput = element.querySelector("#assistente-email");

  try {
    const usuariosRef = collection(db, "usuarios");
    const q = query(
      usuariosRef,
      where("funcoes", "array-contains", "servico_social"),
      where("inativo", "==", false)
    );
    const snapshot = await getDocs(q);

    select.innerHTML = '<option value="">Selecione...</option>';
    const assistentes = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      assistentes.push({ id: doc.id, nome: data.nome, email: data.email });
    });

    assistentes.sort((a, b) => a.nome.localeCompare(b.nome));
    assistentes.forEach((assistente) => {
      const option = document.createElement("option");
      option.value = assistente.id; // Salva o ID no valor
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

function setupEventListeners(element) {
  const chkPagamento = element.querySelector("#chk-pagamento");
  const chkIsento = element.querySelector("#chk-isento");
  const chkDesistiu = element.querySelector("#chk-desistiu");
  const isentoSection = element.querySelector("#isento-motivo-section");
  const desistiuSection = element.querySelector("#desistencia-motivo-section");
  const agendamentoSection = element.querySelector("#agendamento-section");
  const allCheckboxes = element.querySelectorAll('input[name="checklist"]');

  chkIsento.addEventListener("change", function () {
    isentoSection.style.display = this.checked ? "block" : "none";
    if (this.checked) {
      chkPagamento.checked = false;
      chkPagamento.disabled = true;
      chkDesistiu.checked = false;
      chkDesistiu.disabled = true;
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

    if (!isDesistente) {
      // Reabilita os outros checkboxes se desistência for desmarcada
      chkIsento.disabled = false;
      chkPagamento.disabled = false;
    }
  });
}
