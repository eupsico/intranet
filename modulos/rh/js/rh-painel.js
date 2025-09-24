// Arquivo: /modulos/rh/js/rh-painel.js
// Versão: 1.0
// Descrição: Arquivo principal para o Painel de Recursos Humanos.

export function init(user, db, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    // Define a função showToast no escopo da janela para que os módulos carregados possam usá-la.
    window.showToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        // (Estilos para o toast podem ser adicionados aqui ou via CSS)
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const views = [
        {
            id: 'gestao_profissionais',
            name: 'Gestão de Profissionais',
            roles: ['admin', 'rh'],
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`
        }
        // Futuras telas de RH podem ser adicionadas aqui
    ];

    function buildSidebarMenu(userRoles = []) {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = `
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
        sidebarMenu.querySelectorAll('a[data-view]').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch(`./${viewId}.html`);
            if (!response.ok) throw new Error(`Arquivo da view não encontrado: ${viewId}.html`);
            contentArea.innerHTML = await response.text();

            const viewModule = await import(`../js/${viewId}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData);
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
                <h1>Recursos Humanos</h1>
                <p>Gestão de profissionais, vagas e comunicados.</p>
            `;
        }
    }

    function start() {
        const userRoles = userData.funcoes || [];
        setupPageHeader();
        buildSidebarMenu(userRoles);

        const handleHashChange = () => {
            const viewId = window.location.hash.substring(1) || views[0].id;
            loadView(viewId);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Carga inicial
    }

    start();
}