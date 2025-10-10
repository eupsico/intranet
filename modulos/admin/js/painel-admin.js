import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";
// A função checkUserRole não é mais necessária aqui, pois app.js já faz essa verificação.
// Removida para simplificar e evitar redundância.

// A função init é exportada para ser chamada pelo app.js
export function init(user, userData) {
  console.log("Painel do Administrador iniciado!");
  setupNavigation();
  // Determina a view a ser carregada a partir da URL (hash) ou usa 'dashboard' como padrão
  const initialView = window.location.hash.substring(1) || "dashboard";
  loadView(initialView);
}

/**
 * Configura os eventos de clique para a navegação do menu lateral.
 * Esta é a principal função alterada.
 */
function setupNavigation() {
  // O seletor agora aponta para os links dentro do novo menu lateral
  const navLinks = document.querySelectorAll("#admin-sidebar-menu a");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // Remove a classe 'active' de todos os links do menu

      navLinks.forEach((l) => l.classList.remove("active")); // Adiciona a classe 'active' apenas ao link que foi clicado
      e.currentTarget.classList.add("active");

      const viewName = e.currentTarget.dataset.view;
      // Atualiza a URL com um hash para manter o estado da página
      window.location.hash = viewName;
      loadView(viewName);
    });
  });
}

/**
 * Carrega o HTML e o JavaScript de uma view específica (dashboard ou configurações).
 */
async function loadView(viewName) {
  const contentArea = document.getElementById("admin-content-area");
  // Coloca o seletor de menu correto em estado 'ativo' ao carregar a view
  document.querySelectorAll("#admin-sidebar-menu a").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewName);
  }); // Mostra um spinner enquanto o conteúdo é carregado

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
        // Se a view na URL for inválida, carrega o dashboard
        window.location.hash = "dashboard";
        loadView("dashboard");
        return;
    } // Carrega o conteúdo HTML da view

    const response = await fetch(htmlPath);
    if (!response.ok) throw new Error(`Não foi possível carregar ${htmlPath}`);
    contentArea.innerHTML = await response.text(); // Após carregar o HTML, executa os scripts correspondentes

    if (viewName === "dashboard") {
      renderDisponibilidadeServicoSocial();
      renderGerenciamentoUsuarios();
    } else if (viewName === "configuracoes") {
      // Importa o módulo de configurações dinamicamente e o inicializa
      const configModule = await import("./configuracoes.js");
      if (configModule.init) {
        configModule.init();
      }
    }
  } catch (error) {
    console.error("Erro ao carregar a view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Ocorreu um erro ao carregar esta seção.</div>`;
  }
}

// --- Funções Específicas do Dashboard (permanecem inalteradas) ---

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
