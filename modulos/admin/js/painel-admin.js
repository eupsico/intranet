import { call } from "./firebase-service.js"; // Verifique o caminho correto para seu serviço de chamada de functions

export function init(db, user, userData, functions) {
  // A função init é o ponto de entrada quando a view é carregada
  console.log("Painel do Administrador iniciado!");

  // Carrega os dados para cada widget do painel
  renderDisponibilidadeServicoSocial(functions);
  renderGerenciamentoUsuarios(functions);
}

// Função para buscar e renderizar a disponibilidade
async function renderDisponibilidadeServicoSocial(functions) {
  const container = document.getElementById("disponibilidade-admin-container");
  try {
    // Chama a Cloud Function que já corrigimos
    const disponibilidades = await functions.call(
      "getTodasDisponibilidadesAssistentes"
    );

    // Lógica para criar a tabela ou lista de disponibilidades
    let html = '<ul class="list-group">';
    disponibilidades.forEach((item) => {
      html += `<li class="list-group-item">${
        item.nome
      }: ${item.disponibilidade.join(", ")}</li>`;
    });
    html += "</ul>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Erro ao carregar disponibilidade para admin:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os dados. ${error.message}</div>`;
  }
}

// Função para buscar e renderizar a tabela de usuários
async function renderGerenciamentoUsuarios(functions) {
  // Lógica similar: chamar a function 'getTodosUsuarios' e renderizar uma tabela
}
