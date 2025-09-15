// assets/js/painel-financeiro.js
// Versão: 2.1
// Descrição: Refatorado para ser um módulo especialista, sem controle de autenticação próprio.

// A configuração e inicialização do Firebase foram removidas.

// A lógica agora está encapsulada em uma função para ser chamada pelo app.js
export function initFinancePanel(user, db, userData) {
    
    // Disponibiliza auth e db para scripts de view que possam ser carregados dinamicamente
    window.auth = user ? user.auth : firebase.auth(); // Garante que auth esteja disponível
    window.db = db;
    
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
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
    const tabsContainer = document.getElementById('finance-tabs');
    const viewTemplates = document.getElementById('financial-views');

    const views = [
        { id: 'dashboard', name: 'Dashboard', roles: ['admin', 'financeiro', 'rh'] },
        { id: 'gestao_profissionais', name: 'Gestão de Profissionais', roles: ['admin', 'financeiro', 'rh'] },
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

    function gerenciarPermissoesEConstruirTabs(funcoesUsuario = []) {
        if (!tabsContainer) return;
        tabsContainer.innerHTML = '';

        views.forEach(view => {
            const temPermissao = view.roles.length === 0 || view.roles.some(role => funcoesUsuario.includes(role.trim()));
            if (temPermissao) {
                const tabButton = document.createElement('button');
                tabButton.className = 'tab-link';
                tabButton.dataset.view = view.id;
                tabButton.textContent = view.name;
                tabButton.addEventListener('click', () => {
                    window.location.hash = view.id;
                });
                tabsContainer.appendChild(tabButton);
            }
        });
    }

    async function loadView(viewName) {
        const tabButtons = tabsContainer.querySelectorAll('.tab-link');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        try {
            contentArea.innerHTML = '<div class="loading-spinner"></div>';
            
            const template = viewTemplates.querySelector(`[data-view-id="${viewName}"]`);

            if (!template) {
                throw new Error(`Template não encontrado para a view: ${viewName}`);
            }
            contentArea.innerHTML = template.innerHTML;

            const oldScript = document.getElementById('dynamic-view-script');
            if (oldScript) oldScript.remove();
            
            const scriptPath = `../js/views/${viewName}.js`;
            
            try {
                const viewModule = await import(scriptPath);
                if (viewModule && typeof viewModule.init === 'function') {
                    viewModule.init(); // Inicializa o script da view
                }
            } catch (e) {
                // Se o script da view não for encontrado, não é um erro fatal.
                console.log(`Nenhum script de inicialização encontrado para a view '${viewName}'.`);
            }

        } catch (error) {
            console.error(`Erro ao carregar a view ${viewName}:`, error);
            contentArea.innerHTML = `<h2>Erro ao carregar o módulo '${viewName}'.</h2><p>${error.message}.</p>`;
        }
    }

    // --- PONTO DE PARTIDA PRINCIPAL ---
    
    const funcoes = userData.funcoes || [];
    gerenciarPermissoesEConstruirTabs(funcoes);

    const hash = window.location.hash.substring(1);
    const viewExists = views.some(v => v.id === hash);
    const hasPermissionForHash = viewExists && views.find(v => v.id === hash).roles.some(role => funcoes.includes(role.trim()));

    if (hash && viewExists && hasPermissionForHash) {
        loadView(hash);
    } else {
        const firstAvailableTab = tabsContainer.querySelector('.tab-link');
        if (firstAvailableTab) {
            // Define o hash para a primeira aba disponível para que a navegação funcione corretamente
            window.location.hash = firstAvailableTab.dataset.view; 
            // A chamada para loadView será feita pelo listener de hashchange
        } else {
            contentArea.innerHTML = '<h2>Você não tem permissão para acessar nenhuma seção.</h2>';
        }
    }

    // Listener de hashchange para navegar entre as abas
    window.addEventListener('hashchange', () => {
        const viewName = window.location.hash.substring(1) || (tabsContainer.querySelector('.tab-link')?.dataset.view || '');
        if(viewName) loadView(viewName);
    });
}