// Arquivo: /modulos/trilha-paciente/js/stages/cadastrar_horario_psicomanager.js
// Versão: 2.1 (Ajustes de layout e preenchimento automático do nome)

import { db } from "../../../../assets/js/firebase-init.js";

/**
 * Renderiza o conteúdo do modal para a etapa 'Cadastrar Horário Psicomanager'.
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Objeto com todos os dados do paciente.
 * @param {object} currentUserData - Dados do usuário logado.
 * @returns {HTMLElement} - O elemento HTML para ser inserido no corpo do modal.
 */
export async function render(cardId, cardData, currentUserData) {
  const pbInfo = cardData.pbInfo || {};
  const horarioInfo = pbInfo.horarioSessao || {};

  const element = document.createElement("div");

  // Adiciona um estilo para o layout em grade
  const style = document.createElement("style");
  style.textContent = `
    .info-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 16px;
      align-items: center;
    }
    .info-grid p {
      margin: 0;
    }
    .form-separator {
      margin-top: 20px;
      margin-bottom: 20px;
      border: 0;
      border-top: 1px solid #eee;
    }
  `;
  element.appendChild(style);

  // Constrói o HTML com o novo layout
  element.innerHTML += `
    <div class="patient-info-box confirmation">
        <h4>Resumo para Cadastro na Psicomanager</h4>
        <div class="info-grid">
            <p><strong>Nome Paciente:</strong></p><p>${
              cardData.nomeCompleto || "Não informado"
            }</p>
            <p><strong>Nome Profissional:</strong></p><p>${
              pbInfo.profissionalNome || "Não informado"
            }</p>
            <p><strong>Dia e Horário da Sessão:</strong></p><p>${
              horarioInfo.diaSemana || ""
            } às ${horarioInfo.horario || ""}</p>
            <p><strong>Tipo de Atendimento:</strong></p><p>${
              horarioInfo.tipoAtendimento || ""
            }</p>
            <p><strong>Cadastrar a partir de:</strong></p><p>${
              horarioInfo.dataInicio
                ? new Date(
                    horarioInfo.dataInicio + "T00:00:00"
                  ).toLocaleDateString("pt-BR")
                : ""
            }</p>
            <p><strong>Será preciso alterar Grade:</strong></p><p>${
              horarioInfo.alterarGrade || ""
            }</p>
            <p><strong>Sala de Atendimento:</strong></p><p>${
              horarioInfo.salaAtendimento || ""
            }</p>
            <p><strong>Contribuição:</strong></p><p>R$ ${
              cardData.valorContribuicao || "Não informado"
            }</p>
        </div>
    </div>

    <hr class="form-separator">

    <form id="psicomanager-form" class="stage-form">
        <div class="form-group">
            <label for="atendente-nome">Nome do Atendente:</label>
            <input type="text" id="atendente-nome" class="form-control" value="${
              currentUserData.nome || "Usuário não identificado"
            }" readonly>
        </div>
        <div class="form-group">
            <label for="data-cadastro-psicomanager">Informe a data que o cadastro foi realizado na Psicomanager:</label>
            <input type="date" id="data-cadastro-psicomanager" class="form-control" required>
        </div>
    </form>
  `;

  return element;
}

/**
 * Salva os dados do formulário da etapa 'Cadastrar Horário Psicomanager'.
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} currentUserData - Dados do usuário logado.
 */
export async function save(cardId, currentUserData) {
  const dataCadastro = document.getElementById(
    "data-cadastro-psicomanager"
  ).value;

  if (!dataCadastro) {
    throw new Error("A data de cadastro é obrigatória.");
  }

  const updateData = {
    status: "em_atendimento_pb",
    "pbInfo.dataCadastroPsicomanager": dataCadastro,
    "pbInfo.responsavelCadastroPsicomanager": currentUserData.nome || "N/A",
    lastUpdate: new Date(),
    lastUpdatedBy: currentUserData.nome || "N/A",
  };

  await db.collection("trilhaPaciente").doc(cardId).update(updateData);
}
