// Arquivo: /modulos/voluntario/js/meus-agendamentos-view.js

// CORREÇÃO: Removido 'app' da importação e ajustado o caminho para o SDK v9
import { auth, db } from "/assets/js/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// A função init agora recebe 'db' e 'user' como parâmetros, seguindo o padrão do painel.
export async function init(db, user, userData) {
  const container = document.getElementById("meus-agendamentos-view");
  if (!container) {
    console.error("Container para 'Meus Agendamentos' não foi encontrado.");
    return;
  }

  const listaContainer = container.querySelector("#agendamentos-lista");
  if (!listaContainer) {
    console.error("Elemento da lista de agendamentos não encontrado.");
    return;
  }

  listaContainer.innerHTML = '<div class="loading-spinner"></div>';

  try {
    // Usa o 'user.uid' recebido por parâmetro para a consulta
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
    displayAgendamentos(agendamentos, listaContainer);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    listaContainer.innerHTML = `<p class="alert alert-error">Erro ao carregar agendamentos.</p>`;
  }
}

// Função auxiliar para formatar valores monetários, tratando casos onde o valor não existe.
function formatCurrency(value) {
  if (typeof value !== "number") {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function displayAgendamentos(agendamentos, listaContainer) {
  if (agendamentos.length === 0) {
    listaContainer.innerHTML =
      '<p class="no-fichas-message">Nenhum agendamento encontrado.</p>';
    return;
  }

  let html = "";
  agendamentos.forEach((agendamento) => {
    const data = agendamento.dataAgendamento.toDate();
    const dataFormatada = data.toLocaleDateString("pt-BR");
    const horaFormatada = data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const numPacientes = agendamento.pacientes
      ? agendamento.pacientes.length
      : 0;
    const totalRecebido = formatCurrency(agendamento.valorTotalContribuicao);
    const valorSupervisao = formatCurrency(agendamento.valorSupervisao);

    html += `
            <div class="agendamento-card-supervisor">
                <div class="card-header">
                    <h4>${agendamento.profissionalNome}</h4>
                    <span class="data-agendamento">${dataFormatada} às ${horaFormatada}</span>
                </div>
                <div class="card-body">
                    <p><strong>E-mail:</strong> ${
                      agendamento.profissionalEmail || "Não informado"
                    }</p>
                    <p><strong>Telefone:</strong> ${
                      agendamento.profissionalTelefone || "Não informado"
                    }</p>
                </div>
                <div class="card-footer-details">
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
  });
  listaContainer.innerHTML = html;
}
