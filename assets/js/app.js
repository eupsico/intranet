// Arquivo: assets/js/app.js
// Versão: 2.2 (DIAGNÓSTICO FUNCIONAL)
// Descrição: Restaura a funcionalidade de login e mantém os logs para depuração do carregamento de módulos.

import { auth, db } from './firebase-init.js';

document.addEventListener('DOMContentLoaded', function() {
    
    // As funções não precisam mais ser aninhadas dentro do listener DOMContentLoaded
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
                    console.log('[TESTE] Usuário autenticado. Tentando renderizar o layout.');
                    const userDoc = await db.collection("usuarios").doc(user.uid).get();
                    if (userDoc.exists && userDoc.data().funcoes?.length > 0) {
                        const userData = userDoc.data();
                        await renderLayoutAndContent(user, userData);
                        setupInactivityListeners();
                    } else {
                        renderAccessDenied();
                    }
                } else {
                    console.log('[TESTE] Usuário não autenticado. Renderizando tela de login.');
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
        console.log('[TESTE] Iniciando renderLayoutAndContent.');
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

        console.log('[TESTE] Path detectado:', path);
        try {
            if (path.includes('administrativo-painel.html')) {
                console.log('[TESTE] Tentando carregar o módulo ADMINISTRATIVO...');
                const adminModule = await import('../modulos/administrativo/js/administrativo-painel.js');
                console.log('[TESTE] Módulo ADMINISTRATIVO importado com sucesso.');
                adminModule.init(user, db, userData);
                console.log('[TESTE] Módulo ADMINISTRATIVO inicializado.');

            } else if (path.includes('painel-financeiro.html')) {
                console.log('[TESTE] Tentando carregar o módulo FINANCEIRO...');
                const financeModule = await import('../modulos/financeiro/js/painel-financeiro.js');
                console.log('[TESTE] Módulo FINANCEIRO importado com sucesso.');
                financeModule.initFinancePanel(user, db, userData);
                console.log('[TESTE] Módulo FINANCEIRO inicializado.');

            } else if (path.includes('portal-voluntario.html')) {
                console.log('[TESTE] Tentando carregar o módulo VOLUNTÁRIO...');
                const volunteerModule = await import('../modulos/voluntario/js/portal-voluntario.js');
                console.log('[TESTE] Módulo VOLUNTÁRIO importado com sucesso.');
                volunteerModule.init(user, db, userData);
                console.log('[TESTE] Módulo VOLUNTÁRIO inicializado.');

            } else {
                console.log('[TESTE] Nenhum módulo corresponde ao path. Renderizando index.html.');
                const loginView = document.getElementById('login-view');
                const dashboardView = document.getElementById('dashboard-view');
                if(loginView) loginView.style.display = 'none';
                if(dashboardView) dashboardView.style.display = 'block';

                const pageTitleContainer = document.getElementById('page-title-container');
                if(pageTitleContainer) pageTitleContainer.innerHTML = '';
                renderSidebarMenu(modules);
                renderModuleCards(modules);
            }
        } catch (error) {
            console.error('[TESTE] ERRO CRÍTICO DURANTE O CARREGAMENTO DO MÓDULO:', error);
        }
    }
    
    function setupSidebarToggle() {
        // (código interno da função sem alterações)
    }

    function renderSidebarMenu(modules) {
        // (código interno da função sem alterações)
    }

    function renderModuleCards(modules) {
        // (código interno da função sem alterações)
    }

    function getVisibleModules(userData, basePath = './') {
        // (código interno da função sem alterações)
    }
});