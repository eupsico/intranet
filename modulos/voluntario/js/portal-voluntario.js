// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 4.0 (Estrutura de painéis separados)
import {
    auth,
    db,
    onAuthStateChanged,
    signOut,
    doc,
    getDoc,
    updateDoc
} from '../../../assets/js/firebase-init.js';

async function updateUserPhotoOnLogin(user, userData) {
    const firestorePhotoUrl = userData.fotoUrl || '';
    const googlePhotoUrl = user.photoURL || '';
    if (googlePhotoUrl && firestorePhotoUrl !== googlePhotoUrl) {
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            await updateDoc(userDocRef, { fotoUrl: googlePhotoUrl });
            userData.fotoUrl = googlePhotoUrl;
        } catch (error) {
            console.error("Erro ao atualizar a foto do usuário:", error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
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
    const loadedCSS = new Set();

    const views = [
        { id: 'view-dashboard-voluntario', name: 'Dashboard', icon: '🏠' },
        { id: 'meu-perfil', name: 'Meu Perfil', icon: '👤' },
        { id: 'voluntarios', name: 'Voluntários', icon: '🧑‍🤝‍🧑' },
        // O link de Supervisão será inserido aqui
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄' },
        { id: 'recursos', name: 'Recursos', icon: '🛠️' },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬' },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥' },
    ];

    // **NOVA LÓGICA DE MENU SEPARADO**
    const userRoles = userData.funcoes || [];
    const isSupervisor = userRoles.includes('supervisor') || userRoles.includes('admin');

    if (isSupervisor) {
        views.splice(3, 0, { id: 'painel-supervisor', name: 'Painel do Supervisor', icon: '⭐' });
    } else {
        views.splice(3, 0, { id: 'painel-supervisionado', name: 'Supervisão', icon: '🎓' });
    }

    function buildSidebarMenu() {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = `
            <li><a href="../../../index.html" class="back-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg><span>Voltar à Intranet</span></a></li>
            <li class="menu-separator"></li>
        `;
        views.forEach(view => {
            sidebarMenu.innerHTML += `<li><a href="#${view.id}" data-view="${view.id}"><span class="icon">${view.icon}</span><span>${view.name}</span></a></li>`;
        });
    }

    function loadCSS(cssPath) {
        if (!loadedCSS.has(cssPath)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            document.head.appendChild(link);
            loadedCSS.add(cssPath);
        }
    }

    async function loadView(viewId, param = null) {
        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch(`./${viewId}.html`);
            if (!response.ok) throw new Error(`Arquivo HTML não encontrado: ${viewId}.html`);
            contentArea.innerHTML = await response.text();
            
            const cssPath = `../css/${viewId}.css`;
            const cssResponse = await fetch(cssPath);
            if (cssResponse.ok) {
                loadCSS(cssPath);
            }

            const viewModule = await import(`../js/${viewId}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData, param);
            }
        } catch (error) {
            if (!error.message.includes('Failed to fetch dynamically imported module')) {
                console.error(`Erro ao carregar a view ${viewId}:`, error);
                contentArea.innerHTML = `<div class="dashboard-section"><p style="color: var(--cor-erro);">Erro Crítico: A página <strong>${viewId}</strong> não pôde ser carregada.</p></div>`;
            }
        }
    }
    
    function setupLayout() {
        const userPhoto = document.getElementById('user-photo-header');
        if (userPhoto) {
            userPhoto.src = userData.fotoUrl || '../../../assets/img/avatar-padrao.png';
            userPhoto.onerror = () => { userPhoto.src = '../../../assets/img/avatar-padrao.png'; };
        }
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting && userData.nome) {
            const firstName = userData.nome.split(' ')[0];
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
            userGreeting.textContent = `${greeting}, ${firstName}!`;
        }
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(auth).catch(error => console.error("Erro ao fazer logout:", error));
            });
        }
    }

    function start() {
        setupLayout();
        buildSidebarMenu();
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            const defaultViewId = views[0].id;
            const [viewId, param] = hash.split('/');
            loadView(viewId || defaultViewId, param);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
    }
    start();
}