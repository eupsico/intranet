// Arquivo: assets/js/app.js
// Versão: 1.9 (DEBUG)
// Descrição: Adiciona logs de diagnóstico para rastrear o carregamento dos módulos.

import { auth, db } from './firebase-init.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    let inactivityTimer;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            alert("Você foi desconectado por inatividade.");
            auth.signOut();
        }, 20 * 60 * 1000); 
    }

    function setupInactivityListeners() {
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('mousedown', resetInactivityTimer);
        window.addEventListener('keypress', resetInactivityTimer);
        window.addEventListener('scroll', resetInactivityTimer);
        window.addEventListener('touchstart', resetInactivityTimer);
        resetInactivityTimer();
    }

    function handleAuth() {
        auth.onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    const userDoc = await db.collection("usuarios").doc(user.uid).get();
                    if (userDoc.exists && userDoc.data().funcoes?.length > 0) {
                        const userData = userDoc.data();
                        await renderLayoutAndContent(user, userData);
                        setupInactivityListeners();
                    } else {
                        renderAccessDenied();
                    }
                } else {
                    renderLogin();
                }
            } catch (error) {
                console.error("Erro de autenticação:", error);
                renderLogin(`Ocorreu um erro: ${error.message}`);
                auth.signOut();
            }
        });
    }

    function renderLogin(message = "Por favor, faça login para continuar.") {
        if (!loginView || !dashboardView) return;
        dashboardView.style.display = 'none';
        loginView.style.display = 'block';
        loginView.innerHTML = `<div class="login-container"><div class="login-card"><img src="./assets/img/logo-eupsico.png" alt="Logo EuPsico" class="login-logo"><h2>Intranet EuPsico</h2><p>${message}</p><button id="login-button" class="login-button">Login com Google</button></div></div>`;
        document.getElementById('login-button').addEventListener('click', () => {
            loginView.innerHTML = `<p style="text-align:center; margin-top: 50px;">Aguarde...</p>`;
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(error => console.error(error));
        });
    }

    function renderAccessDenied() {
        if (!loginView || !dashboardView) return;
        dashboardView.style.display = 'none';
        loginView.style.display = 'block';
        loginView.innerHTML = `<div class="content-box" style="max-width: 800px; margin: 50px auto; text-align: center;"><h2>Acesso Negado</h2><p>Você está autenticado, mas seu usuário não tem permissões definidas. Contate o administrador.</p><button id="denied-logout">Sair</button></div>`;
        document.getElementById('denied-logout').addEventListener('click', () => auth.signOut());
    }
    
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Bom dia';
        if (hour >= 12 && hour < 18) return 'Boa tarde';
        return 'Boa noite';
    }

    async function renderLayoutAndContent(user, userData) {
        console.log('[DEBUG app.js] 1. Iniciando renderLayoutAndContent...');
        if (!loginView || !dashboardView) return;
        loginView.style.display = 'none';
        dashboardView.style.display = 'block';
        
        const userPhoto = document.getElementById('user-photo-header');
        const userGreeting = document.getElementById('user-greeting');
        const logoutButton = document.getElementById('logout-button-dashboard');
        
        if (userGreeting) { 
            const firstName = userData.nome ? userData.nome.split(' ')[0] : '';
            userGreeting.textContent = `${getGreeting()}, ${firstName}!`;
        }
        if (userPhoto) { 
            userPhoto.src = user.photoURL || 'https://www.eupsico.org.br/wp-content/uploads/2024/02/user-1.png';
            userPhoto.onerror = () => { userPhoto.src = './assets/img/avatar-padrao.png'; };
        }
        if (logoutButton) { logoutButton.addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); });}

        const modules = getVisibleModules(userData);
        setupSidebarToggle();
        console.log('[DEBUG app.js] 2. Layout global renderizado.');

        const path = window.location.pathname;
        console.log('[DEBUG app.js] 3. Path atual:', path);

        if (path.includes('administrativo-painel.html')) {
            console.log('[DEBUG app.js] 4. Condição para carregar painel administrativo ATENDIDA.');
            try {
                const adminModule = await import('../modulos/administrativo/js/administrativo-painel.js');
                console.log('[DEBUG app.js] 5. Módulo administrativo importado com SUCESSO.');
                adminModule.init(user, db, userData);
                console.log('[DEBUG app.js] 6. Função init() do módulo administrativo foi chamada.');
            } catch (error) {
                console.error('[DEBUG app.js] ERRO ao importar ou executar o módulo administrativo:', error);
            }
        } else if (path.includes('painel-financeiro.html')) {
            console.log('[DEBUG app.js] 4. Condição para carregar painel financeiro ATENDIDA.');
            const financeModule = await import('../modulos/financeiro/js/painel-financeiro.js');
            financeModule.initFinancePanel(user, db, userData);
        } else if (path.includes('portal-voluntario.html')) {
            console.log('[DEBUG app.js] 4. Condição para carregar portal do voluntário ATENDIDA.');
            const volunteerModule = await import('../modulos/voluntario/js/portal-voluntario.js');
            volunteerModule.init(user, db, userData);
        }
        else {
            console.log('[DEBUG app.js] 4. Renderizando página principal (index.html).');
            const pageTitleContainer = document.getElementById('page-title-container');
            if(pageTitleContainer) {
                pageTitleContainer.innerHTML = '';
            }
            renderSidebarMenu(modules);
            renderModuleCards(modules);
        }
    }
    
    function setupSidebarToggle() {
        const layoutContainer = document.querySelector('.layout-container');
        const sidebar = document.querySelector('.sidebar');
        const toggleButton = document.getElementById('sidebar-toggle');
        const overlay = document.getElementById('menu-overlay');
        if (!layoutContainer || !toggleButton || !sidebar || !overlay) { return; }
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
    }

    function renderSidebarMenu(modules) {
        const menu = document.getElementById('sidebar-menu');
        if (!menu) return;
        menu.innerHTML = '';
        modules.forEach(config => {
            const menuItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = config.url;
            link.innerHTML = `${config.icon || ''}<span>${config.titulo}</span>`;
            menuItem.appendChild(link);
            menu.appendChild(menuItem);
        });
    }

    function renderModuleCards(modules) {
        const navLinks = document.getElementById('nav-links');
        if (!navLinks) return;
        navLinks.innerHTML = '';
        modules.forEach(config => {
            const card = document.createElement('a');
            card.href = config.url;
            card.className = 'module-card';
            card.innerHTML = `<div class="card-icon">${config.icon || ''}<h3>${config.titulo}</h3></div><div class="card-content"><p>${config.descricao}</p></div>`;
            navLinks.appendChild(card);
        });
    }

    function getVisibleModules(userData) {
        const icons = {
            intranet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12c0-5.25-4.25-9.5-9.5-9.5S2.5 6.75 2.5 12s4.25 9.5 9.5 9.5s9.5-4.25 9.5-9.5Z"/><path d="M12 2.5v19"/><path d="M2.5 12h19"/></svg>`,
            administrativo: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
            financeiro: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
            // ... (outros ícones que você já tinha)
        };
        const areas = {
            portal_voluntario: { titulo: 'Portal do Voluntário', descricao: 'Avisos, notícias e informações importantes para todos os voluntários.', url: './modulos/voluntario/page/portal-voluntario.html', roles: ['todos'], icon: icons.intranet },
            administrativo: { titulo: 'Painel Administrativo', descricao: 'Gerencie a grade de horários e outras configurações do sistema.', url: './modulos/administrativo/page/administrativo-painel.html', roles: ['admin', 'gestor', 'assistente'], icon: icons.administrativo },
            financeiro: { titulo: 'Painel Financeiro', descricao: 'Acesse o fluxo de caixa, cobranças e relatórios.', url: './modulos/financeiro/page/painel-financeiro.html', roles: ['admin', 'financeiro'], icon: icons.financeiro },
            // ... (outros módulos que você já tinha)
        };
        const userFuncoes = (userData.funcoes || []).map(f => f.toLowerCase());
        let modulesToShow = [];
        for (const key in areas) {
            const area = areas[key];
            if (area) { // Checagem simples para evitar erros
                const rolesLowerCase = (area.roles || []).map(r => r.toLowerCase());
                let hasPermission = rolesLowerCase.includes('todos') || rolesLowerCase.some(role => userFuncoes.includes(role));
                if (hasPermission) {
                    modulesToShow.push(area);
                }
            }
        }
        modulesToShow.sort((a, b) => {
            if (a.titulo === 'Portal do Voluntário') return -1;
            if (b.titulo === 'Portal do Voluntário') return 1;
            return a.titulo.localeCompare(b.titulo);
        });
        return modulesToShow;
    }

    handleAuth();
});