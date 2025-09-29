// Arquivo: modulos/trilha-paciente/js/stages/2-triagem-agendada.js

export function render(cardData, modalContent, context) {
  modalContent.innerHTML = `
        <div class="info-copy-box">
            <h4>🎉 Tudo pronto para a triagem! Seguem os detalhes:</h4>
            <p>
                Sua triagem será <strong>${cardData.tipoTriagem}</strong>.<br>
                <strong>Paciente:</strong> ${cardData.nomeCompleto}<br>
                <strong>Data e horário:</strong> ${new Date(
                  cardData.dataTriagem + "T" + cardData.horaTriagem
                ).toLocaleDateString("pt-BR")} às ${cardData.horaTriagem}<br>
                <strong>Assistente Social:</strong> ${
                  cardData.assistenteSocialNome
                }
            </p>
            <p><em>Posso ajudar em algo mais?</em></p>
        </div>
        <p>Aguardando preenchimento da ficha de triagem pela assistente social no módulo de Serviço Social...</p>
    `;
}

export function initListeners(cardData, modalContent, context) {
  // Nenhuma ação necessária aqui
}
