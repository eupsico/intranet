/**
 * Renderiza o conteúdo do modal para a etapa "Triagem Agendada".
 * @param {HTMLElement} modalBody - O corpo do modal onde o conteúdo será inserido.
 * @param {object} cardData - Os dados do card do paciente.
 * @param {object} db - A instância do Firestore.
 */
export function render(modalBody, cardData, db) {
  // Formata a data para o padrão brasileiro (dd/mm/yyyy)
  const dataTriagemFormatada = cardData.dataTriagem
    ? new Date(cardData.dataTriagem + "T00:00:00-03:00").toLocaleDateString(
        "pt-BR"
      )
    : "Data não informada";

  modalBody.innerHTML = `
        <h3 class="form-section-title">Confirmação do Agendamento</h3>
        <div class="confirmation-box">
Sua triagem será ${cardData.modalidadeTriagem || "não definido"}.

Paciente: ${cardData.nomeCompleto || "não informado"}
Data e Horário: ${dataTriagemFormatada} às ${
    cardData.horaTriagem || "não informado"
  }
Assistente Social: ${cardData.assistenteSocialNome || "não informado"}

Posso ajudar em algo mais?
        </div>
        <p>Este card será atualizado automaticamente pela assistente social após a realização da triagem na tela "Fila de Atendimento".</p>
    `;

  // Como esta etapa é apenas de visualização, o botão de salvar é desnecessário.
  const saveButton = document.getElementById("modal-save-btn");
  saveButton.style.display = "none";
}
