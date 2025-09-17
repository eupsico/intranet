// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 2.0
// Descrição: Refatorado para ser o controlador principal do portal do voluntário.

import { auth, db } from '../../../assets/js/firebase-init.js';

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection("usuarios").doc(user.uid).get();
            if (userDoc.exists) {
                initPortal(user, userDoc.data());
            } else {
                window.location.href = '../../../index.html'; // Redireciona se não encontrar dados
            }
        } else {
            window.location.href = '../../../index.html'; // Redireciona se não estiver logado
        }
    });
});

function initPortal(user, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    // Lista de todas as "páginas" (views) do portal
    const views = [
        { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄' },
        { id: 'recursos', name: 'Recursos do Voluntário', icon: '🛠️' },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬' },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥' },
    ];

    function buildSidebarMenu() {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = '';
        
        // Link para voltar à intranet principal
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
            sidebarMenu.innerHTML += `
                <li>
                    <a href="#${view.id}" data-view="${view.id}">
                        <span class="icon">${view.icon}</span>
                        <span>${view.name}</span>
                    </a>
                </li>`;
        });
    }

    async function loadView(viewId) {
        // Ativa o link correto no menu
        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            // Carrega o HTML da view
            const response = await fetch(`./${viewId}.html`);
            if (!response.ok) throw new Error(`View not found: ${viewId}`);
            contentArea.innerHTML = await response.text();

            // Carrega e inicializa o JavaScript da view
            const viewModule = await import(`../js/${viewId}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData, storage); // Passa 'storage' para o comprovante
            }
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewId}:`, error);
            contentArea.innerHTML = `<p style="color:red;">Erro ao carregar esta seção.</p>`;
        }
    }
    
    // --- Funções de Layout (Header, Sidebar Toggle) ---
    function setupLayout() {
        const userPhoto = document.getElementById('user-photo-header');
        const userGreeting = document.getElementById('user-greeting');
        const logoutButton = document.getElementById('logout-button-dashboard');

        if(userPhoto) {
            userPhoto.src = user.photoURL || '';
            userPhoto.onerror = () => { userPhoto.src = '../../../assets/img/avatar-padrao.png'; };
        }
        if(userGreeting && userData.nome) {
            userGreeting.textContent = `Olá, ${userData.nome.split(' ')[0]}!`;
        }
        if(logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut();
            });
        }
        
        // Lógica do sidebar toggle
        const toggleButton = document.getElementById('sidebar-toggle');
        const layoutContainer = document.querySelector('.layout-container');
        if (toggleButton && layoutContainer) {
            toggleButton.addEventListener('click', () => {
                layoutContainer.classList.toggle('sidebar-collapsed');
            });
        }
    }

    // --- Inicialização ---
    function start() {
        setupLayout();
        buildSidebarMenu();

        // Roteamento baseado em Hash
        const handleHashChange = () => {
            const viewId = window.location.hash.substring(1) || views[0].id; // Padrão para dashboard
            loadView(viewId);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Carrega a view inicial
    }

    start();
}