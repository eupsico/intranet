// /modulos/gestao/js/dashboard-reunioes.js
// VERSÃO 2.1 (Layout do Acordeão Melhorado)

import { db as firestoreDb } from "../../../assets/js/firebase-init.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let todasAsAtas = [];

export function init() {
  console.log("[DASH] Módulo Dashboard de Reuniões iniciado.");
  loadAtasFromFirestore();
  setupEventListeners();
}

function loadAtasFromFirestore() {
  const atasContainer = document.getElementById("atas-container");
  const q = query(
    collection(firestoreDb, "gestao_atas"),
    orderBy("dataReuniao", "desc")
  );

  onSnapshot(
    q,
    (snapshot) => {
      todasAsAtas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      filtrarEExibirAtas();
    },
    (error) => {
      console.error("[DASH] Erro ao carregar atas do Firestore:", error);
      if (atasContainer)
        atasContainer.innerHTML =
          '<div class="alert alert-danger">Erro ao carregar atas.</div>';
    }
  );
}

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
      .map((ata) => renderSavedAtaAccordion(ata.id, ata))
      .join("");
  }
  exibirProximaReuniao(atasFiltradas);
}

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
    infoBox.innerHTML = `<h3>Próxima Reunião</h3><p><strong>${
      proximaReuniao.tipo
    }</strong> em ${data.toLocaleString("pt-BR")}</p>`;
  } else {
    infoBox.innerHTML = `<h3>Próxima Reunião</h3><p>Nenhuma reunião futura agendada.</p>`;
  }
}

function renderSavedAtaAccordion(id, data) {
  const date = data.dataReuniao
    ? new Date(data.dataReuniao + "T00:00:00")
    : null;
  const formattedDate = date
    ? date.toLocaleDateString("pt-BR")
    : "Data Inválida";
  const title = `${data.tipo} - ${formattedDate}`;

  const createItem = (title, content) =>
    content && String(content).trim()
      ? `<div class="ata-item-title">${title}</div><div class="ata-item-content"><p>${String(
          content
        ).replace(/\n/g, "<br>")}</p></div>`
      : "";
  const createList = (title, listData) => {
    if (!Array.isArray(listData) || listData.length === 0) return "";
    const listItems = listData
      .map(
        (item) =>
          `<li><strong>${item.responsavel}:</strong> ${
            item.descricao
          } (Prazo: ${new Date(item.prazo).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          })})</li>`
      )
      .join("");
    return `<div class="ata-item-title">${title}</div><div class="ata-item-content"><ul>${listItems}</ul></div>`;
  };

  let contentHtml = createItem(
    "Data e Horário",
    `Início: ${data.horaInicio || "N/A"} | Fim: ${data.horaFim || "N/A"}`
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
      ? `<button class="action-button feedback" data-key="${id}">Abrir Feedback</button>`
      : "";

  return `<div class="accordion">
                <button class="accordion-trigger">${title}</button>
                <div class="accordion-content">
                    <div class="content-wrapper">
                        ${contentHtml}
                        <div class="action-buttons-container">
                            ${pdfButtonHtml}
                            ${feedbackButtonHtml}
                        </div>
                    </div>
                </div>
            </div>`;
}

function setupEventListeners() {
  const tipoFiltro = document.getElementById("tipo-filtro");
  if (tipoFiltro) tipoFiltro.addEventListener("change", filtrarEExibirAtas);

  const contentArea = document.querySelector(".main-content");
  contentArea.addEventListener("click", (e) => {
    if (e.target.classList.contains("accordion-trigger")) {
      const content = e.target.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        // Fecha outros acordeões abertos para uma melhor experiência
        document
          .querySelectorAll(".accordion-content")
          .forEach((c) => (c.style.maxHeight = null));
        content.style.maxHeight = content.scrollHeight + "px";
      }
    }
    if (e.target.classList.contains("feedback")) {
      const key = e.target.dataset.key;
      if (key) {
        const urlFeedback = `./feedback.html#${key}`;
        window.open(urlFeedback, "_blank");
      }
    }
  });
}
