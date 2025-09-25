// Arquivo: /modulos/servico-social/js/servico-social-painel.js
// Versão: 2.4 (Corrige erro de referência e implementa links externos de forma segura)

export function initsocialPanel(user, db, userData) {
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
        agendamentos: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        fila: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        calculo: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
        disponibilidade: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        script: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
        drive: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`
    };

    const views = [
        { id: 'agendamentos-triagem', name: 'Agendamentos de Triagem', roles: ['admin', 'servico_social'], icon: icons.agendamentos },
        { id: 'fila-atendimento', name: 'Fila de Atendimento', roles: ['admin', 'servico_social'], icon: icons.fila },
        { id: 'calculo-contribuicao', name: 'Cálculo de Contribuição', roles: ['admin', 'servico_social'], icon: icons.calculo },
        { id: 'disponibilidade-assistente', name: 'Minha Disponibilidade', roles: ['admin', 'servico_social'], icon: icons.disponibilidade },
        { id: 'script-triagem', name: 'Script da Triagem', roles: ['admin', 'servico_social'], icon: icons.script },
        { id: 'drive', name: 'Acesso ao Drive', roles: ['admin', 'servico_social'], url: 'https://drive.google.com/drive/u/1/folders/0AONLPOTn6ns3Uk9PVA', isExternal: true, icon: icons.drive }
    ];

    function buildSocialSidebarMenu(userRoles = []) {
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
            const hasPermission = view.roles.some(role => userRoles.includes(role.trim()));
            if (hasPermission) {
                const menuItem = document.createElement('li');
                const link = document.createElement('a');
                
                link.dataset.view = view.id;
                link.href = view.isExternal ? view.url : `#${view.id}`;
                if (view.isExternal) {
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                }
                
                link.innerHTML = `${view.icon}<span>${view.name}</span>`;
                menuItem.appendChild(link);
                sidebarMenu.appendChild(menuItem);
            }
        });
    }

    async function loadView(viewName) {
        // Encontra a view para verificar se é externa. Se for, não faz nada.
        const viewData = views.find(v => v.id === viewName);
        if (viewData && viewData.isExternal) {
            return; // Impede o carregamento de views para links externos
        }

        const menuLinks = sidebarMenu.querySelectorAll('a[data-view]');
        menuLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        
        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch(`./${viewName}.html`);
            if (!response.ok) {
                throw new Error(`Arquivo da view não encontrado: ${viewName}.html`);
            }
            contentArea.innerHTML = await response.text();
            
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

    function start() {
        const userRoles = userData.funcoes || [];
        buildSocialSidebarMenu(userRoles);

        const handleHashChange = () => {
            const viewName = window.location.hash.substring(1);
            if (viewName) {
                loadView(viewName);
            }
        };

        const initialHash = window.location.hash.substring(1);
        if (initialHash) {
            loadView(initialHash);
        } else {
            const firstLink = sidebarMenu.querySelector('a[data-view]:not([target="_blank"])');
            if (firstLink) {
                window.location.hash = firstLink.dataset.view;
            }
        }
        
        window.addEventListener('hashchange', handleHashChange);
    }

    start();
}