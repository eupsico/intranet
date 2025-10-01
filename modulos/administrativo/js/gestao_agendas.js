// Arquivo: /modulos/administrativo/js/gestao_agendas.js
// Versão: 2.0 (Solução Definitiva)
// Descrição: Adiciona uma função 'destroy' para limpar o estado do módulo ao sair da view.

import { functions } from "../../../assets/js/firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";

let agendaModalInstance = null;
let currentAgendaConfig = {};
// ### NOVO: Referência ao AbortController para limpar o event listener ###
let saveButtonController = null;

// Função de inicialização do módulo
export function init() {
  console.log("Módulo de Gestão de Agendas iniciado.");
  carregarDisponibilidadeAdmin();
}

// ### NOVO: Função de limpeza para ser chamada ao sair da view ###
export function destroy() {
  console.log("Destruindo módulo de Gestão de Agendas.");
  if (agendaModalInstance) {
    agendaModalInstance.dispose();
    agendaModalInstance = null;
  }
  // Remove o event listener do botão de salvar se ele existir
  if (saveButtonController) {
    saveButtonController.abort();
  }
  // Remove qualquer outro listener ou estado se necessário
}

function showFeedbackModal(message, isSuccess = true) {
  const modal = new bootstrap.Modal(document.getElementById("feedbackModal"));
  const modalTitle = document.getElementById("feedbackModalLabel");
  const modalBody = document.getElementById("feedbackModalBody");
  const modalHeader = modalTitle.parentElement;

  modalTitle.textContent = isSuccess ? "Sucesso!" : "Erro!";
  modalBody.innerHTML = message;

  modalHeader.className = "modal-header";
  modalHeader.classList.add(
    isSuccess ? "bg-success" : "bg-danger",
    "text-white"
  );

  modal.show();
}

async function carregarDisponibilidadeAdmin() {
  const container = document.getElementById("disponibilidade-admin-content");
  const errorMessageDiv = document.getElementById("error-message-admin");
  const spinner = document.getElementById("loading-agenda-spinner");

  if (!container || !errorMessageDiv || !spinner) {
    console.error("Elementos essenciais da interface não encontrados.");
    return;
  }

  try {
    const getTodasDisponibilidades = httpsCallable(
      functions,
      "getTodasDisponibilidadesAssistentes"
    );
    const result = await getTodasDisponibilidades();
    const disponibilidades = result.data;

    spinner.style.display = "none";
    document
      .getElementById("gestao-agenda-content")
      ?.classList.remove("d-none");

    if (!disponibilidades || disponibilidades.length === 0) {
      container.innerHTML =
        '<p class="text-muted">Nenhuma disponibilidade encontrada para as assistentes sociais.</p>';
      return;
    }

    container.innerHTML = "";
    disponibilidades.forEach((item, index) => {
      const assistenteId = item.id;
      const accordionItem = document.createElement("div");
      accordionItem.className = "accordion-item mb-3";

      let contentHtml = '<div class="list-group">';
      if (
        item.disponibilidade &&
        Object.keys(item.disponibilidade).length > 0
      ) {
        for (const mes in item.disponibilidade) {
          const mesData = item.disponibilidade[mes];
          for (const modalidade in mesData) {
            const dispo = mesData[modalidade];
            if (dispo.dias && dispo.dias.length > 0) {
              contentHtml += `
                                <a href="#" class="list-group-item list-group-item-action flex-column align-items-start open-agenda-modal-btn" 
                                   data-assistente-id="${assistenteId}"
                                   data-assistente-nome="${item.nome}"
                                   data-mes="${mes}"
                                   data-modalidade="${modalidade}"
                                   data-dispo='${JSON.stringify(dispo)}'>
                                    <div class="d-flex w-100 justify-content-between">
                                        <h5 class="mb-1 text-capitalize">${modalidade} - ${mes}</h5>
                                        <small><i class="fas fa-calendar-alt me-1"></i> ${
                dispo.dias.length
              } dias</small>
                                    </div>
                                    <p class="mb-1">Horário de trabalho: <strong>${
                dispo.inicio || "Não definido"
              } às ${dispo.fim || "Não definido"}</strong>.</p>
                                    <small class="text-success">Clique para configurar e abrir a agenda.</small>
                                </a>
                            `;
            }
          }
        }
      }
      if (contentHtml === '<div class="list-group">') {
        contentHtml +=
          '<p class="text-muted ms-3">Nenhuma disponibilidade cadastrada.</p>';
      }
      contentHtml += "</div>";

      accordionItem.innerHTML = `
                <h2 class="accordion-header" id="heading-agenda-${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-agenda-${index}">
                        <strong>${item.nome}</strong>
                    </button>
                </h2>
                <div id="collapse-agenda-${index}" class="accordion-collapse collapse" data-bs-parent="#disponibilidade-admin-content">
                    <div class="accordion-body">${contentHtml}</div>
                </div>
            `;
      container.appendChild(accordionItem);
    });

    setupAgendaModal();
  } catch (error) {
    console.error("Erro ao carregar disponibilidade para admin:", error);
    spinner.style.display = "none";
    errorMessageDiv.textContent = `Erro ao carregar dados: ${error.message}`;
    errorMessageDiv.classList.remove("d-none");
  }
}

