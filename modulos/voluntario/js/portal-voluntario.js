// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 3.2 (Corrigido o carregamento de CSS e a lógica de navegação)

import {
    auth,
    db,
    onAuthStateChanged,
    signOut,
    doc,
    getDoc,
    updateDoc
} from '../../../assets/js/firebase-init.js';

/**
 * Atualiza a foto do usuário no Firestore se for diferente da do provedor Google.
 * @param {object} user - Objeto do usuário autenticado do Firebase.
 * @param {object} userData - Dados do usuário do Firestore.
 */
async function updateUserPhotoOnLogin(user, userData) {
    const firestorePhotoUrl = userData.fotoUrl || '';
    const googlePhotoUrl = user.photoURL || '';
    if (googlePhotoUrl && firestorePhotoUrl !== googlePhotoUrl) {
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            await updateDoc(userDocRef, { fotoUrl: googlePhotoUrl });
            userData.fotoUrl = googlePhotoUrl; // Atualiza o objeto em memória
        } catch (error) {
            console.error("Erro ao atualizar a foto do usuário:", error);
        }
    }
}

/**
 * Ponto de entrada principal, verifica o estado da autenticação.
 */
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
                console.warn("Usuário autenticado mas sem registro no Firestore. Redirecionando.");
                window.location.href = '../../../index.html';
            }
        } else {
            window.location.href = '../../../index.html';
        }
    });
});

/**
 * Inicializa a funcionalidade completa do portal.
 * @param {object} user - Objeto do usuário autenticado.
 * @param {object} userData - Dados do usuário do Firestore.
 */
function initPortal(user, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    const views = [
        { id: 'view-dashboard-voluntario', name: 'Dashboard', icon: '🏠' },
        { id: 'meu-perfil', name: 'Meu Perfil', icon: '👤' },
        { id: 'voluntarios', name: 'Voluntários', icon: '🧑‍🤝‍🧑' },
        { id: 'supervisao', name: 'Supervisão', icon: '🎓' },
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄' },
        { id: 'recursos', name: 'Recursos', icon: '🛠️' },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬' },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥' },
    ];

    const funcoes = userData.funcoes || [];
    if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
        views.splice(4, 0, { id: 'ver-supervisores', name: 'Painel Supervisor', icon: '⭐' });
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
        if (!document.querySelector(`link[href="${cssPath}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            document.head.appendChild(link);
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
            
            // --- LÓGICA DE CARREGAMENTO DE CSS CORRIGIDA ---
            loadCSS(`../css/${viewId}.css`).catch(() => {}); // Tenta carregar o CSS do módulo
            
            if (viewId.includes('supervis')) {
                loadCSS(`../css/supervisao-geral.css`);
                // CORREÇÃO: Carrega o supervisores.css da pasta assets
                if (viewId === 'ver-supervisores' || viewId === 'view-meu-perfil') {
                    loadCSS(`../../../assets/css/supervisores.css`);
                }
            }
            if (viewId === 'recursos') {
                loadCSS('../css/recursos.css');
            }

            const viewModule = await import(`../js/${viewId}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData, param);
            }
        } catch (error) {
            if (!error.message.includes('Failed to fetch')) {
                console.error(`Erro ao carregar a view ${viewId}:`, error);
                contentArea.innerHTML = `<div class="view-container"><p class="alert alert-error">Erro Crítico: A página <strong>${viewId}.html</strong> não foi encontrada.</p></div>`;
            }
        }
    }
    
    function setupLayout() {
        const userPhoto = document.getElementById('user-photo-header');
        if (userPhoto) {
            userPhoto.src = user.photoURL || '../../../assets/img/avatar-padrao.png';
            userPhoto.onerror = () => { userPhoto.src = '../../../assets/img/avatar-padrao.png'; };
        }
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting && userData.nome) {
            const firstName = userData.nome.split(' ')[0];
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
            userGreeting.textContent = `${greeting}, ${firstName}!`;
        }
        const logoutButton = document.getElementById('logout-button-dashboard');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(auth);
            });
        }
    }

    function start() {
        setupLayout();
        buildSidebarMenu();
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            const defaultViewId = views.length > 0 ? views[0].id : null;
            const [viewId, param] = hash.split('/');
            loadView(viewId || defaultViewId, param);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
    }
    start();
}