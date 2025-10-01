// Arquivo: /modulos/administrativo/js/administrativo-painel.js
// Versão: 2.0 (Convertido para Módulo Dinâmico)

// A função 'init' é o ponto de entrada chamado pelo app.js
export function init(db, user, userData, functions) {
  console.log("Módulo Administrativo iniciado!");

  const subMenuContainer = document.getElementById("administrativo-submenu");
  const contentContainer = document.getElementById("administrativo-content");

  // Configuração das "views" (sub-páginas) deste módulo
  const views = [
    {
      id: "grade",
      name: "Grade de Horários",
      roles: ["admin", "gestor", "assistente"],
      icon: `<i class="fas fa-calendar-alt"></i>`,
    },
    // Adicione outras views do módulo administrativo aqui no futuro
  ];

  function buildSubMenu() {
    if (!subMenuContainer) return;
    const userRoles = userData.funcoes || [];
    let menuHtml = "";

    views.forEach((view) => {
      const hasPermission = view.roles.some((role) => userRoles.includes(role));
      if (hasPermission) {
        // As URLs agora usam uma hash secundária para o sub-roteamento
        menuHtml += `
                    <li>
                        <a href="#!/administrativo#${view.id}" data-view="${view.id}">
                            ${view.icon}
                            <span>${view.name}</span>
                        </a>
                    </li>`;
      }
    });
    subMenuContainer.innerHTML = menuHtml;
  }

  async function loadSubView(viewId) {
    if (!contentContainer) return;

    const view = views.find((v) => v.id === viewId);
    if (!view) {
      contentContainer.innerHTML = "<h2>Selecione uma opção no menu.</h2>";
      return;
    }

    // Marca o link ativo no submenu
    subMenuContainer.querySelectorAll("a").forEach((link) => {
      link.classList.toggle("active", link.dataset.view === viewId);
    });

    contentContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
      // Caminhos relativos à raiz do projeto
      const htmlPath = `./modulos/administrativo/page/${view.id}.html`;
      const jsPath = `./modulos/administrativo/js/${view.id}.js`;

      const response = await fetch(htmlPath);
      if (!response.ok) throw new Error(`Arquivo da sub-view não encontrado.`);

      contentContainer.innerHTML = await response.text();

      // Carrega o JS específico da sub-view
      const viewModule = await import(jsPath);
      if (viewModule && typeof viewModule.init === "function") {
        viewModule.init(db, user, userData, functions);
      }
    } catch (error) {
      console.error(`Erro ao carregar a sub-view ${viewId}:`, error);
      contentContainer.innerHTML = `<h2>Erro ao carregar seção.</h2><p>${error.message}</p>`;
    }
  }

  // Lógica principal do módulo
  function start() {
    buildSubMenu();

    // Roteador interno para as sub-páginas do módulo
    const handleSubRouteChange = () => {
      // A hash secundária (após a primeira) controla o conteúdo interno
      const subViewId = window.location.hash.split("#")[2];
      const userRoles = userData.funcoes || [];
      const firstValidView = views.find((v) =>
        v.roles.some((role) => userRoles.includes(role))
      );

      loadSubView(subViewId || (firstValidView ? firstValidView.id : null));
    };

    // Escuta por mudanças na hash para navegar entre as seções do módulo
    window.addEventListener("hashchange", handleSubRouteChange);
    // Carrega a view inicial
    handleSubRouteChange();
  }

  // Inicia o módulo administrativo
  start();
}
