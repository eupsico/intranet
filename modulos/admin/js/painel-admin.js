import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";

// Variáveis de escopo do módulo
let user, userData;
const contentArea = document.getElementById("content-area");
const sidebarMenu = document.getElementById("sidebar-menu");

// Definição das "sub-páginas" do módulo Admin
const views = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
  },
  {
    id: "configuracoes",
    name: "Configurações",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  },
];

/**
 * Função de entrada do módulo, chamada pelo app.js
 */
export function init(userRef, userDataRef) {
  user = userRef;
  userData = userDataRef;

  console.log("🔹 Painel de Administração iniciado para:", userData.nome);

  buildAdminSidebarMenu();
  handleNavigation(); // Carrega a view inicial
  window.addEventListener("hashchange", handleNavigation);
}

/**
 * Constrói o menu na barra lateral principal.
 */
function buildAdminSidebarMenu() {
  if (!sidebarMenu) return;

  // Adiciona o link "Voltar"
  let menuHtml = `
        <li>
            <a href="../../../index.html" class="back-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Voltar à Intranet</span>
            </a>
        </li>
        <li class="menu-separator"></li>
    `;

  // Adiciona os links das sub-páginas
  views.forEach((view) => {
    menuHtml += `<li><a href="#${view.id}" data-view="${view.id}">${view.icon}<span>${view.name}</span></a></li>`;
  });

  sidebarMenu.innerHTML = menuHtml;

  // Adiciona os listeners aos links recém-criados
  sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = link.dataset.view;
    });
  });
}

/**
 * Gerencia a navegação e o carregamento da view correta baseada no hash da URL.
 */
function handleNavigation() {
  const viewId = window.location.hash.substring(1) || "dashboard"; // Padrão é dashboard
  loadView(viewId);
}

/**
 * Carrega o HTML e o JavaScript de uma sub-página específica.
 */
async function loadView(viewId) {
  if (!contentArea) return;

  // Atualiza o item ativo no menu lateral
  sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });

  contentArea.innerHTML = '<div class="loading-spinner"></div>';

  try {
    let htmlPath;
    switch (viewId) {
      case "dashboard":
        htmlPath = "./dashboard-admin.html";
        break;
      case "configuracoes":
        htmlPath = "./configuracoes.html";
        break;
      default:
        throw new Error("Página não encontrada.");
    }

    const response = await fetch(htmlPath);
    if (!response.ok) throw new Error(`Não foi possível carregar ${htmlPath}`);
    contentArea.innerHTML = await response.text();

    // Após carregar o HTML, executa os scripts correspondentes
    if (viewId === "dashboard") {
      renderDisponibilidadeServicoSocial();
      renderGerenciamentoUsuarios();
    } else if (viewId === "configuracoes") {
      const configModule = await import("./configuracoes.js");
      if (configModule.init) configModule.init();
    }
  } catch (error) {
    console.error("Erro ao carregar a view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Ocorreu um erro ao carregar esta seção.</div>`;
  }
}

// --- Funções Específicas do Dashboard (permanecem as mesmas) ---

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
        ? Object.values(item.disponibilidade)
            .map((m) =>
              Object.values(m)
                .map((t) => t.dias.join(", "))
                .join(", ")
            )
            .join("; ")
        : "Nenhum horário";
      html += `<li class="list-group-item d-flex justify-content-between align-items-center">${item.nome}<span class="badge bg-primary rounded-pill">${horarios}</span></li>`;
    });
    container.innerHTML = html + "</ul>";
  } catch (error) {
    console.error("Erro ao carregar disponibilidade:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os dados.</div>`;
  }
}

async function renderGerenciamentoUsuarios() {
  const container = document.getElementById("usuarios-admin-container");
  if (!container) return;
  container.innerHTML =
    '<div class="spinner-border" role="status"><span class="visually-hidden">Carregando...</span></div>';
  try {
    const functions = getFunctions();
    const getUsuarios = httpsCallable(functions, "getTodosUsuarios");
    const result = await getUsuarios();
    const usuarios = result.data;
    let tableHtml = `<table class="table table-striped"><thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Ações</th></tr></thead><tbody>`;
    usuarios.forEach((user) => {
      tableHtml += `<tr><td>${user.nome || "N/A"}</td><td>${
        user.email
      }</td><td><span class="badge bg-info">${
        user.role
      }</span></td><td><button class="btn btn-sm btn-primary" data-uid="${
        user.uid
      }">Editar</button></td></tr>`;
    });
    container.innerHTML = tableHtml + "</tbody></table>";
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os usuários.</div>`;
  }
}
