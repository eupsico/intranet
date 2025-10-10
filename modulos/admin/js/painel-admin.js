import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";
import { checkUserRole } from "../../../assets/js/app.js"; // VERIFIQUE SE ESTE CAMINHO ESTÁ CORRETO

/**
 * Ponto de entrada: Executa quando o DOM está totalmente carregado.
 * Verifica a autenticação e o perfil do usuário antes de iniciar o painel.
 */
document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const userRole = await checkUserRole(user.uid);
      if (userRole === "admin") {
        initAdminPanel(); // Usuário autenticado e é admin
      } else {
        console.warn(
          "Acesso negado. Usuário não tem permissão de administrador."
        );
        window.location.href = "/index.html"; // Redireciona se não for admin
      }
    } else {
      console.log(
        "Nenhum usuário logado. Redirecionando para a página inicial."
      );
      window.location.href = "/index.html"; // Redireciona se não estiver logado
    }
  });
});

/**
 * Inicializa os componentes do painel de administração.
 */
function initAdminPanel() {
  console.log("Painel do Administrador iniciado!");
  setupNavigation();
  loadView("dashboard"); // Carrega a view inicial (Dashboard) por padrão
}

/**
 * Configura os eventos de clique para a navegação por abas.
 */
function setupNavigation() {
  const navLinks = document.querySelectorAll("#admin-panel-tabs .nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      // Gerencia a classe 'active' para o feedback visual
      navLinks.forEach((l) => l.classList.remove("active"));
      e.currentTarget.classList.add("active");

      const viewName = e.currentTarget.dataset.view;
      loadView(viewName);
    });
  });
}

/**
 * Carrega o HTML e o JavaScript de uma view específica (dashboard ou configurações).
 * @param {string} viewName - O nome da view a ser carregada ('dashboard' ou 'configuracoes').
 */
async function loadView(viewName) {
  const contentArea = document.getElementById("admin-content-area");
  // Mostra um spinner enquanto o conteúdo é carregado
  contentArea.innerHTML = `<div class="text-center mt-5"><div class="spinner-border" role="status"><span class="sr-only">Carregando...</span></div></div>`;

  try {
    let htmlPath = "";
    switch (viewName) {
      case "dashboard":
        htmlPath = "./dashboard-admin.html"; // Arquivo HTML para o dashboard
        break;
      case "configuracoes":
        htmlPath = "./configuracoes.html"; // Arquivo HTML para as configurações
        break;
      default:
        throw new Error("View não encontrada");
    }

    // Carrega o conteúdo HTML da view
    const response = await fetch(htmlPath);
    if (!response.ok) throw new Error(`Não foi possível carregar ${htmlPath}`);
    contentArea.innerHTML = await response.text();

    // Após carregar o HTML, executa os scripts correspondentes
    if (viewName === "dashboard") {
      renderDisponibilidadeServicoSocial();
      renderGerenciamentoUsuarios();
    } else if (viewName === "configuracoes") {
      // Importa o módulo de configurações dinamicamente e o inicializa
      const configModule = await import("./configuracoes.js");
      // Supondo que configuracoes.js tenha uma função init exportada
      if (configModule.init) {
        configModule.init();
      }
    }
  } catch (error) {
    console.error("Erro ao carregar a view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Ocorreu um erro ao carregar esta seção.</div>`;
  }
}

// --- Funções Específicas do Dashboard ---

/**
 * Busca e renderiza o widget de disponibilidade do Serviço Social.
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
    const disponibilidades = result.data;

    if (!disponibilidades || disponibilidades.length === 0) {
      container.innerHTML = "<p>Nenhuma disponibilidade encontrada.</p>";
      return;
    }

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
 */
async function renderGerenciamentoUsuarios() {
  const container = document.getElementById("usuarios-admin-container");
  if (!container) return;

  try {
    const functions = getFunctions();
    const getUsuarios = httpsCallable(functions, "getTodosUsuarios");

    const result = await getUsuarios();
    const usuarios = result.data;

    let tableHtml = `
            <div class="table-responsive">
                <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                    <thead>
                        <tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Ações</th></tr>
                    </thead>
                    <tbody>`;

    if (!usuarios || usuarios.length === 0) {
      tableHtml += `<tr><td colspan="4" class="text-center">Nenhum usuário encontrado.</td></tr>`;
    } else {
      usuarios.forEach((user) => {
        tableHtml += `
                    <tr>
                        <td>${user.nome || "Não informado"}</td>
                        <td>${user.email}</td>
                        <td><span class="badge badge-secondary">${
                          user.role
                        }</span></td>
                        <td><button class="btn btn-sm btn-outline-primary" data-uid="${
                          user.uid
                        }">Gerenciar</button></td>
                    </tr>`;
      });
    }

    tableHtml += "</tbody></table></div>";
    container.innerHTML = tableHtml;
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar a lista de usuários.</div>`;
  }
}
