// /modulos/gestao/js/feedback.js
import { db as firestoreDb } from "../../../assets/js/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const feedbackContainer = document.getElementById("feedback-container");

async function findMeetingAndRender() {
  try {
    const ataId = window.location.hash.substring(1);
    if (!ataId) {
      throw new Error("ID da reunião não fornecido na URL.");
    }

    const [ataDoc, perguntasDoc, profissionaisSnapshot] = await Promise.all([
      getDoc(doc(firestoreDb, "gestao_atas", ataId)),
      getDoc(doc(firestoreDb, "configuracoesSistema", "modelo_feedback")),
      getDocs(query(collection(firestoreDb, "usuarios"), orderBy("nome"))),
    ]);

    if (!ataDoc.exists()) throw new Error("Ata da reunião não encontrada.");
    if (!perguntasDoc.exists())
      throw new Error("Modelo de perguntas de feedback não encontrado.");

    const ata = ataDoc.data();
    const perguntasModelo = perguntasDoc.data().perguntas;
    const profissionais = profissionaisSnapshot.docs.map(
      (doc) => doc.data().nome
    );

    // Lógica de tempo (pode ser ajustada conforme necessário)
    const inicioReuniao = new Date(`${ata.dataReuniao}T${ata.horaInicio}`);
    const agora = new Date();

    // Permite feedback a qualquer momento após o início da reunião (pode ser ajustado)
    if (agora < inicioReuniao) {
      feedbackContainer.innerHTML = `<div class="message-box alert alert-info">O feedback para esta reunião ainda não está disponível.</div>`;
    } else {
      renderFeedbackForm(ata, ataId, perguntasModelo, profissionais);
    }
  } catch (err) {
    feedbackContainer.innerHTML = `<div class="message-box alert alert-danger"><strong>Erro:</strong> ${err.message}</div>`;
  }
}

function renderFeedbackForm(ata, ataId, perguntasModelo, profissionais) {
  const professionalOptions = profissionais
    .map((nome) => `<option value="${nome}">${nome}</option>`)
    .join("");

  let formHtml = `
        <div class="info-header">
            <h2>Feedback da Reunião Técnica</h2>
            <p><strong>Tema:</strong> ${
              ata.pauta || "N/A"
            } | <strong>Responsável:</strong> ${
    ata.responsavelTecnica || "N/A"
  }</p>
        </div>
        <form id="feedback-form">
            <div class="form-group">
                <label for="participante-nome">Seu Nome</label>
                <select id="participante-nome" class="form-control" required>
                    <option value="">Selecione seu nome...</option>
                    ${professionalOptions}
                </select>
                <span class="error-message"></span>
            </div>`;

  perguntasModelo.forEach((p) => {
    formHtml += `<div class="form-group"><label for="${p.id}">${p.texto}</label>`;
    if (p.tipo === "select") {
      formHtml += `<select id="${
        p.id
      }" class="form-control" required><option value="">Selecione...</option>${p.opcoes
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("")}</select>`;
    } else if (p.tipo === "textarea") {
      formHtml += `<textarea id="${p.id}" class="form-control" rows="3" required></textarea>`;
    }
    formHtml += '<span class="error-message"></span></div>';
  });

  formHtml += `<div><button type="submit" class="action-button save-btn">Enviar Feedback</button></div></form>`;
  feedbackContainer.innerHTML = formHtml;
  feedbackContainer.classList.remove("loading");

  // Desabilitar nomes que já responderam
  if (ata.feedbacks && Array.isArray(ata.feedbacks)) {
    const nomesQueJaResponderam = ata.feedbacks.map((fb) => fb.nome);
    document.querySelectorAll("#participante-nome option").forEach((option) => {
      if (nomesQueJaResponderam.includes(option.value)) {
        option.disabled = true;
        option.textContent += " (Já respondeu)";
      }
    });
  }

  // Adicionar listener de submit
  document
    .getElementById("feedback-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "A enviar...";

      try {
        const feedbackData = { timestamp: new Date().toISOString() };
        feedbackData.nome = document.getElementById("participante-nome").value;
        perguntasModelo.forEach((p) => {
          feedbackData[p.id] = document.getElementById(p.id).value;
        });

        const ataRef = doc(firestoreDb, "gestao_atas", ataId);
        await updateDoc(ataRef, {
          feedbacks: arrayUnion(feedbackData),
        });

        feedbackContainer.innerHTML = `<div class="message-box alert alert-success"><h2>Obrigado!</h2><p>O seu feedback foi enviado com sucesso.</p></div>`;
      } catch (err) {
        alert(`Erro ao enviar feedback: ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar Feedback";
      }
    });
}

// Inicia o processo quando a página carrega
findMeetingAndRender();
