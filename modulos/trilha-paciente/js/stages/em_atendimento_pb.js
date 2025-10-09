// Arquivo: /modulos/trilha-paciente/js/stages/em_atendimento_pb.js
// Versão: 2.0 (Atualizado para Firebase v9 e suporte a múltiplos atendimentos)

import {
  getFunctions,
  httpsCallable,
} from "../../../../assets/js/firebase-init.js";

/**
 * Renderiza o formulário para a etapa "Em Atendimento (PB)".
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Objeto com todos os dados do paciente.
 * @returns {HTMLElement} - O elemento HTML com o formulário.
 */
export function render(cardId, cardData) {
  const element = document.createElement("div");

  // 1. Filtra para encontrar todos os atendimentos que estão atualmente ativos.
  const atendimentosAtivos =
    cardData.atendimentosPB?.filter((at) => at.statusAtendimento === "ativo") ||
    [];

  // Cria as opções do <select> com base nos atendimentos ativos
  const optionsHtml = atendimentosAtivos
    .map(
      (at) =>
        `<option value="${at.atendimentoId}">${at.profissionalNome}</option>`
    )
    .join("");

  element.innerHTML = `
    <div class="patient-info-box info">
        <p><strong>Paciente:</strong> ${
          cardData.nomeCompleto || "Não informado"
        }</p>
        <p><strong>Contribuição:</strong> R$ ${
          cardData.valorContribuicao || "0,00"
        }</p>
    </div>

    <form id="desfecho-pb-form" class="dynamic-form">
        <div class="form-group">
            <label for="profissional-desfecho-select">Selecione o profissional para registrar o desfecho:</label>
            <select id="profissional-desfecho-select" class="form-control" required>
                <option value="">Selecione um profissional...</option>
                ${optionsHtml}
            </select>
        </div>

        <div id="contrato-status-box"></div>

        <fieldset id="desfecho-fieldset" disabled>
            <hr>
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
                <label for="motivo-desfecho-textarea">Descreva brevemente os motivos:</label>
                <textarea id="motivo-desfecho-textarea" class="form-control" rows="4" required placeholder="Forneça um breve resumo do caso e a justificativa..."></textarea>
            </div>
            <div id="encaminhamento-pb-container" class="hidden">
                 <div class="form-group">
                    <label for="encaminhamento-servico">Serviço de Encaminhamento:</label>
                    <input type="text" id="encaminhamento-servico" class="form-control" placeholder="Ex: Psiquiatria, Atendimento Social, etc.">
                </div>
                 <div class="form-group">
                    <label for="encaminhamento-observacoes">Observações (opcional):</label>
                    <textarea id="encaminhamento-observacoes" class="form-control" rows="3"></textarea>
                </div>
            </div>
        </fieldset>
    </form>
  `;

  // --- Lógica interna do formulário ---
  const profissionalSelect = element.querySelector(
    "#profissional-desfecho-select"
  );
  const desfechoFieldset = element.querySelector("#desfecho-fieldset");
  const desfechoSelect = element.querySelector("#desfecho-pb-select");
  const motivoContainer = element.querySelector("#motivo-desfecho-container");
  const encaminhamentoContainer = element.querySelector(
    "#encaminhamento-pb-container"
  );
  const contratoStatusBox = element.querySelector("#contrato-status-box");

  // Habilita o formulário quando um profissional é selecionado
  profissionalSelect.addEventListener("change", () => {
    const atendimentoId = profissionalSelect.value;
    if (atendimentoId) {
      desfechoFieldset.disabled = false;
      const atendimentoSelecionado = atendimentosAtivos.find(
        (at) => at.atendimentoId === atendimentoId
      );

      // Atualiza o status do contrato para o profissional selecionado
      const contratoInfo = cardData.contratoAssinado;
      let dataAssinatura = "Não assinado";
      if (contratoInfo && contratoInfo.assinadoEm) {
        dataAssinatura = new Date(
          contratoInfo.assinadoEm.seconds * 1000
        ).toLocaleDateString("pt-BR");
      }
      contratoStatusBox.innerHTML = `
        <div class="contract-link-box ${
          contratoInfo ? "success" : "warning"
        }" style="margin-top:15px;">
            <p>Status do Contrato: <strong>${
              contratoInfo
                ? `Assinado em ${dataAssinatura}`
                : "Aguardando Assinatura"
            }</strong></p>
        </div>
      `;
    } else {
      desfechoFieldset.disabled = true;
      contratoStatusBox.innerHTML = "";
    }
  });

  // Mostra/oculta campos de motivo e encaminhamento
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
 * Salva os dados do desfecho, chamando uma Cloud Function.
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Objeto com todos os dados do paciente.
 * @param {HTMLElement} modalBody - O corpo do modal contendo o formulário.
 */
export async function save(cardId, cardData, modalBody) {
  const atendimentoId = modalBody.querySelector(
    "#profissional-desfecho-select"
  ).value;
  const desfecho = modalBody.querySelector("#desfecho-pb-select").value;
  const motivo = modalBody.querySelector("#motivo-desfecho-textarea").value;

  if (!atendimentoId) {
    throw new Error(
      "Por favor, selecione o profissional para registrar o desfecho."
    );
  }
  if (!desfecho || !motivo) {
    throw new Error(
      "Por favor, preencha todos os campos obrigatórios do desfecho."
    );
  }

  // Prepara os dados para enviar para a Cloud Function
  const payload = {
    pacienteId: cardId,
    atendimentoId: atendimentoId, // Envia o ID do atendimento específico
    desfecho: desfecho,
    motivo: motivo,
  };

  if (desfecho === "Encaminhamento") {
    const servico = modalBody.querySelector("#encaminhamento-servico").value;
    if (!servico) {
      throw new Error("O serviço de encaminhamento é obrigatório.");
    }
    payload.encaminhamento = {
      servico,
      observacoes: modalBody.querySelector("#encaminhamento-observacoes").value,
    };
  }

  // --- ATUALIZADO: Chamada da Cloud Function com a sintaxe do Firebase v9 ---
  try {
    const functions = getFunctions();
    const registrarDesfechoPb = httpsCallable(functions, "registrarDesfechoPb");

    const result = await registrarDesfechoPb(payload);

    if (!result.data.success) {
      throw new Error(result.data.message || "Ocorreu um erro no servidor.");
    }
    console.log("Desfecho registrado com sucesso!");
  } catch (error) {
    console.error(
      "Erro ao chamar a Cloud Function 'registrarDesfechoPb':",
      error
    );
    throw new Error(`Falha ao registrar desfecho: ${error.message}`);
  }
}
