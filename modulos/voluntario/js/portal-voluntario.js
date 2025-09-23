// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 3.1 (Caminho de carregamento de HTML corrigido)

import { auth, db } from '../../../assets/js/firebase-init.js';

async function updateUserPhotoOnLogin(user, userData) {
    const firestorePhotoUrl = userData.fotoUrl || '';
    const googlePhotoUrl = user.photoURL || '';
    if (googlePhotoUrl && firestorePhotoUrl !== googlePhotoUrl) {
        try {
            const userDocRef = db.collection("usuarios").doc(user.uid);
            await userDocRef.update({ fotoUrl: googlePhotoUrl });
            userData.fotoUrl = googlePhotoUrl; 
        } catch (error) {
            console.error("Erro ao atualizar a foto do usuário:", error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection("usuarios").doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                await updateUserPhotoOnLogin(user, userData);
                initPortal(user, userData);
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
        { id: 'supervisao', name: 'Supervisão', icon: '🎓' },
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄' },
        { id: 'recursos', name: 'Recursos do Voluntário', icon: '🛠️' },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬' },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥' },
    ];

    const funcoes = userData.funcoes || [];
    if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
        views.splice(4, 0, { id: 'painel-supervisor', name: 'Painel Supervisor', icon: '⭐' });
    }

    function buildSidebarMenu() {
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

    async function loadView(viewId, param = null) {
        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        
        // ===== AQUI ESTÁ A CORREÇÃO PRINCIPAL =====
        // O caminho do HTML agora é relativo à pasta 'page' onde a página principal está.
        const htmlPath = `./${viewId}.html`; 
        const jsPath = `../js/${viewId}.js`; // O JS é relativo à pasta 'page', sobe um nível para 'voluntario' e entra em 'js'
        const cssPath = `../css/${viewId}.css`; // O CSS segue a mesma lógica do JS

        try {
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Arquivo HTML não encontrado: ${htmlPath}`);
            contentArea.innerHTML = await response.text();
            
            const cssId = `css-${viewId}`;
            if (!document.getElementById(cssId)) {
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.href = cssPath;
                link.onerror = () => { console.log(`CSS para a view '${viewId}' não encontrado. Ignorando.`); link.remove(); };
                document.head.appendChild(link);
            }
            
            const viewModule = await import(jsPath);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData, param);
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch dynamically imported module')) {
                console.log(`Nenhum módulo JS encontrado ou necessário para a view '${viewId}'.`);
            } else if (error.message.includes('HTML não encontrado')) {
                console.error(`Erro ao carregar a view ${viewId}:`, error);
                contentArea.innerHTML = `<div class="view-container"><p class="alert alert-error">Erro Crítico: A página <strong>${viewId}.html</strong> não foi encontrada na pasta 'page'.</p></div>`;
            } else {
                console.error(`Ocorreu um erro inesperado ao carregar a view '${viewId}':`, error);
                contentArea.innerHTML = `<div class="view-container"><p class="alert alert-error">Ocorreu um erro inesperado.</p></div>`;
            }
        }
    }
    
    function setupLayout() {
        // ... (seu código de setupLayout original, sem alterações)
        const userPhoto = document.getElementById('user-photo-header');
        if(userPhoto) {
            userPhoto.src = user.photoURL || '../../../assets/img/avatar-padrao.png';
            userPhoto.onerror = () => { userPhoto.src = '../../../assets/img/avatar-padrao.png'; };
        }
        const userGreeting = document.getElementById('user-greeting');
        if(userGreeting && userData.nome) {
            const firstName = userData.nome.split(' ')[0];
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
            userGreeting.textContent = `${greeting}, ${firstName}!`;
        }
        const logoutButton = document.getElementById('logout-button-dashboard');
        if(logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut();
            });
        }
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
            const hash = window.location.hash.substring(1);
            if (!hash) {
                loadView(views[0].id);
                return;
            }
            const [viewId, param] = hash.split('/');
            loadView(viewId, param);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
    }

    start();
}