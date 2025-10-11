// /modulos/gestao/js/painel-gestao.js
// VERSÃO 3.0 (CORRIGIDA - Com importação dinâmica de módulos)

// Mapeia os IDs das views para seus arquivos HTML e JS correspondentes
const views = {
  "dashboard-reunioes": { html: "dashboard-reunioes.html", js: null }, // Dashboard não tem JS próprio
  "ata-de-reuniao": {
    html: "ata-de-reuniao.html",
    js: "../js/ata-de-reuniao.js",
  },
  "plano-de-acao": { html: "plano-de-acao.html", js: null }, // Adicione o JS se necessário
  "relatorio-feedback": { html: "relatorio-feedback.html", js: null }, // Adicione o JS se necessário
};

// Funções globais da aplicação (usuário e dados do usuário)
let appUser, appUserData;

export function init(user, userData) {
  console.log("🚀 Módulo de Gestão iniciado para:", userData.nome);
  appUser = user;
  appUserData = userData;

  buildGestaoSidebarMenu();
  window.addEventListener("hashchange", handleNavigation);
  handleNavigation();
}

function buildGestaoSidebarMenu() {
  const sidebarMenu = document.getElementById("sidebar-menu");
  if (!sidebarMenu) return;

  const menuItems = [
    { id: "dashboard-reunioes", name: "Dashboard", icon: "dashboard" },
    { id: "ata-de-reuniao", name: "Registrar Ata", icon: "edit_document" },
    { id: "plano-de-acao", name: "Plano de Ação", icon: "task_alt" },
    { id: "relatorio-feedback", name: "Relatórios", icon: "analytics" },
  ];

  let menuHtml = `
    <li>
        <a href="../../../index.html" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Voltar à Intranet</span>
        </a>
    </li>
    <li class="menu-separator"></li>
  `;

  menuItems.forEach((item) => {
    menuHtml += `
      <li>
          <a href="#${item.id}" data-view="${item.id}">
              <span class="material-symbols-outlined">${item.icon}</span>
              <span>${item.name}</span>
          </a>
      </li>
    `;
  });
  sidebarMenu.innerHTML = menuHtml;
}

function handleNavigation() {
  const viewId = window.location.hash.substring(1) || "dashboard-reunioes";
  loadView(viewId);
}

async function loadView(viewId) {
  const contentArea = document.getElementById("content-area");
  if (!views[viewId]) {
    contentArea.innerHTML = `<div class="alert alert-danger">Página não encontrada.</div>`;
    return;
  }

  contentArea.innerHTML = '<div class="loading-spinner"></div>';
  updateActiveMenu(viewId);

  try {
    const viewConfig = views[viewId];
    const response = await fetch(`./${viewConfig.html}`);
    if (!response.ok) throw new Error(`Falha ao carregar ${viewConfig.html}.`);

    contentArea.innerHTML = await response.text();
    console.log(`✅ View HTML '${viewId}' carregada.`);

    // **A MUDANÇA CRÍTICA ESTÁ AQUI**
    // Se a view tem um arquivo JS associado, importa e executa a função 'init' dele.
    if (viewConfig.js) {
      console.log(`[PAINEL] Importando módulo JS: ${viewConfig.js}`);
      const module = await import(viewConfig.js);
      if (module && typeof module.init === "function") {
        console.log(`[PAINEL] Executando init() de ${viewId}...`);
        module.init(appUser, appUserData);
      } else {
        console.warn(`Módulo ${viewConfig.js} não possui uma função init().`);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar a view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Ocorreu um erro ao carregar esta seção.</div>`;
  }
}

function updateActiveMenu(viewId) {
  const sidebarMenu = document.getElementById("sidebar-menu");
  if (!sidebarMenu) return;

  sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });

  const pageTitle = document.querySelector("#page-title-container");
  if (pageTitle) {
    const menuItem = sidebarMenu.querySelector(
      `a[data-view="${viewId}"] span:not(.material-symbols-outlined)`
    );
    if (menuItem) {
      pageTitle.textContent = menuItem.textContent;
    }
  }
}
