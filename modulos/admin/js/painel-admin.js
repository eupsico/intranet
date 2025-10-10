import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";

// Função de entrada do módulo, chamada pelo app.js
export function init(user, userData) {
  console.log("🔹 Painel de Administração iniciado para:", userData.nome);
  handleNavigation();
  window.addEventListener("hashchange", handleNavigation);
}

// Constrói o menu na barra lateral principal
function buildAdminSidebarMenu() {
  const sidebarMenu = document.getElementById("sidebar-menu");
  if (!sidebarMenu) return;

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

  let menuHtml = `
        <li>
            <a href="../../../index.html" class="back-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Voltar à Intranet</span>
            </a>
        </li>
        <li class="menu-separator"></li>
    `;

  views.forEach((view) => {
    menuHtml += `<li><a href="#${view.id}" data-view="${view.id}">${view.icon}<span>${view.name}</span></a></li>`;
  });

  sidebarMenu.innerHTML = menuHtml;
}

// Gerencia a navegação e o carregamento da view
function handleNavigation() {
  const viewId = window.location.hash.substring(1) || "dashboard";
  loadView(viewId);
}

// Carrega o HTML e o JS de uma sub-página
async function loadView(viewId) {
  const contentArea = document.getElementById("content-area");
  const sidebarMenu = document.getElementById("sidebar-menu");
  if (!contentArea || !sidebarMenu) return;

  buildAdminSidebarMenu();

  sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });

  contentArea.innerHTML = '<div class="loading-spinner"></div>';

  try {
    // --- INÍCIO DA CORREÇÃO ---
    let htmlPath;
    switch (viewId) {
      case "dashboard":
        htmlPath = "./dashboard-admin.html"; // Nome correto do arquivo
        break;
      case "configuracoes":
        htmlPath = "./configuracoes.html";
        break;
      default:
        // Se a view não for encontrada, carrega o dashboard por padrão
        htmlPath = "./dashboard-admin.html";
        window.location.hash = "dashboard";
        break;
    }
    // --- FIM DA CORREÇÃO ---

    const response = await fetch(htmlPath);
    if (!response.ok) throw new Error(`Não foi possível carregar ${htmlPath}`);
    contentArea.innerHTML = await response.text();

    if (viewId === "dashboard" || !viewId) {
      // Carrega o dashboard como padrão
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

// --- Funções de Renderização do Dashboard (ATUALIZADAS) ---

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
    const disponibilidades = result.data.sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    if (!disponibilidades || disponibilidades.length === 0) {
      container.innerHTML = "<p>Nenhuma disponibilidade encontrada.</p>";
      return;
    }

    let html = '<div class="disponibilidade-list">';
    disponibilidades.forEach((assistente) => {
      html += `<div class="assistente-item">`;
      html += `<h5 class="assistente-nome">${assistente.nome}</h5>`;
      const dispoMap = assistente.disponibilidade;
      if (!dispoMap || Object.keys(dispoMap).length === 0) {
        html += '<p class="no-dispo">Nenhuma disponibilidade informada.</p>';
      } else {
        html += "<ul>";
        Object.keys(dispoMap)
          .sort()
          .forEach((mesKey) => {
            const dadosDoMes = dispoMap[mesKey];
            const [ano, mes] = mesKey.split("-");
            const nomeMes = new Date(ano, parseInt(mes) - 1, 1).toLocaleString(
              "pt-BR",
              { month: "long" }
            );

            if (dadosDoMes.online && dadosDoMes.online.dias.length > 0) {
              const dias = dadosDoMes.online.dias
                .map((d) => d.split("-")[2])
                .join(", ");
              html += `<li><strong>${nomeMes} (Online):</strong> Dias ${dias} das ${dadosDoMes.online.inicio} às ${dadosDoMes.online.fim}</li>`;
            }
            if (
              dadosDoMes.presencial &&
              dadosDoMes.presencial.dias.length > 0
            ) {
              const dias = dadosDoMes.presencial.dias
                .map((d) => d.split("-")[2])
                .join(", ");
              html += `<li><strong>${nomeMes} (Presencial):</strong> Dias ${dias} das ${dadosDoMes.presencial.inicio} às ${dadosDoMes.presencial.fim}</li>`;
            }
          });
        html += "</ul>";
      }
      html += `</div>`;
    });
    container.innerHTML = html + "</div>";
  } catch (error) {
    console.error("Erro ao carregar disponibilidade:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os dados de disponibilidade.</div>`;
  }
}

async function renderGerenciamentoUsuarios() {
  const container = document.getElementById("usuarios-admin-container");
  if (!container) return;
  try {
    const functions = getFunctions();
    const getUsuarios = httpsCallable(functions, "getTodosUsuarios");
    const result = await getUsuarios();
    const usuarios = result.data.sort((a, b) => a.nome.localeCompare(b.nome));

    let tableHtml = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Perfil</th>
                            <th class="text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>`;

    usuarios.forEach((user) => {
      tableHtml += `
                <tr>
                    <td>${user.nome || "Não informado"}</td>
                    <td>${user.email}</td>
                    <td><span class="badge">${
                      user.role || "Sem perfil"
                    }</span></td>
                    <td class="text-right"><button class="action-button secondary btn-sm" data-uid="${
                      user.uid
                    }">Editar</button></td>
                </tr>
            `;
    });

    container.innerHTML = tableHtml + "</tbody></table></div>";
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    container.innerHTML = `<div class="alert alert-danger">Não foi possível carregar a lista de usuários.</div>`;
  }
}
