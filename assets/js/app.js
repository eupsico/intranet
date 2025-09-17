// Arquivo: assets/js/app.js
// Versão: 2.1
// Descrição: Refatora a lógica de carregamento para ser compatível com múltiplas páginas de entrada (index e painéis).

import { auth, db } from './firebase-init.js';

document.addEventListener('DOMContentLoaded', function() {
    
    handleAuth();

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
                    const path = window.location.pathname;
                    const basePath = path.includes('/modulos/') ? '../../../' : './';
                    renderLogin("Por favor, faça login para continuar.", basePath);
                }
            } catch (error) {
                console.error("Erro de autenticação:", error);
                const path = window.location.pathname;
                const basePath = path.includes('/modulos/') ? '../../../' : './';
                renderLogin(`Ocorreu um erro: ${error.message}`, basePath);
                auth.signOut();
            }
        });
    }

    function renderLogin(message, basePath = './') {
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');
        if (!loginView || !dashboardView) return; 
        
        dashboardView.style.display = 'none';
        loginView.style.display = 'block';
        loginView.innerHTML = `<div class="login-container"><div class="login-card"><img src="${basePath}assets/img/logo-eupsico.png" alt="Logo EuPsico" class="login-logo"><h2>Intranet EuPsico</h2><p>${message}</p><button id="login-button" class="login-button">Login com Google</button></div></div>`;
        document.getElementById('login-button').addEventListener('click', () => {
            loginView.innerHTML = `<p style="text-align:center; margin-top: 50px;">Aguarde...</p>`;
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(error => console.error(error));
        });
    }

    function renderAccessDenied() {
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');
        if (!loginView || !dashboardView) {
            const basePath = window.location.pathname.includes('/modulos/') ? '../../../' : './';
            window.location.href = `${basePath}index.html`; 
            return;
        }
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
        const path = window.location.pathname;
        const basePath = path.includes('/modulos/') ? '../../../' : './';

        const userPhoto = document.getElementById('user-photo-header');
        const userGreeting = document.getElementById('user-greeting');
        const logoutButton = document.getElementById('logout-button-dashboard');
        
        if (userGreeting) { 
            const firstName = userData.nome ? userData.nome.split(' ')[0] : '';
            userGreeting.textContent = `${getGreeting()}, ${firstName}!`;
        }
        if (userPhoto) {
            userPhoto.src = user.photoURL || `${basePath}assets/img/avatar-padrao.png`;
            userPhoto.onerror = () => { userPhoto.src = `${basePath}assets/img/avatar-padrao.png`; };
        }
        if (logoutButton) { logoutButton.addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); });}

        const modules = getVisibleModules(userData, basePath);
        setupSidebarToggle();

        if (path.includes('administrativo-painel.html')) {
            const adminModule = await import('../modulos/administrativo/js/administrativo-painel.js');
            adminModule.init(user, db, userData);
        } else if (path.includes('painel-financeiro.html')) {
            const financeModule = await import('../modulos/financeiro/js/painel-financeiro.js');
            financeModule.initFinancePanel(user, db, userData);
        } else if (path.includes('portal-voluntario.html')) {
             const volunteerModule = await import('../modulos/voluntario/js/portal-voluntario.js');
             volunteerModule.init(user, db, userData);
        } else {
            const loginView = document.getElementById('login-view');
            const dashboardView = document.getElementById('dashboard-view');
            if(loginView) loginView.style.display = 'none';
            if(dashboardView) dashboardView.style.display = 'block';

            const pageTitleContainer = document.getElementById('page-title-container');
            if(pageTitleContainer) pageTitleContainer.innerHTML = '';
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

    function getVisibleModules(userData, basePath = './') {
        const icons = {
            intranet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12c0-5.25-4.25-9.5-9.5-9.5S2.5 6.75 2.5 12s4.25 9.5 9.5 9.5s9.5-4.25 9.5-9.5Z"/><path d="M12 2.5v19"/><path d="M2.5 12h19"/></svg>`,
            administrativo: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
            captacao: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
            financeiro: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
            grupos: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
            marketing: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
            plantao: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81 .7A2 2 0 0 1 22 16.92z"/></svg>`,
            rh: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
            servico_social: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
            supervisao: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
        };
        const areas = {
            portal_voluntario: { titulo: 'Portal do Voluntário', descricao: 'Avisos, notícias e informações importantes para todos os voluntários.', url: `${basePath}modulos/voluntario/page/portal-voluntario.html`, roles: ['todos'], icon: icons.intranet },
            administrativo: { titulo: 'Painel Administrativo', descricao: 'Gerencie a grade de horários e outras configurações do sistema.', url: `${basePath}modulos/administrativo/page/administrativo-painel.html`, roles: ['admin', 'gestor', 'assistente'], icon: icons.administrativo },
            captacao: { titulo: 'Captação', descricao: 'Somente os voluntários da captação tem acesso para acessar as ferramentas e informações para captação.', url: '#', roles: ['admin', 'captacao'], icon: icons.captacao },
            financeiro: { titulo: 'Painel Financeiro', descricao: 'Acesse o fluxo de caixa, cobranças e relatórios.', url: `${basePath}modulos/financeiro/page/painel-financeiro.html`, roles: ['admin', 'financeiro'], icon: icons.financeiro },
            grupos: { titulo: 'Grupos', descricao: 'Somente os voluntários de grupos tem acesso às informações e materiais para grupos.', url: '#', roles: ['admin', 'grupos'], icon: icons.grupos },
            marketing: { titulo: 'Marketing', descricao: 'Somente os voluntários do marketing tem acesso aos materiais de marketing e campanhas.', url: '#', roles: ['admin', 'marketing'], icon: icons.marketing },
            plantao: { titulo: 'Plantão', descricao: 'Somente os voluntários do plantão tem acesso às escalas, contatos e procedimentos.', url: '#', roles: ['admin', 'plantao'], icon: icons.plantao },
            rh: { titulo: 'Recursos Humanos', descricao: 'Somente os voluntários do RH tem acesso às informações sobre vagas e comunicados.', url: '#', roles: ['admin', 'rh'], icon: icons.rh },
            servico_social: { titulo: 'Serviço Social', descricao: 'Somente os voluntários do Serviço Social tem acesso aos documentos e orientações.', url: '#', roles: ['admin', 'servico_social'], icon: icons.servico_social },
            supervisores: { titulo: 'Painel do Supervisor', descricao: 'Acesse seu perfil, agendamentos e fichas de acompanhamentos.', url: `${basePath}pages/supervisores-painel.html`, roles: ['admin', 'supervisor'], icon: icons.rh },
            supervisao: { titulo: 'Intranet Supervisão', descricao: 'Acesse perfis de supervisores ou preencha e visualize suas fichas de acompanhamento.', url: `${basePath}pages/supervisao-painel.html`, roles: ['admin', 'atendimento','supervisor', 'psicologo', 'psicopedagoga', 'musicoterapeuta'], icon: icons.supervisao },
        };
        const userFuncoes = (userData.funcoes || []).map(f => f.toLowerCase());
        let modulesToShow = [];
        for (const key in areas) {
            const area = areas[key];
            const rolesLowerCase = (area.roles || []).map(r => r.toLowerCase());
            let hasPermission = false;
            if (userFuncoes.includes('admin') || rolesLowerCase.includes('todos')) { hasPermission = true; }
            else if (rolesLowerCase.some(role => userFuncoes.includes(role))) { hasPermission = true; }
            if (hasPermission) {
                modulesToShow.push(area);
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