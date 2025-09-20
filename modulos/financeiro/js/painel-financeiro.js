// Arquivo: /modulos/financeiro/js/painel-financeiro.js
// Versão: 3.0 (Modernizado para Firebase v9+ e ES6+)
// Descrição: Controlador principal do Painel Financeiro, com navegação baseada em hash.

// Importa as instâncias e funções necessárias do inicializador central do Firebase
import { db } from '../../../assets/js/firebase-init.js';

// Função de inicialização principal do módulo, chamada pelo app.js
export function init(user, userData) {

    // Função de utilidade para exibir notificações (toast)
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Estilos para o toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '5px',
            backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
            color: 'white',
            zIndex: '1050',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.4s ease'
        });

        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
    // Anexa a função de toast à janela para que os submódulos possam usá-la.
    window.showToast = showToast;

    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    // Mapeamento das views (páginas) disponíveis no painel financeiro
    const views = [
        { id: 'dashboard', name: 'Dashboard', roles: ['admin', 'financeiro', 'rh'] },
        { id: 'configuracoes', name: 'Configurações', roles: ['admin', 'financeiro'] },
        { id: 'resumo_horas', name: 'Resumo de Horas', roles: ['admin', 'financeiro'] },
        { id: 'cobranca_mensal', name: 'Cobrança Mensal', roles: ['admin', 'financeiro'] },
        { id: 'controle_pagamentos', name: 'Controle de Pagamentos', roles: ['admin', 'financeiro'] },
        { id: 'devedores', name: 'Devedores', roles: ['admin', 'financeiro'] },
        { id: 'acordos', name: 'Acordos', roles: ['admin', 'financeiro'] },
        { id: 'lancamentos', name: 'Lançamentos', roles: ['admin', 'financeiro'] },
        { id: 'repasse', name: 'Repasse Profissionais', roles: ['admin', 'financeiro'] },
        { id: 'relatorios', name: 'Relatórios e Backup', roles: ['admin', 'financeiro'] },
    ];

    /**
     * Constrói o menu lateral com base nas permissões do usuário.
     * @param {string[]} userRoles - As funções do usuário logado.
     */
    function buildFinanceSidebarMenu(userRoles = []) {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = ''; 

        // Adiciona o link para voltar à intranet principal
        sidebarMenu.innerHTML = `
            <li>
                <a href="../../../index.html" class="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    <span>Voltar à Intranet</span>
                </a>
            </li>
            <li class="menu-separator"></li>
        `;

        // Adiciona os links para cada view permitida
        views.forEach(view => {
            const hasPermission = view.roles.length === 0 || view.roles.some(role => userRoles.includes(role.trim()));
            if (hasPermission) {
                sidebarMenu.innerHTML += `
                    <li>
                        <a href="#${view.id}" data-view="${view.id}">
                            <span>${view.name}</span>
                        </a>
                    </li>`;
            }
        });
    }

    /**
     * Carrega dinamicamente o HTML e o JS de uma view específica.
     * @param {string} viewName - O ID da view a ser carregada.
     */
    async function loadView(viewName) {
        if (!viewName) {
            contentArea.innerHTML = '<h2>Selecione uma opção no menu.</h2>';
            return;
        }

        // Destaca o link ativo no menu
        sidebarMenu.querySelectorAll('a[data-view]').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        
        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            // Carrega o arquivo HTML da view
            const response = await fetch(`./${viewName}.html`);
            if (!response.ok) {
                throw new Error(`Arquivo da view não encontrado: ${viewName}.html`);
            }
            contentArea.innerHTML = await response.text();

            // Tenta carregar e inicializar o módulo JavaScript correspondente
            const scriptPath = `../js/${viewName}.js`;
            try {
                const viewModule = await import(scriptPath);
                if (viewModule && typeof viewModule.init === 'function') {
                    // Passa as instâncias do Firebase e os dados do usuário para o submódulo
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

    /**
     * Lida com a mudança de hash na URL para navegação.
     */
    function handleHashChange() {
        const viewName = window.location.hash.substring(1);
        loadView(viewName);
    }
    
    // Ponto de entrada da lógica do painel
    const userRoles = userData.funcoes || [];
    buildFinanceSidebarMenu(userRoles);

    // Adiciona o listener para a navegação via hash
    window.addEventListener('hashchange', handleHashChange);
    
    // Carrega a view inicial com base no hash ou a primeira disponível
    if (window.location.hash) {
        handleHashChange();
    } else {
        const firstAvailableLink = sidebarMenu.querySelector('a[data-view]');
        if (firstAvailableLink) {
            window.location.hash = firstAvailableLink.dataset.view;
        } else {
            contentArea.innerHTML = '<h2>Você não tem permissão para acessar nenhuma seção deste módulo.</h2>';
        }
    }
}