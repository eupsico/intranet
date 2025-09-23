// Arquivo: /modulos/administrativo/js/administrativo-painel.js
// Versão: 1.3
// Descrição: Corrige o carregamento de views de múltiplos módulos.

export function init(user, db, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    // Definição das views (páginas) disponíveis no painel
    const views = [
        {
            id: 'grade',
            name: 'Grade de Horários',
            roles: ['admin', 'gestor', 'assistente'],
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
        },
        {
            id: 'lancamentos',
            name: 'Lançamentos',
            module: 'financeiro', // Especifica o módulo de origem
            roles: ['admin', 'financeiro'],
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`
        }
    ];

    function buildSidebarMenu(userRoles = []) {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = '';

        sidebarMenu.innerHTML += `
            <li>
                <a href="../../../index.html" class="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    <span>Voltar à Intranet</span>
                </a>
            </li>
            <li class="menu-separator"></li>
        `;

        views.forEach(view => {
            const hasPermission = view.roles.some(role => userRoles.includes(role));
            if (hasPermission) {
                sidebarMenu.innerHTML += `
                    <li>
                        <a href="#${view.id}" data-view="${view.id}">
                            ${view.icon}
                            <span>${view.name}</span>
                        </a>
                    </li>`;
            }
        });
    }

    async function loadView(viewId) {
        const view = views.find(v => v.id === viewId);
        if (!view) {
            contentArea.innerHTML = '<h2>View não encontrada.</h2>';
            return;
        }

        sidebarMenu.querySelectorAll('a[data-view]').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            // CORREÇÃO: Lógica de caminhos para múltiplos módulos
            let htmlPath, jsPath;
            if (view.module) {
                // View de um módulo externo
                htmlPath = `../${view.module}/page/${viewId}.html`;   // Caminho a partir de /administrativo/page/
                jsPath = `../../${view.module}/js/${viewId}.js`;     // Caminho a partir de /administrativo/js/
            } else {
                // View do módulo atual (administrativo)
                htmlPath = `./${viewId}.html`;                       // Caminho a partir de /administrativo/page/
                jsPath = `./${viewId}.js`;                         // Caminho a partir de /administrativo/js/
            }

            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Arquivo da view não encontrado: ${htmlPath} (Status: ${response.status})`);

            contentArea.innerHTML = await response.text();

            try {
                const viewModule = await import(jsPath);
                if (viewModule && typeof viewModule.init === 'function') {
                    viewModule.init(db, user, userData);
                }
            } catch (jsError) {
                console.log(`Nenhum módulo JS para a view '${viewId}'. Carregando como página estática.`, jsError);
            }
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewId}:`, error);
            contentArea.innerHTML = `<h2>Erro ao carregar o módulo.</h2><p>${error.message}</p>`;
        }
    }

    function setupPageHeader() {
        const pageTitleContainer = document.getElementById('page-title-container');
        if (pageTitleContainer) {
            pageTitleContainer.innerHTML = `
                <h1>Painel Administrativo</h1>
                <p>Gestão de configurações e dados do sistema.</p>
            `;
        }
    }

    function start() {
        const userRoles = userData.funcoes || [];
        setupPageHeader();
        buildSidebarMenu(userRoles);

        const handleHashChange = () => {
            const viewId = window.location.hash.substring(1);
            const firstValidView = views.find(v => v.roles.some(role => userRoles.includes(role)));
            const defaultViewId = firstValidView ? firstValidView.id : null;

            loadView(viewId || defaultViewId);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Carrega a view inicial
    }

    start();
}