// Arquivo: modulos/trilha-paciente/js/stages/2-triagem-agendada.js
// Versão: 2.0 (Exibe os dados de confirmação e os detalhes do agendamento)

/**
 * Renderiza o conteúdo do modal para a etapa "Triagem Agendada".
 * @param {HTMLElement} modalBody - O corpo do modal onde o conteúdo será inserido.
 * @param {object} cardData - Os dados do card do paciente.
 * @param {object} db - A instância do Firestore.
 */
export function render(modalBody, cardData, db) {
  const responsavelInfo =
    cardData.responsavel && cardData.responsavel.nome
      ? `<strong>Responsável:</strong> ${cardData.responsavel.nome}<br>`
      : "";
  const dataNascimentoFormatada = cardData.dataNascimento
    ? new Date(cardData.dataNascimento + "T03:00:00").toLocaleDateString(
        "pt-BR"
      )
    : "Não informada";
  const dataTriagemFormatada = cardData.dataTriagem
    ? new Date(cardData.dataTriagem + "T03:00:00").toLocaleDateString("pt-BR")
    : "Não informada";

  modalBody.innerHTML = `
        <h3 class="form-section-title">Confirmação de Dados e Agendamento</h3>
        <div class="confirmation-box" id="confirmation-text">
            <p>
                <strong>Nome:</strong> ${cardData.nomeCompleto}<br>
                <strong>Data de Nascimento:</strong> ${dataNascimentoFormatada}<br>
                ${responsavelInfo}
                <strong>Telefone:</strong> ${cardData.telefoneCelular}<br>
                <strong>CPF:</strong> ${cardData.cpf}<br>
                <strong>E-mail:</strong> ${cardData.email}
            </p>
            <hr>
            <p><strong>Detalhes da Triagem Agendada:</strong></p>
            <p>
                <strong>Assistente Social:</strong> ${
                  cardData.assistenteSocialNome || "Não informada"
                }<br>
                <strong>Tipo de Triagem:</strong> ${
                  cardData.tipoTriagem || "Não informado"
                }<br>
                <strong>Data e Horário:</strong> ${dataTriagemFormatada} às ${
    cardData.horaTriagem || "Não informado"
  }
            </p>
        </div>

        <div class="info-note">
            <p>Este card foi preenchido e agendado automaticamente pelo paciente. A assistente social deve realizar a triagem e, em seguida, preencher a "Ficha de Atendimento" no módulo de Serviço Social para mover o paciente para a próxima etapa.</p>
        </div>
    `;

  // Esconde os botões de Salvar e Cancelar
  const saveButton = document.getElementById("modal-save-btn");
  const cancelButton = document.getElementById("modal-cancel-btn");
  if (saveButton) saveButton.style.display = "none";
  if (cancelButton) cancelButton.style.display = "none";
}
