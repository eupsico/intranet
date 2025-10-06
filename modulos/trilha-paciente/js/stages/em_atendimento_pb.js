// Arquivo: /modulos/trilha-paciente/js/stages/em_atendimento_pb.js

/**
 * Renderiza o formulário para a etapa "Em Atendimento (PB)".
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Objeto com todos os dados do paciente.
 * @returns {HTMLElement} - O elemento HTML com o formulário.
 */
export function render(cardId, cardData) {
  const element = document.createElement("div");
  const pbInfo = cardData.pbInfo || {};
  const contratoInfo = cardData.contratoAssinado; // Usando o objeto que você mostrou na sua função

  let dataAssinatura = "Não assinado";
  if (contratoInfo && contratoInfo.assinadoEm) {
    // Converte o Timestamp do Firestore para uma data legível
    dataAssinatura = new Date(
      contratoInfo.assinadoEm.seconds * 1000
    ).toLocaleDateString("pt-BR");
  }

  element.innerHTML = `
    <div class="patient-info-box info">
        <p><strong>Nome do Paciente:</strong> ${
          cardData.nomeCompleto || "Não informado"
        }</p>
        <p><strong>Profissional Responsável:</strong> ${
          pbInfo.profissionalNome || "Não informado"
        }</p>
        <p><strong>Valor de Contribuição:</strong> R$ ${
          cardData.valorContribuicao || "0,00"
        }</p>
    </div>

    <div class="contract-link-box ${contratoInfo ? "success" : "warning"}">
        <p>
            <i class="fas ${
              contratoInfo ? "fa-file-signature" : "fa-exclamation-triangle"
            }"></i>
            Status do Contrato: <strong>${
              contratoInfo
                ? `Assinado em ${dataAssinatura}`
                : "Aguardando Assinatura"
            }</strong>
        </p>
        ${
          contratoInfo
            ? `<small>Signatário: ${
                contratoInfo.nomeSignatario || "N/A"
              }</small>`
            : ""
        }
    </div>

    <hr>
    
    <form id="desfecho-pb-form" class="dynamic-form">
        <div class="form-group">
            <label for="desfecho-pb-select">Qual foi o desfecho do acompanhamento?</label>
            <select id="desfecho-pb-select" class="form-control" required>
                <option value="">Selecione uma opção...</option>
                <option value="Alta">Alta</option>
                <option value="Desistência">Desistência</option>
                <option value="Encaminhamento">Encaminhar para outro serviço</option>
            </select>
        </div>

        <div id="motivo-desfecho-container" class="form-group hidden">
            <label for="motivo-desfecho-textarea">Descreva brevemente os motivos que levaram a este desfecho:</label>
            <textarea id="motivo-desfecho-textarea" class="form-control" rows="4" required placeholder="Forneça um breve resumo do caso e a justificativa para o desfecho selecionado."></textarea>
        </div>
        
        <div id="encaminhamento-pb-container" class="hidden">
            <p class="description-box">Preencha os detalhes para o novo encaminhamento:</p>
            <div class="form-group">
                <label for="encaminhamento-servico">Serviço de Encaminhamento:</label>
                <input type="text" id="encaminhamento-servico" class="form-control" placeholder="Ex: Psiquiatria, Atendimento Social, etc.">
            </div>
             <div class="form-group">
                <label for="encaminhamento-observacoes">Observações (opcional):</label>
                <textarea id="encaminhamento-observacoes" class="form-control" rows="3"></textarea>
            </div>
        </div>
    </form>
  `;

  // Adiciona a lógica para mostrar/ocultar campos dinamicamente
  const desfechoSelect = element.querySelector("#desfecho-pb-select");
  const motivoContainer = element.querySelector("#motivo-desfecho-container");
  const encaminhamentoContainer = element.querySelector(
    "#encaminhamento-pb-container"
  );

  desfechoSelect.addEventListener("change", () => {
    const value = desfechoSelect.value;
    motivoContainer.classList.toggle("hidden", !value);
    encaminhamentoContainer.classList.toggle(
      "hidden",
      value !== "Encaminhamento"
    );
    encaminhamentoContainer.querySelector("#encaminhamento-servico").required =
      value === "Encaminhamento";
  });

  return element;
}

/**
 * Salva os dados do desfecho do atendimento em PB.
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Objeto com os dados do paciente.
 * @param {HTMLElement} modalBody - O corpo do modal contendo o formulário.
 */
export async function save(cardId, cardData, modalBody) {
  const desfecho = modalBody.querySelector("#desfecho-pb-select").value;
  const motivo = modalBody.querySelector("#motivo-desfecho-textarea").value;

  if (!desfecho || !motivo) {
    throw new Error("Por favor, preencha todos os campos obrigatórios.");
  }

  const payload = {
    pacienteId: cardId,
    desfecho: desfecho,
    motivo: motivo,
    profissionalNome: cardData.pbInfo?.profissionalNome || "Não informado",
  };

  if (desfecho === "Encaminhamento") {
    const servico = modalBody.querySelector("#encaminhamento-servico").value;
    const observacoes = modalBody.querySelector(
      "#encaminhamento-observacoes"
    ).value;
    if (!servico) {
      throw new Error("O serviço de encaminhamento é obrigatório.");
    }
    payload.encaminhamento = { servico, observacoes };
  }

  // Chama a Cloud Function 'registrarDesfechoPb' que já criamos anteriormente
  const registrarDesfechoPb = firebase
    .functions()
    .httpsCallable("registrarDesfechoPb");

  const result = await registrarDesfechoPb(payload);
  if (!result.data.success) {
    throw new Error(result.data.message || "Ocorreu um erro no servidor.");
  }
}
