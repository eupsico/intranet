// Arquivo: /modulos/administrativo/js/administrativo-painel.js
// Versão: 1.6
// Descrição: Adiciona carregamento dinâmico de CSS para as views.

export function init(user, db, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    const views = [
        {
            id: 'grade',
            name: 'Grade de Horários',
            roles: ['admin', 'gestor', 'assistente'],
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
        },
        {
            id: 'lancamentos',
            name: 'Adicionar Lançamento',
            module: 'financeiro',
            roles: ['admin', 'gestor', 'assistente'],
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
            let htmlPath, jsPath, cssPath;
            if (view.module) {
                htmlPath = `../../${view.module}/page/${viewId}.html`;
                jsPath = `../../${view.module}/js/${viewId}.js`;
                cssPath = `../../${view.module}/css/${viewId}.css`; // Caminho para o CSS externo
            } else {
                htmlPath = `./${viewId}.html`;
                jsPath = `./${viewId}.js`;
                cssPath = `../css/${viewId}.css`; // Caminho para o CSS interno
            }

            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Arquivo da view não encontrado: ${htmlPath} (Status: ${response.status})`);

            let htmlContent = await response.text();

            if (viewId === 'lancamentos') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                const title = doc.querySelector('h1');
                if (title) title.textContent = 'Adicionar Lançamento';
                const tabs = doc.querySelector('.tabs-container');
                if (tabs) tabs.style.display = 'none';
                const registeredTabContent = doc.querySelector('#LancamentosRegistrados');
                if (registeredTabContent) registeredTabContent.remove();
                htmlContent = doc.body.innerHTML;
            }

            contentArea.innerHTML = htmlContent;

            // Lógica para carregar o CSS dinamicamente
            document.querySelectorAll('link[data-dynamic-style]').forEach(el => el.remove());
            const link = document.createElement('link');
            link.setAttribute('data-dynamic-style', 'true');
            link.rel = 'stylesheet';
            link.href = cssPath;
            link.onerror = () => { link.remove(); };
            document.head.appendChild(link);

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
        handleHashChange();
    }

    start();
}