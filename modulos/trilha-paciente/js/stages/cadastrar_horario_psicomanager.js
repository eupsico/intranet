// Arquivo: /modulos/trilha-paciente/js/stages/cadastrar_horario_psicomanager.js
// Versão: 3.0 (Modernizado para Firebase v9 e suporte a múltiplos atendimentos)

import {
  db,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "../../../../assets/js/firebase-init.js";

/**
 * Renderiza o conteúdo do modal para a etapa 'Cadastrar Horário Psicomanager'.
 * Exibe uma lista de todos os horários de profissionais que estão pendentes de cadastro.
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Objeto com todos os dados do paciente.
 */
export async function render(cardId, cardData) {
  const element = document.createElement("div");

  // 1. Filtra a lista de atendimentos para encontrar apenas os que precisam de cadastro.
  // A regra é: o atendimento está 'ativo', tem um 'horarioSessao' definido,
  // e ainda NÃO foi marcado como 'horarioCadastradoPsicomanager'.
  const atendimentosParaCadastrar =
    cardData.atendimentosPB?.filter(
      (at) =>
        at.statusAtendimento === "ativo" &&
        at.horarioSessao &&
        !at.horarioCadastradoPsicomanager
    ) || [];

  // Adiciona estilos para a formatação
  element.innerHTML = `
    <style>
      .info-grid { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; align-items: center; }
      .info-grid p { margin: 0; }
      .form-separator { margin: 20px 0; border: 0; border-top: 1px solid #eee; }
      .cadastro-item { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
      .cadastro-item h4 { margin-top: 0; color: #0056b3; }
    </style>
  `;

  if (atendimentosParaCadastrar.length === 0) {
    element.innerHTML += `
        <div class="info-message">
            <p><strong>Não há horários pendentes de cadastro para este paciente.</strong></p>
            <p>O card será movido para a próxima etapa se não houver mais pendências.</p>
        </div>
    `;
    return element;
  }

  // 2. Mapeia cada atendimento pendente para um bloco de HTML (uma "tarefa")
  const blocosHtml = atendimentosParaCadastrar
    .map((atendimento) => {
      const horarioInfo = atendimento.horarioSessao || {};
      const dataInicioFormatada = horarioInfo.dataInicio
        ? new Date(horarioInfo.dataInicio + "T03:00:00").toLocaleDateString(
            "pt-BR"
          )
        : "Não informada";

      return `
        <div class="cadastro-item">
            <h4>Resumo para Cadastro: ${atendimento.profissionalNome}</h4>
            <div class="info-grid">
                <p><strong>Paciente:</strong></p><p>${cardData.nomeCompleto}</p>
                <p><strong>Profissional:</strong></p><p>${
                  atendimento.profissionalNome
                }</p>
                <p><strong>Dia e Horário:</strong></p><p>${
                  horarioInfo.diaSemana || ""
                } às ${horarioInfo.horario || ""}</p>
                <p><strong>Data de Início:</strong></p><p>${dataInicioFormatada}</p>
                <p><strong>Alterar Grade:</strong></p><p>${
                  horarioInfo.alterarGrade || ""
                }</p>
                <p><strong>Sala:</strong></p><p>${
                  horarioInfo.salaAtendimento || ""
                }</p>
                <p><strong>Contribuição:</strong></p><p>${
                  cardData.valorContribuicao || "Não informado"
                }</p>
            </div>
            <hr class="form-separator">
            <div class="form-group">
                <label style="display: flex; align-items: center; font-weight: bold; cursor: pointer;">
                    <input type="checkbox" class="psicomanager-checkbox" data-atendimento-id="${
                      atendimento.atendimentoId
                    }" style="width: 20px; height: 20px; margin-right: 10px;">
                    Horário cadastrado na Psicomanager
                </label>
            </div>
        </div>
    `;
    })
    .join("");

  // 3. Monta o formulário final com todos os blocos
  element.innerHTML += `
    <form id="psicomanager-form" class="stage-form">
        ${blocosHtml}
    </form>
  `;

  return element;
}

/**
 * Salva os dados do formulário, marcando os horários selecionados como cadastrados.
 * Move o card para 'em_atendimento_pb' apenas quando não houver mais pendências.
 * @param {string} cardId - O ID do documento do paciente.
 * @param {object} cardData - Dados do paciente (usado para pegar nome do usuário logado).
 * @param {HTMLElement} modalBody - O corpo do modal, para encontrar os checkboxes.
 * @param {object} currentUserData - Dados do usuário logado.
 */
export async function save(cardId, cardData, modalBody, currentUserData) {
  // 1. Encontra todos os checkboxes que foram marcados pelo usuário
  const checkboxesMarcados = modalBody.querySelectorAll(
    ".psicomanager-checkbox:checked"
  );

  if (checkboxesMarcados.length === 0) {
    throw new Error(
      "Selecione ao menos um horário que foi cadastrado para salvar."
    );
  }

  const idsParaMarcar = Array.from(checkboxesMarcados).map(
    (cb) => cb.dataset.atendimentoId
  );
  const docRef = doc(db, "trilhaPaciente", cardId);

  // 2. Busca os dados mais recentes para garantir que não vamos sobrescrever nada
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Paciente não encontrado no banco de dados.");
  }

  const atendimentosAtuais = docSnap.data().atendimentosPB || [];

  // 3. Cria a nova lista de atendimentos, atualizando os que foram marcados
  const novosAtendimentos = atendimentosAtuais.map((atendimento) => {
    if (idsParaMarcar.includes(atendimento.atendimentoId)) {
      return {
        ...atendimento,
        horarioCadastradoPsicomanager: true,
        dataCadastroPsicomanager: new Date().toISOString().slice(0, 10), // Salva a data de hoje (YYYY-MM-DD)
        responsavelCadastroPsicomanager: currentUserData.nome || "N/A",
      };
    }
    return atendimento;
  });

  // 4. Verifica se ainda existem outros horários pendentes de cadastro
  const aindaExistemPendentes = novosAtendimentos.some(
    (at) =>
      at.statusAtendimento === "ativo" &&
      at.horarioSessao &&
      !at.horarioCadastradoPsicomanager
  );

  // 5. Prepara os dados para salvar
  const updateData = {
    atendimentosPB: novosAtendimentos,
    lastUpdate: serverTimestamp(),
    lastUpdatedBy: currentUserData.nome || "N/A",
  };

  // Se não houver mais pendências, o card avança para a próxima etapa
  if (!aindaExistemPendentes) {
    updateData.status = "em_atendimento_pb";
  }

  // 6. Salva as atualizações no Firestore
  await updateDoc(docRef, updateData);
}
