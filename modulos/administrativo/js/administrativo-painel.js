// Arquivo: /modulos/administrativo/js/administrativo-painel.js
// Versão: 1.1 (DEBUG)
// Descrição: Adiciona logs de diagnóstico para rastrear o fluxo de execução.

export function init(user, db, userData) {
    console.log('[DEBUG] 1. Função init() do administrativo-painel.js foi chamada.');

    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');
    
    const views = [
        {
            id: 'dashboard',
            name: 'Dashboard',
            roles: ['admin', 'gestor', 'assistente'],
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`
        },
        {
            id: 'grade',
            name: 'Grade de Horários',
            roles: ['admin', 'gestor', 'assistente'],
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
        }
    ];

    function buildSidebarMenu(userRoles = []) {
        console.log('[DEBUG] 3. buildSidebarMenu() chamada.');
        if (!sidebarMenu) {
            console.error('[DEBUG] ERRO: Elemento #sidebar-menu não encontrado.');
            return;
        }
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
        console.log(`[DEBUG] 5. loadView() foi chamada com viewId: '${viewId}'`);
        if (!viewId) {
            console.error('[DEBUG] ERRO: loadView foi chamada com um viewId nulo ou indefinido. Abortando.');
            contentArea.innerHTML = '<h2>Erro: Nenhuma view válida para carregar. Verifique as permissões.</h2>';
            return;
        }

        sidebarMenu.querySelectorAll('a[data-view]').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });
        
        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            console.log(`[DEBUG] 6. Tentando fazer fetch de ./${viewId}.html`);
            const response = await fetch(`./${viewId}.html`);
            if (!response.ok) throw new Error(`Arquivo da view não encontrado: ${viewId}.html (Status: ${response.status})`);
            
            console.log(`[DEBUG] 7. Fetch de ./${viewId}.html bem-sucedido. Inserindo HTML.`);
            contentArea.innerHTML = await response.text();

            try {
                console.log(`[DEBUG] 8. Tentando importar o módulo ../js/${viewId}.js`);
                const viewModule = await import(`../js/${viewId}.js`);
                if (viewModule && typeof viewModule.init === 'function') {
                    console.log(`[DEBUG] 9. Módulo importado com sucesso. Chamando init() de ${viewId}.js.`);
                    viewModule.init(db, user, userData);
                } else {
                     console.log(`[DEBUG] Módulo ${viewId}.js importado, mas não possui uma função init().`);
                }
            } catch (jsError) {
                console.log(`[DEBUG] Nenhum módulo JS para a view '${viewId}'. Carregando como página estática.`);
            }
        } catch (error) {
            console.error(`[DEBUG] ERRO FATAL ao carregar a view ${viewId}:`, error);
            contentArea.innerHTML = `<h2>Erro ao carregar o módulo. Verifique o console para mais detalhes.</h2>`;
        }
    }

    function setupPageHeader() {
        // Esta função não precisa de log, é apenas visual.
        const pageTitleContainer = document.getElementById('page-title-container');
        if (pageTitleContainer) {
            pageTitleContainer.innerHTML = `
                <h1>Painel Administrativo</h1>
                <p>Gestão de configurações e dados do sistema.</p>
            `;
        }
    }

    function start() {
        console.log('[DEBUG] 2. Função start() chamada.');
        const userRoles = userData.funcoes || [];
        console.log('[DEBUG] Funções do usuário encontradas:', userRoles);
        setupPageHeader();
        buildSidebarMenu(userRoles);

        const handleHashChange = () => {
            const viewId = window.location.hash.substring(1);
            const firstValidView = views.find(v => v.roles.some(role => userRoles.includes(role)));
            const defaultViewId = firstValidView ? firstValidView.id : null;
            
            console.log(`[DEBUG] 4. handleHashChange disparado. View Padrão: '${defaultViewId}'. View na URL: '${viewId}'`);
            loadView(viewId || defaultViewId);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
    }

    start();
}