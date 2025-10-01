// Arquivo: /modulos/administrativo/js/gestao_agendas.js
// Descrição: Módulo para gerenciar a abertura de agendas do Serviço Social.

import { app } from "../../../assets/js/firebase-init.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";

const functions = getFunctions(app, "southamerica-east1");

let agendaModalInstance = null;
let currentAgendaConfig = {};

// Função de inicialização do módulo, chamada pelo administrativo-painel.js
export function init() {
  console.log("Módulo de Gestão de Agendas iniciado.");
  carregarDisponibilidadeAdmin();
}

function showFeedbackModal(message, isSuccess = true) {
  const modal = new bootstrap.Modal(document.getElementById("feedbackModal"));
  const modalTitle = document.getElementById("feedbackModalLabel");
  const modalBody = document.getElementById("feedbackModalBody");
  const modalHeader = modalTitle.parentElement;

  modalTitle.textContent = isSuccess ? "Sucesso!" : "Erro!";
  modalBody.innerHTML = message;

  modalHeader.className = "modal-header"; // Reseta classes
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

    spinner.classList.add("d-none");

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
            contentHtml += `
              <a href="#" class="list-group-item list-group-item-action flex-column align-items-start" 
                 data-bs-toggle="modal" data-bs-target="#agendaModal"
                 data-assistente-id="${assistenteId}"
                 data-assistente-nome="${item.nome}"
                 data-mes="${mes}"
                 data-modalidade="${modalidade}"
                 data-dispo='${JSON.stringify(dispo)}'>
                <div class="d-flex w-100 justify-content-between">
                  <h5 class="mb-1 text-capitalize">${modalidade} - ${mes}</h5>
                  <small><i class="fas fa-calendar-alt me-1"></i> ${
                    dispo.dias ? dispo.dias.length : 0
                  } dias</small>
                </div>
                <p class="mb-1">Horário de trabalho: <strong>${
                  dispo.inicio
                } às ${dispo.fim}</strong>.</p>
                <small class="text-success">Clique para configurar e abrir a agenda.</small>
              </a>
            `;
          }
        }
      } else {
        contentHtml =
          '<p class="text-muted ms-3">Nenhuma disponibilidade cadastrada.</p>';
      }
      contentHtml += "</div>";

      accordionItem.innerHTML = `
        <h2 class="accordion-header" id="heading-agenda-${index}">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-agenda-${index}" aria-expanded="false" aria-controls="collapse-agenda-${index}">
            <strong>${item.nome}</strong>
          </button>
        </h2>
        <div id="collapse-agenda-${index}" class="accordion-collapse collapse" aria-labelledby="heading-agenda-${index}" data-bs-parent="#disponibilidade-admin-content">
          <div class="accordion-body">
            ${contentHtml}
          </div>
        </div>
      `;
      container.appendChild(accordionItem);
    });

    setupAgendaModal();
  } catch (error) {
    console.error("Erro ao carregar disponibilidade para admin:", error);
    spinner.classList.add("d-none");
    errorMessageDiv.textContent = `Erro ao carregar dados: ${error.message}`;
    errorMessageDiv.classList.remove("d-none");
  }
}

function setupAgendaModal() {
  const agendaModalElement = document.getElementById("agendaModal");
  if (!agendaModalElement) return;

  agendaModalInstance = new bootstrap.Modal(agendaModalElement);

  agendaModalElement.addEventListener("show.bs.modal", function (event) {
    const button = event.relatedTarget;
    const assistenteId = button.dataset.assistenteId;
    const assistenteNome = button.dataset.assistenteNome;
    const mes = button.dataset.mes;
    const modalidade = button.dataset.modalidade;
    const dispo = JSON.parse(button.dataset.dispo);

    currentAgendaConfig = { assistenteId, mes, modalidade };

    const modalTitle = document.getElementById("agendaModalLabel");
    const modalContent = document.getElementById("agenda-config-content");

    modalTitle.textContent = `Abrir Agenda - ${assistenteNome} (${modalidade} - ${mes})`;

    let contentHtml = '<div class="row">';
    if (dispo.dias && dispo.dias.length > 0) {
      dispo.dias.forEach((dia) => {
        const data = new Date(`${dia}T00:00:00-03:00`);
        const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" });

        contentHtml += `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card h-100">
                            <div class="card-header fw-bold">${data.toLocaleDateString(
                              "pt-BR"
                            )} (${diaSemana})</div>
                            <div class="card-body">
                                <p class="card-text">Atribuir este dia para:</p>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="tipo-${dia}" id="triagem-${dia}" value="triagem" checked>
                                    <label class="form-check-label" for="triagem-${dia}">
                                        Triagem
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="tipo-${dia}" id="reavaliacao-${dia}" value="reavaliacao">
                                    <label class="form-check-label" for="reavaliacao-${dia}">
                                        Reavaliação
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
      });
    } else {
      contentHtml =
        '<p class="text-center text-muted">Não há dias de disponibilidade cadastrados para este bloco.</p>';
    }
    contentHtml += "</div>";
    modalContent.innerHTML = contentHtml;
  });

  const saveButton = document.getElementById("saveAgendaButton");
  if (saveButton.dataset.listenerAttached !== "true") {
    saveButton.addEventListener("click", saveAgenda);
    saveButton.dataset.listenerAttached = "true";
  }
}

async function saveAgenda() {
  const button = document.getElementById("saveAgendaButton");
  const originalButtonText = button.innerHTML;
  button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;
  button.disabled = true;

  const diasConfig = [];
  const content = document.getElementById("agenda-config-content");
  const inputs = content.querySelectorAll('input[type="radio"]:checked');

  inputs.forEach((input) => {
    diasConfig.push({
      dia: input.name.replace("tipo-", ""),
      tipo: input.value,
    });
  });

  if (diasConfig.length === 0) {
    showFeedbackModal(
      "Nenhum dia foi configurado. Nenhuma agenda foi aberta.",
      false
    );
    button.innerHTML = originalButtonText;
    button.disabled = false;
    return;
  }

  const payload = {
    ...currentAgendaConfig,
    dias: diasConfig,
  };

  try {
    const abrirAgenda = httpsCallable(functions, "abrirAgendaServicoSocial");
    const result = await abrirAgenda(payload);
    agendaModalInstance.hide();
    showFeedbackModal(result.data.message, true);
  } catch (error) {
    console.error("Erro ao abrir agenda:", error);
    showFeedbackModal(
      `Não foi possível abrir a agenda. Detalhes: ${error.message}`,
      false
    );
  } finally {
    button.innerHTML = originalButtonText;
    button.disabled = false;
  }
}
