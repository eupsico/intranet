// Arquivo: assets/js/painel-financeiro.js
// Versão: 2.5
// Descrição: Altera o método de carregamento de views para buscar arquivos HTML externos.

export function initFinancePanel(user, db, userData) {
    
    window.db = db;
    
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.padding = '15px 20px';
        toast.style.borderRadius = '5px';
        toast.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
        toast.style.color = 'white';
        toast.style.zIndex = '1050';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.4s ease';
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');
    // A constante viewTemplates foi removida, pois não é mais necessária.

    const views = [
        { id: 'dashboard', name: 'Dashboard', roles: ['admin', 'financeiro', 'rh'] },
        { id: 'resumo_horas', name: 'Resumo de Horas', roles: ['admin', 'financeiro'] },
        { id: 'cobranca_mensal', name: 'Cobrança Mensal', roles: ['admin', 'financeiro'] },
        { id: 'controle_pagamentos', name: 'Controle de Pagamentos', roles: ['admin', 'financeiro'] },
        { id: 'devedores', name: 'Devedores', roles: ['admin', 'financeiro'] },
        { id: 'acordos', name: 'Acordos', roles: ['admin', 'financeiro'] },
        { id: 'lancamentos', name: 'Lançamentos', roles: ['admin', 'financeiro'] },
        { id: 'envio_comprovantes', name: 'Envio de Comprovantes', roles: ['admin', 'financeiro', 'atendimento'] },
        { id: 'repasse', name: 'Repasse Profissionais', roles: ['admin', 'financeiro'] },
        { id: 'relatorios', name: 'Relatórios e Backup', roles: ['admin', 'financeiro'] }
    ];

    function buildFinanceSidebarMenu(userRoles = []) {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = ''; 

        const backLink = document.createElement('li');
        backLink.innerHTML = `
            <a href="../../../index.html" class="back-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Voltar à Intranet</span>
            </a>
        `;
        sidebarMenu.appendChild(backLink);

        const separator = document.createElement('li');
        separator.className = 'menu-separator';
        sidebarMenu.appendChild(separator);

        views.forEach(view => {
            const hasPermission = view.roles.length === 0 || view.roles.some(role => userRoles.includes(role.trim()));
            if (hasPermission) {
                const menuItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = `#${view.id}`;
                link.dataset.view = view.id;
                link.innerHTML = `<span>${view.name}</span>`;
                menuItem.appendChild(link);
                sidebarMenu.appendChild(menuItem);
            }
        });
    }

    // ALTERAÇÃO: A função loadView agora usa fetch para buscar arquivos HTML
    async function loadView(viewName) {
        const menuLinks = sidebarMenu.querySelectorAll('a[data-view]');
        menuLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        
        try {
            contentArea.innerHTML = '<div class="loading-spinner"></div>';
            
            // Busca o arquivo HTML da view correspondente na pasta 'page'
            const response = await fetch(`./${viewName}.html`); // Caminho relativo à página atual
            if (!response.ok) {
                throw new Error(`Arquivo da view não encontrado: ${viewName}.html`);
            }
            contentArea.innerHTML = await response.text();

            // Carrega dinamicamente o JS específico da view, se existir
            const oldScript = document.getElementById('dynamic-view-script');
            if (oldScript) oldScript.remove();
            
            const scriptPath = `../js/${viewName}.js`;
            try {
                const viewModule = await import(scriptPath);
                if (viewModule && typeof viewModule.init === 'function') {
                    viewModule.init(db, user, userData);
                }
            } catch (e) {
                console.log(`Nenhum script de inicialização para a view '${viewName}'.`);
            }
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewName}:`, error);
            contentArea.innerHTML = `<h2>Erro ao carregar o módulo '${viewName}'.</h2><p>${error.message}.</p>`;
        }
    }

    // --- Ponto de Partida do Módulo Financeiro ---
    const userRoles = userData.funcoes || [];
    buildFinanceSidebarMenu(userRoles);

    const hash = window.location.hash.substring(1);
    const viewExists = views.some(v => v.id === hash);
    const hasPermissionForHash = viewExists && views.find(v => v.id === hash).roles.some(role => userRoles.includes(role.trim()));

    if (hash && viewExists && hasPermissionForHash) {
        loadView(hash);
    } else {
        const firstAvailableLink = sidebarMenu.querySelector('a[data-view]');
        if (firstAvailableLink) {
            window.location.hash = firstAvailableLink.dataset.view;
        } else {
            contentArea.innerHTML = '<h2>Você não tem permissão para acessar nenhuma seção deste módulo.</h2>';
        }
    }

    window.addEventListener('hashchange', () => {
        const viewName = window.location.hash.substring(1);
        if (viewName) loadView(viewName);
    });
}