function setupAgendaModal() {
  const agendaModalElement = document.getElementById("agendaModal");
  if (!agendaModalElement) return; // Garante que não haja múltiplas instâncias

  if (agendaModalInstance) {
    agendaModalInstance.dispose();
  }
  agendaModalInstance = new bootstrap.Modal(agendaModalElement);

  document
    .getElementById("disponibilidade-admin-content")
    .addEventListener("click", function (event) {
      const link = event.target.closest(".open-agenda-modal-btn");
      if (link) {
        event.preventDefault();

        currentAgendaConfig = {
          assistenteId: link.dataset.assistenteId,
          mes: link.dataset.mes,
          modalidade: link.dataset.modalidade,
        };

        const modalTitle = document.getElementById("agendaModalLabel");
        modalTitle.textContent = `Abrir Agenda - ${link.dataset.assistenteNome} (${link.dataset.modalidade} - ${link.dataset.mes})`;

        const modalContent = document.getElementById("agenda-config-content");
        const dispo = JSON.parse(link.dataset.dispo);

        let contentHtml = '<div class="row">';
        if (dispo.dias && dispo.dias.length > 0) {
          dispo.dias.sort().forEach((dia) => {
            const data = new Date(`${dia}T03:00:00`);
            const diaSemana = data.toLocaleDateString("pt-BR", {
              weekday: "long",
            });
            contentHtml += `
                            <div class="col-md-6 col-lg-4 mb-3">
                                <div class="card h-100">
                                    <div class="card-header fw-bold">${data.toLocaleDateString(
              "pt-BR"
            )} (${diaSemana})</div>
                                    <div class="card-body">
                                        <p class="card-text">Atribuir este dia para:</p>
                                        <div class="form-check"><input class="form-check-input" type="radio" name="tipo-${dia}" id="triagem-${dia}" value="triagem" checked><label class="form-check-label" for="triagem-${dia}">Triagem</label></div>
                                        <div class="form-check"><input class="form-check-input" type="radio" name="tipo-${dia}" id="reavaliacao-${dia}" value="reavaliacao"><label class="form-check-label" for="reavaliacao-${dia}">Reavaliação</label></div>
                                    </div>
                                </div>
                            </div>
                        `;
          });
        } else {
          contentHtml =
            '<p class="text-center text-muted">Não há dias de disponibilidade cadastrados para este bloco.</p>';
        }
        modalContent.innerHTML = contentHtml + "</div>";

        agendaModalInstance.show();
      }
    });

  const saveButton = document.getElementById("saveAgendaButton");
  // ### NOVO: Usa AbortController para garantir que o listener seja removível ###
  if (saveButton) {
    if (saveButtonController) {
      saveButtonController.abort(); // Remove o listener antigo
    }
    saveButtonController = new AbortController();
    saveButton.addEventListener("click", saveAgenda, {
      signal: saveButtonController.signal,
    });
  }
}

async function saveAgenda() {
  const button = document.getElementById("saveAgendaButton");
  button.disabled = true;
  button.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Salvando...`;

  const diasConfig = Array.from(
    document.querySelectorAll(
      '#agenda-config-content input[type="radio"]:checked'
    )
  ).map((input) => ({
    dia: input.name.replace("tipo-", ""),
    tipo: input.value,
  }));

  if (diasConfig.length === 0) {
    showFeedbackModal(
      "Nenhum dia foi configurado. Nenhuma agenda foi aberta.",
      false
    );
    button.disabled = false;
    button.innerHTML =
      '<i class="fas fa-calendar-check me-2"></i>Salvar e Abrir Agenda';
    return;
  }

  const payload = { ...currentAgendaConfig, dias: diasConfig };

  try {
    const abrirAgenda = httpsCallable(functions, "abrirAgendaServicoSocial");
    const result = await abrirAgenda(payload);
    if (agendaModalInstance) agendaModalInstance.hide();
    showFeedbackModal(result.data.message, true);
  } catch (error) {
    console.error("Erro ao abrir agenda:", error);
    if (agendaModalInstance) agendaModalInstance.hide();
    showFeedbackModal(
      `Não foi possível abrir a agenda: ${error.message}`,
      false
    );
  } finally {
    button.disabled = false;
    button.innerHTML =
      '<i class="fas fa-calendar-check me-2"></i>Salvar e Abrir Agenda';
  }
}
