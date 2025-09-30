// Arquivo: /modulos/voluntario/js/meus-agendamentos-view.js

import { app, auth, db } from "/assets/js/firebase-init.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const container = document.getElementById("meus-agendamentos-view");

function formatCurrency(value) {
  if (typeof value !== "number") return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function displayAgendamentos(agendamentos) {
  const lista = container.querySelector("#agendamentos-lista");
  if (!lista) return;

  if (agendamentos.length === 0) {
    lista.innerHTML = "<p>Nenhum agendamento encontrado.</p>";
    return;
  }

  let html = "";
  for (let i = 0; i < agendamentos.length; i++) {
    const agendamento = agendamentos[i];
    const data = agendamento.dataAgendamento.toDate();
    const dataFormatada = data.toLocaleDateString("pt-BR");
    const horaFormatada = data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Detalhes financeiros e de pacientes
    const numPacientes = agendamento.pacientes
      ? agendamento.pacientes.length
      : 0;
    const totalRecebido = formatCurrency(agendamento.valorTotalContribuicao);
    const valorSupervisao = formatCurrency(agendamento.valorSupervisao);

    html += `
            <div class="agendamento-card">
                <div class="card-header">
                    <h4>${agendamento.profissionalNome}</h4>
                    <span class="data-agendamento">${dataFormatada} às ${horaFormatada}</span>
                </div>
                <div class="card-body">
                    <p><strong>E-mail:</strong> ${
                      agendamento.profissionalEmail
                    }</p>
                    <p><strong>Telefone:</strong> ${
                      agendamento.profissionalTelefone || "Não informado"
                    }</p>
                </div>
                <div class="card-footer">
                    <div class="info-item">
                        <span class="label">Pacientes</span>
                        <span class="value">${numPacientes}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Total Recebido</span>
                        <span class="value">${totalRecebido}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Valor da Supervisão</span>
                        <span class="value">${valorSupervisao}</span>
                    </div>
                </div>
            </div>
        `;
  }
  lista.innerHTML = html;
}

export async function init() {
  if (!container) return;

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const q = query(
          collection(db, "agendamentos"),
          where("supervisorUid", "==", user.uid),
          orderBy("dataAgendamento", "desc")
        );
        const querySnapshot = await getDocs(q);
        const agendamentos = [];
        querySnapshot.forEach((doc) => {
          agendamentos.push(doc.data());
        });
        displayAgendamentos(agendamentos);
      } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        const lista = container.querySelector("#agendamentos-lista");
        if (lista)
          lista.innerHTML = `<p class="alert alert-error">Erro ao carregar agendamentos.</p>`;
      }
    }
  });
}
