// Arquivo: /modulos/trilha-paciente/js/stages/inscricao_documentos.js
// Versão: 9.1 (Ajusta a lógica do formulário e desabilita o agendamento manual)

import {
  db,
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "../../../../assets/js/firebase-init.js";

/**
 * Renderiza o conteúdo do modal para a etapa "Inscrição e Documentos".
 */
export async function render(cardId, cardData, currentUserData) {
  const element = document.createElement("div");

  const responsavelInfo = cardData.responsavel?.nome
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
        <h3 class="form-section-title">Checklist de Documentos</h3>
        <div class="checklist-group">
            <div class="form-grid-2-col">
                <div class="form-group"><label><input type="checkbox" id="chk-docs" name="checklist"> Enviou os documentos</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-confirmou" name="checklist"> Confirmou os dados</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-pasta" name="checklist"> Criou Pasta no Drive</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-pagamento" name="checklist"> Efetuou o pagamento</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-isento" name="checklist"> Isento da triagem</label></div>
                <div class="form-group"><label><input type="checkbox" id="chk-desistiu" name="checklist"> Desistiu do processo</label></div>
            </div>
            
            <div id="isento-motivo-section" class="form-group" style="display: none;">
                <label for="isento-motivo">Informe o motivo da isenção:</label>
                <textarea id="isento-motivo" class="form-control"></textarea>
            </div>
            
            <div id="desistencia-motivo-section" class="form-group" style="display: none;">
                <label for="desistencia-motivo">Informe o motivo da desistência:</label>
                <textarea id="desistencia-motivo" class="form-control"></textarea>
            </div>
        </div>

        <div id="agendamento-section">
            <h3 class="form-section-title">Agendamento da Triagem</h3>
            <fieldset disabled>
                <p class="info-message">O agendamento da triagem agora é realizado pelo próprio paciente através do link público.</p>
                <div class="form-group">
                    <label>Assistente Social</label>
                    <input type="text" class="form-control" placeholder="Será definido no agendamento" readonly>
                </div>
                <div class="form-grid-3-col">
                    <div class="form-group">
                        <label>Tipo de Triagem</label>
                        <input type="text" class="form-control" placeholder="Será definido no agendamento" readonly>
                    </div>
                    <div class="form-group">
                        <label>Data da Triagem</label>
                        <input type="date" class="form-control" readonly>
                    </div>
                    <div class="form-group">
                        <label>Horário da Triagem</label>
                        <input type="time" class="form-control" readonly>
                    </div>
                </div>
            </fieldset>
        </div>
    </form>
  `;

  setupEventListeners(element);

  return element;
}

/**
 * Salva os dados do formulário da etapa "Inscrição e Documentos".
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
    };
    if (!isento) {
      camposObrigatorios["chk-pagamento"] = "Confirmar o pagamento";
    }

    for (const [id, nome] of Object.entries(camposObrigatorios)) {
      const element = modalBody.querySelector(`#${id}`);
      if (!element.checked) {
        throw new Error(`Checklist incompleto: ${nome}`);
      }
    }

    dataToUpdate = {
      // NOVO STATUS: Move o paciente para a fila de espera do agendamento público
      status: "aguardando_agendamento_triagem",
      isentoTriagem: isento,
      motivoIsencao: isento
        ? modalBody.querySelector("#isento-motivo").value.trim()
        : "",
    };
  }

  dataToUpdate.lastUpdate = new Date();
  dataToUpdate.lastUpdatedBy = cardData.nome || "N/A";

  const docRef = doc(db, "trilhaPaciente", cardId);
  await updateDoc(docRef, dataToUpdate);
}

// --- Funções Auxiliares ---

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
    } else {
      chkPagamento.disabled = chkDesistiu.checked;
    }
  });

  chkDesistiu.addEventListener("change", function () {
    const isDesistente = this.checked;
    desistiuSection.style.display = isDesistente ? "block" : "none";
    agendamentoSection.style.display = isDesistente ? "none" : "block";

    allCheckboxes.forEach((chk) => {
      if (chk.id !== "chk-desistiu") {
        chk.disabled = isDesistente;
        if (isDesistente) {
          chk.checked = false;
        }
      }
    });
    // Garante que as seções de motivo sejam escondidas se a desistência for desmarcada
    if (!isDesistente) {
      isentoSection.style.display = chkIsento.checked ? "block" : "none";
    }
  });
}
