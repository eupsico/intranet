// Arquivo: /modulos/rh/js/rh-painel.js
// Versão: 1.0
// Descrição: Arquivo principal para o Painel de Recursos Humanos.

export function initrhPanel(user, db, userData) {

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

    const icons = {
        gestao_profissionais: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
        gestao_vagas: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2h-4l-3-3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l3 3h7a2 2 0 0 0 2-2z"/></svg>`,
        comunicados: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z"></path></svg>`
    }
    const views = [
        {id: 'gestao_profissionais', name: 'Gestão de Profissionais',  roles: ['admin', 'rh'],  icon: icons.gestao_profissionais},
        {id: 'gestao_vagas', name: 'Gestão de Vagas', roles: ['admin', 'rh'], icon: icons.gestao_vagas}, // Futuras telas de RH podem ser adicionadas aqui
        {id: 'comunicados', name: 'Comunicados', roles: ['admin', 'rh'], icon: icons.comunicados}        
        // Futuras telas de RH podem ser adicionadas aqui
    ];

    function buildRHSidebarMenu(userRoles = []) {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = ''; 
        const backLink = document.createElement('li');
        backLink.innerHTML = `
            <li>
                <a href="../../../index.html" class="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    <span>Voltar à Intranet</span>
                </a>
            </li>
            <li class="menu-separator"></li>
        `;
        
        sidebarMenu.appendChild(backLink);

        views.forEach(view => {
            const hasPermission = view.roles.length === 0 || view.roles.some(role => userRoles.includes(role.trim()));
            if (hasPermission) {
                const menuItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = `#${view.id}`;
                link.dataset.view = view.id;
                // 2. Adicionar o ícone ao lado do nome
                link.innerHTML = `${view.icon}<span>${view.name}</span>`;
                menuItem.appendChild(link);
                sidebarMenu.appendChild(menuItem);
            }
        });
    }

     async function loadView(viewName) {
        console.log(`[DEBUG] Tentando carregar a view: ${viewName}`);
        const menuLinks = sidebarMenu.querySelectorAll('a[data-view]');
        menuLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        
        try {
            contentArea.innerHTML = '<div class="loading-spinner"></div>';
            
            const response = await fetch(`./${viewName}.html`);
            if (!response.ok) {
                throw new Error(`Arquivo da view não encontrado: ${viewName}.html`);
            }
            contentArea.innerHTML = await response.text();

            const oldScript = document.getElementById('dynamic-view-script');
            if (oldScript) oldScript.remove();
            
            const scriptPath = `../js/${viewName}.js`;
            try {
                const viewModule = await import(scriptPath);
                if (viewModule && typeof viewModule.init === 'function') {
                    viewModule.init(db, user, userData);
                }
            } catch (e) {
                console.log(`Nenhum script de inicialização para a view '${viewName}'.`, e);
            }
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewName}:`, error);
            contentArea.innerHTML = `<h2>Erro ao carregar o módulo '${viewName}'.</h2><p>${error.message}.</p>`;
        }
    }
    
    const userRoles = userData.funcoes || [];
    buildRHSidebarMenu(userRoles);

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