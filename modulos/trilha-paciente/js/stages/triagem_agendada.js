// Arquivo: /modulos/trilha-paciente/js/stages/triagem_agendada.js
// Versão Corrigida: 2.0 (Padronizado com render)

/**
 * Renderiza o conteúdo do modal para a etapa "Triagem Agendada".
 * Esta etapa é apenas para visualização.
 * @param {string} cardId - O ID do documento do paciente.
 * @param {string} patientName - O nome do paciente.
 * @param {object} cardData - Objeto com todos os dados do paciente.
 * @returns {HTMLElement} - O elemento HTML para ser inserido no corpo do modal.
 */
export async function render(cardId, patientName, cardData) {
  const element = document.createElement("div");

  // Formata a data para o padrão brasileiro (dd/mm/yyyy), tratando a timezone
  const dataTriagemFormatada = cardData.dataTriagem
    ? new Date(cardData.dataTriagem + "T03:00:00").toLocaleDateString("pt-BR")
    : "Data não informada";

  element.innerHTML = `
        <h3 class="form-section-title">Confirmação do Agendamento</h3>
        <div class="confirmation-box">
            Sua triagem será ${cardData.tipoTriagem || "não definido"}.<br><br>
            <strong>Paciente:</strong> ${
              cardData.nomeCompleto || "não informado"
            }<br>
            <strong>Data e Horário:</strong> ${dataTriagemFormatada} às ${
    cardData.horaTriagem || "não informado"
  }<br>
            <strong>Assistente Social:</strong> ${
              cardData.assistenteSocialNome || "não informado"
            }<br><br>
            Posso ajudar em algo mais?
        </div>
        <p>Este card será atualizado automaticamente pela assistente social após a realização da triagem na tela "Fila de Atendimento".</p>
    `;

  // Como esta etapa é apenas de visualização, a função save não será exportada,
  // e o botão Salvar será escondido pelo trilha-paciente.js.

  return element;
}
