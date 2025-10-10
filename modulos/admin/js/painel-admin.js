import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";
import { checkUserRole } from "../../../assets/js/app.js"; // Verifique se o caminho está correto

// --- Ponto de Entrada ---
document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const userRole = await checkUserRole(user.uid);
      if (userRole === "admin") {
        initAdminPanel(); // Usuário é admin, inicializa o painel
      } else {
        console.warn("Acesso negado. Usuário não é admin.");
        window.location.href = "/index.html";
      }
    } else {
      console.log("Nenhum usuário logado. Redirecionando...");
      window.location.href = "/index.html";
    }
  });
});

function initAdminPanel() {
  console.log("Painel do Administrador iniciado!");
  // Carrega os dados para os componentes do painel
  renderDisponibilidadeServicoSocial();
  renderGerenciamentoUsuarios();
}

/**
 * Busca e renderiza o widget de disponibilidade do Serviço Social.
 * Utiliza a sintaxe do Firebase v9 para chamar a Cloud Function.
 */
async function renderDisponibilidadeServicoSocial() {
  const container = document.getElementById("disponibilidade-admin-container");
  if (!container) return;

  try {
    const functions = getFunctions();
    const getDisponibilidades = httpsCallable(
      functions,
      "getTodasDisponibilidadesAssistentes"
    );

    const result = await getDisponibilidades();
    const disponibilidades = result.data; // No v9, os dados vêm no objeto 'result.data'

    if (!disponibilidades || disponibilidades.length === 0) {
      container.innerHTML = "<p>Nenhuma disponibilidade encontrada.</p>";
      return;
    }

    // Cria a lista de disponibilidades
    let html = '<ul class="list-group">';
    disponibilidades.forEach((item) => {
      const horarios = item.disponibilidade
        ? item.disponibilidade.join(", ")
        : "Nenhum horário informado";
      html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        ${item.nome}
                        <span class="badge badge-primary badge-pill">${horarios}</span>
                     </li>`;
    });
    html += "</ul>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Erro ao carregar disponibilidade para admin:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os dados. Tente novamente mais tarde.</div>`;
  }
}

/**
 * Busca e renderiza a tabela de gerenciamento de usuários.
 * (Exemplo de implementação)
 */
async function renderGerenciamentoUsuarios() {
  const container = document.getElementById("usuarios-admin-container");
  if (!container) return;

  container.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status"><span class="sr-only">Carregando...</span></div>
        </div>`;

  try {
    const functions = getFunctions();
    // Supondo que exista uma function chamada 'getTodosUsuarios'
    const getUsuarios = httpsCallable(functions, "getTodosUsuarios");

    const result = await getUsuarios();
    const usuarios = result.data;

    // Lógica para renderizar uma tabela com os usuários
    let tableHtml = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Perfil</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

    usuarios.forEach((user) => {
      tableHtml += `
                <tr>
                    <td>${user.nome || "Não informado"}</td>
                    <td>${user.email}</td>
                    <td><span class="badge badge-info">${user.role}</span></td>
                    <td><button class="btn btn-sm btn-primary" data-uid="${
                      user.uid
                    }">Editar</button></td>
                </tr>
            `;
    });

    tableHtml += "</tbody></table>";
    container.innerHTML = tableHtml;
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os usuários.</div>`;
  }
}
