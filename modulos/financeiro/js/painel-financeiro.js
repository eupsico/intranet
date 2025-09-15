// assets/js/painel-financeiro.js
// Versão: 2.0
// Descrição: Refatorado para funcionar com o novo layout unificado e sistema de abas.

// A configuração do Firebase foi removida daqui.
// O script assume que o Firebase já foi inicializado pela página HTML.

(function() {
    // As instâncias de auth e db são obtidas do escopo global, inicializadas pelo firebase-init.js (ou pelo HTML)
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Disponibiliza para scripts de view que possam ser carregados dinamicamente
    window.auth = auth;
    window.db = db;
    
    window.showToast = function(message, type = 'success') {
        // ... (A função showToast permanece a mesma, sem alterações)
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

    // Definição das abas/views do módulo financeiro
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
        tabsContainer.innerHTML = ''; // Limpa o container de abas

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

    const initializePage = () => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Se não estiver logado, redireciona para a página principal, que cuidará do login.
                window.location.href = '../../../index.html';
                return;
            }
            try {
                const userDoc = await db.collection('usuarios').doc(user.uid).get();
                if (userDoc.exists) {
                    const funcoes = userDoc.data().funcoes || [];
                    
                    // Constrói as abas com base nas permissões
                    gerenciarPermissoesEConstruirTabs(funcoes);

                    // Lógica de Deep Linking (carregar a aba correta com base na URL)
                    const hash = window.location.hash.substring(1);
                    const viewExists = views.some(v => v.id === hash);
                    const hasPermissionForHash = viewExists && views.find(v => v.id === hash).roles.some(role => funcoes.includes(role.trim()));

                    if (hash && viewExists && hasPermissionForHash) {
                        loadView(hash);
                    } else {
                        // Carrega a primeira aba disponível como padrão
                        const firstAvailableTab = tabsContainer.querySelector('.tab-link');
                        if (firstAvailableTab) {
                            loadView(firstAvailableTab.dataset.view);
                        } else {
                            contentArea.innerHTML = '<h2>Você não tem permissão para acessar nenhuma seção.</h2>';
                        }
                    }
                } else {
                    contentArea.innerHTML = '<h2>Acesso Negado</h2><p>Seu usuário não foi encontrado no sistema.</p>';
                }
            } catch (error) {
                console.error("Erro ao buscar permissões do usuário:", error);
                contentArea.innerHTML = '<h2>Ocorreu um erro ao carregar o painel.</h2>';
            }
        });
    };
    
    // Ouve por mudanças no hash da URL para carregar a view correta
    window.addEventListener('hashchange', () => {
        const viewName = window.location.hash.substring(1) || 'dashboard'; // 'dashboard' como fallback
        loadView(viewName);
    });

    async function loadView(viewName) {
        // Marca a aba de navegação ativa
        const tabButtons = tabsContainer.querySelectorAll('.tab-link');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        try {
            contentArea.innerHTML = '<div class="loading-spinner"></div>';
            
            // Nova lógica: Busca o conteúdo do template dentro do próprio HTML
            const template = viewTemplates.querySelector(`[data-view-id="${viewName}"]`);

            if (!template) {
                throw new Error(`Template não encontrado para a view: ${viewName}`);
            }
            contentArea.innerHTML = template.innerHTML;

            // Carrega dinamicamente o JS específico da view, se existir
            const oldScript = document.getElementById('dynamic-view-script');
            if (oldScript) oldScript.remove();
            
            // Verifica se um script para a view existe antes de tentar carregar
            const scriptPath = `../js/views/${viewName}.js`;
            const scriptExists = await fetch(scriptPath, { method: 'HEAD' });
            if (scriptExists.ok) {
                const newScript = document.createElement('script');
                newScript.id = 'dynamic-view-script';
                newScript.src = scriptPath;
                newScript.type = 'module'; // Permite o uso de import/export nos scripts das views
                document.body.appendChild(newScript);
            }

        } catch (error) {
            console.error(`Erro ao carregar a view ${viewName}:`, error);
            contentArea.innerHTML = `<h2>Erro ao carregar o módulo '${viewName}'.</h2><p>${error.message}.</p>`;
        }
    }
    
    initializePage();
})();