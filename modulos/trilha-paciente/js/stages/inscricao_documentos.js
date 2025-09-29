// Arquivo: modulos/trilha-paciente/js/stages/1-inscricao-documentos.js
// Versão: 2.0 (Simplificado para ser apenas informativo)

/**
 * Renderiza o conteúdo do modal para a etapa "Inscrição e Documentos".
 * @param {HTMLElement} modalBody - O corpo do modal onde o conteúdo será inserido.
 * @param {object} cardData - Os dados do card do paciente.
 * @param {object} db - A instância do Firestore.
 */
export function render(modalBody, cardData, db) {
  modalBody.innerHTML = `
        <h3 class="form-section-title">Aguardando Documentos</h3>
        <div class="info-note" style="border-left-color: var(--cor-alerta);">
            <p><strong>Próximo Passo:</strong></p>
            <p>A assistente social deve entrar em contato com o paciente para solicitar os seguintes documentos:</p>
            <ul>
                <li>RG e CPF (do paciente e/ou responsável)</li>
                <li>Comprovante de endereço atualizado</li>
                <li>Comprovante de renda atualizado</li>
            </ul>
            <p>Após o recebimento, os documentos devem ser salvos na pasta correta no Google Drive do Serviço Social.</p>
        </div>
        <p>Esta etapa é apenas informativa. A próxima ação será realizada na ficha de inscrição pública pelo próprio paciente ao agendar a triagem.</p>
    `;

  // Esconde os botões de Salvar e Cancelar, pois não há ação a ser feita aqui.
  const saveButton = document.getElementById("modal-save-btn");
  const cancelButton = document.getElementById("modal-cancel-btn");
  if (saveButton) saveButton.style.display = "none";
  if (cancelButton) cancelButton.style.display = "none";
}
