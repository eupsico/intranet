// assets/js/painel-financeiro.js
// Versão: 2.2
// Descrição: Refatorado para ser um módulo especialista, sem controle de autenticação próprio.

// A configuração e inicialização do Firebase são removidas.
// O script agora espera receber as instâncias de user, db, e userData.

export function initFinancePanel(user, db, userData) {
    
    // Disponibiliza db para scripts de view que possam ser carregados dinamicamente
    window.db = db;
    
    // Função de Toast (notificação)
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        // Estilos e timeouts para o toast...
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

    function buildTabs(userRoles = []) {
        if (!tabsContainer) return;
        tabsContainer.innerHTML = '';

        views.forEach(view => {
            const hasPermission = view.roles.length === 0 || view.roles.some(role => userRoles.includes(role.trim()));
            if (hasPermission) {
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
                    viewModule.init(db, user, userData); // Passa as instâncias para o script da view
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
    buildTabs(userRoles);

    const hash = window.location.hash.substring(1);
    const viewExists = views.some(v => v.id === hash);
    const hasPermissionForHash = viewExists && views.find(v => v.id === hash).roles.some(role => userRoles.includes(role.trim()));

    if (hash && viewExists && hasPermissionForHash) {
        loadView(hash);
    } else {
        const firstAvailableTab = tabsContainer.querySelector('.tab-link');
        if (firstAvailableTab) {
            window.location.hash = firstAvailableTab.dataset.view;
        } else {
            contentArea.innerHTML = '<h2>Você não tem permissão para acessar nenhuma seção deste módulo.</h2>';
        }
    }

    // Adiciona o listener para navegação entre abas via hash
    window.addEventListener('hashchange', () => {
        const viewName = window.location.hash.substring(1);
        const firstTab = tabsContainer.querySelector('.tab-link')?.dataset.view || '';
        if (viewName) {
            loadView(viewName);
        } else if (firstTab) {
            loadView(firstTab);
        }
    }, { once: true }); // Executa o listener apenas uma vez para evitar múltiplos registros
}