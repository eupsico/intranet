// /modulos/gestao/js/dashboard-reunioes.js
// VERSÃO 1.0 (Modularizada para SPA)

import {
  getDatabase,
  ref,
  onValue,
  orderByChild,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

let todasAsAtas = []; // Cache para armazenar todas as atas carregadas

/**
 * Função de inicialização do módulo, chamada pelo painel-gestao.js
 */
export function init() {
  console.log("[DASH] Módulo Dashboard de Reuniões iniciado.");
  loadAtas();
  setupEventListeners();
}

/**
 * Carrega as atas do Firebase Realtime Database.
 */
function loadAtas() {
  const atasContainer = document.getElementById("atas-container");
  const rtDb = getDatabase();
  const atasRef = ref(rtDb, "gestao/atas");
  const atasQuery = orderByChild(atasRef, "dataReuniao");

  onValue(
    atasQuery,
    (snapshot) => {
      todasAsAtas = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          todasAsAtas.push({ key: childSnapshot.key, ...childSnapshot.val() });
        });
        todasAsAtas.reverse(); // Mostra as mais recentes primeiro
      }
      filtrarEExibirAtas();
    },
    (error) => {
      console.error("[DASH] Erro ao carregar atas:", error);
      if (atasContainer)
        atasContainer.innerHTML =
          '<div class="alert alert-danger">Erro ao carregar atas.</div>';
    }
  );
}

/**
 * Filtra as atas com base no tipo selecionado e as exibe.
 */
function filtrarEExibirAtas() {
  const filterType = document.getElementById("tipo-filtro")?.value || "Todos";
  const atasContainer = document.getElementById("atas-container");
  if (!atasContainer) return;

  const atasFiltradas =
    filterType === "Todos"
      ? todasAsAtas
      : todasAsAtas.filter((ata) => ata.tipo === filterType);

  if (atasFiltradas.length === 0) {
    atasContainer.innerHTML =
      '<div class="card"><p>Nenhuma ata encontrada para este filtro.</p></div>';
  } else {
    atasContainer.innerHTML = atasFiltradas
      .map((ata) => renderSavedAtaAccordion(ata.key, ata))
      .join("");
  }
  exibirProximaReuniao(atasFiltradas);
}

/**
 * Encontra e exibe a próxima reunião agendada a partir das atas filtradas.
 */
function exibirProximaReuniao(atasFiltradas) {
  const infoBox = document.getElementById("proxima-reuniao-info");
  if (!infoBox) return;

  const agora = new Date();
  let proximaReuniao = null;

  atasFiltradas.forEach((ata) => {
    if (ata.proximaReuniao) {
      const dataProxima = new Date(ata.proximaReuniao);
      if (
        dataProxima > agora &&
        (!proximaReuniao ||
          dataProxima < new Date(proximaReuniao.proximaReuniao))
      ) {
        proximaReuniao = ata;
      }
    }
  });

  if (proximaReuniao) {
    const data = new Date(proximaReuniao.proximaReuniao);
    infoBox.innerHTML = `<h3>Próxima Reunião Agendada</h3><p><strong>${
      proximaReuniao.tipo
    }</strong> em ${data.toLocaleString("pt-BR")}</p>`;
  } else {
    infoBox.innerHTML = `<h3>Próxima Reunião Agendada</h3><p>Nenhuma reunião futura agendada.</p>`;
  }
}

/**
 * Renderiza o HTML para um único item de ata no formato de acordeão.
 */
function renderSavedAtaAccordion(key, data) {
  const date = data.dataReuniao
    ? new Date(data.dataReuniao + "T00:00:00")
    : null;
  const formattedDate = date
    ? date.toLocaleDateString("pt-BR")
    : "Data Inválida";
  const title = `${data.tipo} - ${formattedDate}`;

  const createItem = (title, content) =>
    content
      ? `<div class="ata-item-title">${title}</div><div class="ata-item-content"><p>${String(
          content
        ).replace(/\n/g, "<br>")}</p></div>`
      : "";
  const createList = (title, listData) => {
    if (!listData || Object.keys(listData).length === 0) return "";
    const listItems = Object.values(listData)
      .map(
        (item) =>
          `<li>${item.descricao} (Responsável: ${
            item.responsavel
          }, Prazo: ${new Date(item.prazo).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          })})</li>`
      )
      .join("");
    return `<div class="ata-item-title">${title}</div><div class="ata-item-content"><ul>${listItems}</ul></div>`;
  };

  let contentHtml = createItem(
    "Data e Horário",
    `Data: ${formattedDate}<br>Início: ${data.horaInicio || "N/A"}<br>Fim: ${
      data.horaFim || "N/A"
    }`
  );
  if (data.tipo === "Reunião Técnica") {
    contentHtml += createItem("Tema", data.pauta);
    contentHtml += createItem("Responsável", data.responsavelTecnica);
    contentHtml += createItem(
      "Duração",
      data.duracao ? `${data.duracao} minutos` : ""
    );
  } else {
    contentHtml += createItem("Pauta", data.pauta);
    contentHtml += createItem("Participantes", data.participantes);
    contentHtml += createItem("Pontos Discutidos", data.pontos);
    contentHtml += createItem("Decisões", data.decisoes);
    contentHtml += createList("Plano de Ação", data.planoDeAcao);
    contentHtml += createItem(
      "Temas p/ Próxima Reunião",
      data.temasProximaReuniao
    );
    contentHtml += createItem(
      "Próxima Reunião",
      data.proximaReuniao
        ? new Date(data.proximaReuniao).toLocaleString("pt-BR")
        : ""
    );
  }

  const pdfButtonHtml = data.pdfUrl
    ? `<a href="${data.pdfUrl}" target="_blank" class="action-button pdf">Abrir PDF</a>`
    : "";
  const feedbackButtonHtml =
    data.tipo === "Reunião Técnica"
      ? `<button class="action-button feedback" data-key="${key}">Abrir Feedback</button>`
      : "";

  return `<div class="accordion">
                <button class="accordion-trigger">${title}</button>
                <div class="accordion-content">
                    ${contentHtml}
                    <div class="action-buttons-container">
                        ${pdfButtonHtml}
                        ${feedbackButtonHtml}
                    </div>
                </div>
            </div>`;
}

/**
 * Configura os event listeners para o filtro e os acordeões.
 */
function setupEventListeners() {
  const tipoFiltro = document.getElementById("tipo-filtro");
  if (tipoFiltro) tipoFiltro.addEventListener("change", filtrarEExibirAtas);

  const contentArea = document.querySelector(".main-content"); // Ouve eventos na área principal
  contentArea.addEventListener("click", (e) => {
    // Lógica para abrir/fechar o acordeão
    if (e.target.classList.contains("accordion-trigger")) {
      const content = e.target.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    }
    // Lógica para o botão de feedback
    if (e.target.classList.contains("feedback")) {
      const key = e.target.dataset.key;
      if (key) {
        const urlFeedback = `https://sites.google.com/eupsico.org.br/reunioes/feedback#${key}`;
        window.open(urlFeedback, "_blank");
      } else {
        alert("ERRO: Chave da reunião não encontrada!");
      }
    }
  });
}
