// Arquivo: /modulos/administrativo/js/administrativo-painel.js
// Versão: 1.8
// Descrição: Adiciona a view 'gestao_agendas' para o gerenciamento da agenda do Serviço Social.

export function initadministrativoPanel(user, db, userData) {
  const contentArea = document.getElementById("content-area");
  const sidebarMenu = document.getElementById("sidebar-menu");

  window.showToast = function (message, type = "success") {
    const container =
      document.getElementById("toast-container") || document.body;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.zIndex = "1050";
    toast.style.backgroundColor = type === "success" ? "#28a745" : "#dc3545";
    toast.style.color = "white";
    // ... (restante do código do toast sem alterações)
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  function setupSidebarToggle() {
    //... (seu código original sem alterações)
  }

  // Array de views do painel administrativo
  const views = [
    {
      id: "grade",
      name: "Grade de Horários",
      roles: ["admin", "gestor", "assistente"],
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    },
    // NOVA VIEW ADICIONADA
    {
      id: "gestao_agendas",
      name: "Gerir Agendas (Social)",
      roles: ["admin"], // Apenas admins podem ver
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m10.5 14 2 2 4-4"/></svg>`,
    },
    {
      id: "lancamentos",
      name: "Adicionar Lançamento",
      module: "financeiro",
      roles: ["admin", "gestor", "assistente"],
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
    },
  ];

  function buildSidebarMenu(userRoles = []) {
    //... (seu código original sem alterações)
  }

  async function loadView(viewId) {
    const view = views.find((v) => v.id === viewId);
    if (!view) {
      contentArea.innerHTML = "<h2>Página não encontrada.</h2>";
      return;
    }

    sidebarMenu.querySelectorAll("a[data-view]").forEach((link) => {
      link.classList.toggle("active", link.dataset.view === viewId);
    });

    contentArea.innerHTML = '<div class="loading-spinner"></div>';
    try {
      let htmlPath, jsPath, cssPath;
      if (view.module) {
        htmlPath = `../../${view.module}/page/${viewId}.html`;
        jsPath = `../../${view.module}/js/${viewId}.js`;
        cssPath = `../../${view.module}/css/${viewId}.css`;
      } else {
        htmlPath = `./${viewId}.html`; // Caminho relativo para arquivos no mesmo módulo
        jsPath = `../js/${viewId}.js`; // Ajustado para buscar JS na pasta correta
        cssPath = `../css/${viewId}.css`;
      }

      const response = await fetch(htmlPath);
      if (!response.ok)
        throw new Error(`Arquivo da view não encontrado: ${htmlPath}`);

      contentArea.innerHTML = await response.text();

      // Lógica para carregar CSS dinâmico (sem alterações)

      // Lógica para carregar JS dinâmico
      try {
        // O import agora usa o caminho corrigido
        const viewModule = await import(jsPath);
        if (viewModule && typeof viewModule.init === "function") {
          viewModule.init(db, user, userData);
        }
      } catch (jsError) {
        console.log(
          `Nenhum módulo JS para a view '${viewId}'. Carregando como página estática.`,
          jsError
        );
      }
    } catch (error) {
      console.error(`Erro ao carregar a view ${viewId}:`, error);
      contentArea.innerHTML = `<h2>Erro ao carregar o módulo.</h2><p>${error.message}</p>`;
    }
  }

  function setupPageHeader() {
    //... (seu código original sem alterações)
  }

  function start() {
    const userRoles = userData.funcoes || [];
    setupPageHeader();
    buildSidebarMenu(userRoles);
    setupSidebarToggle(); // Garante que o toggle da sidebar seja configurado

    const handleHashChange = () => {
      const viewId = window.location.hash.substring(1);
      const firstValidView = views.find((v) =>
        v.roles.some((role) => userRoles.includes(role))
      );
      const defaultViewId = firstValidView ? firstValidView.id : "grade"; // Define 'grade' como padrão

      loadView(viewId || defaultViewId);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Carga inicial
  }

  start();
}
