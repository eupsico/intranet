// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 2.5 (Puxando foto do perfil Google)

import { auth, db } from '../../../assets/js/firebase-init.js';

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection("usuarios").doc(user.uid).get();
            if (userDoc.exists) {
                initPortal(user, userDoc.data());
            } else {
                window.location.href = '../../../index.html';
            }
        } else {
            window.location.href = '../../../index.html';
        }
    });
});

function initPortal(user, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    const views = [
        { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
        { id: 'meu-perfil', name: 'Meu Perfil', icon: '👤' },
        { id: 'voluntarios', name: 'Voluntários', icon: '🧑‍🤝‍🧑' },
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄' },
        { id: 'recursos', name: 'Recursos do Voluntário', icon: '🛠️' },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬' },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥' },
    ];

    function buildSidebarMenu() {
        // (Esta função permanece inalterada)
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
        // (Esta função permanece inalterada)
        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });
        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch(`./${viewId}.html`);
            if (!response.ok) throw new Error(`View HTML not found: ${viewId}.html`);
            contentArea.innerHTML = await response.text();
            try {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = `../css/${viewId}.css`; 
                document.head.appendChild(cssLink);
                const viewModule = await import(`../js/${viewId}.js`);
                if (viewModule && typeof viewModule.init === 'function') {
                    viewModule.init(db, user, userData);
                }
            } catch (jsError) {
                console.log(`Nenhum módulo JS encontrado para a view '${viewId}'.`);
            }
        } catch (htmlError) {
            console.error(`Erro ao carregar a view ${viewId}:`, htmlError);
            contentArea.innerHTML = `<p style="color:red;">Erro ao carregar esta seção.</p>`;
        }
    }
    
    function setupLayout() {
        const userPhoto = document.getElementById('user-photo-header');
        const userGreeting = document.getElementById('user-greeting');
        const logoutButton = document.getElementById('logout-button-dashboard');

        if(userPhoto) {
            // --- ALTERAÇÃO APLICADA AQUI ---
            // Prioriza a foto da conta Google (user.photoURL).
            // Se não existir, usa a foto do banco de dados (userData.fotoUrl).
            // Se nenhuma existir, usa o avatar padrão.
            userPhoto.src = user.photoURL || (userData.fotoUrl ? `../../../${userData.fotoUrl}` : '../../../assets/img/avatar-padrao.png');
            userPhoto.onerror = () => { userPhoto.src = '../../../assets/img/avatar-padrao.png'; };
        }
        
        if(userGreeting && userData.nome) {
            const firstName = userData.nome.split(' ')[0];
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
            userGreeting.textContent = `${greeting}, ${firstName}!`;
        }
        
        if(logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut();
            });
        }
        
        // (O restante da função setupLayout continua igual)
        const layoutContainer = document.querySelector('.layout-container');
        const sidebar = document.querySelector('.sidebar');
        const toggleButton = document.getElementById('sidebar-toggle');
        const overlay = document.getElementById('menu-overlay');
        const sidebarMenu = document.getElementById('sidebar-menu');
        if (!layoutContainer || !toggleButton || !sidebar || !overlay || !sidebarMenu) { return; }
        const handleToggle = () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                sidebar.classList.toggle('is-visible');
                layoutContainer.classList.toggle('mobile-menu-open');
            } else {
                const currentlyCollapsed = layoutContainer.classList.toggle('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', currentlyCollapsed);
                toggleButton.setAttribute('title', currentlyCollapsed ? 'Expandir menu' : 'Recolher menu');
            }
        };
        if (window.innerWidth > 768) {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) { layoutContainer.classList.add('sidebar-collapsed'); }
            toggleButton.setAttribute('title', isCollapsed ? 'Expandir menu' : 'Recolher menu');
        }
        toggleButton.addEventListener('click', handleToggle);
        overlay.addEventListener('click', handleToggle);
        sidebarMenu.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (e.target.closest('a')) {
                    handleToggle();
                }
            }
        });
    }

    function start() {
        setupLayout();
        buildSidebarMenu();
        const handleHashChange = () => {
            const viewId = window.location.hash.substring(1) || views[0].id;
            loadView(viewId);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
    }

    start();
}