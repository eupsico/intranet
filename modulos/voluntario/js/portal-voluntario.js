// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 3.0 (Modernizado para Firebase v9+ e ES6+)
// Descrição: Controlador principal do Portal do Voluntário, com navegação e carregamento de submódulos.

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
 * Atualiza a foto do usuário no Firestore se for diferente da foto do Google.
 * @param {object} user - O objeto do usuário autenticado do Firebase.
 * @param {object} userData - Os dados do usuário vindos do Firestore.
 */
async function updateUserPhotoOnLogin(user, userData) {
    const firestorePhotoUrl = userData.fotoUrl || '';
    const googlePhotoUrl = user.photoURL || '';
    if (googlePhotoUrl && firestorePhotoUrl !== googlePhotoUrl) {
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            await updateDoc(userDocRef, { fotoUrl: googlePhotoUrl });
            userData.fotoUrl = googlePhotoUrl; // Atualiza o objeto local também
        } catch (error) {
            console.error("Erro ao atualizar a foto do usuário:", error);
        }
    }
}

/**
 * Ponto de entrada que verifica a autenticação do usuário.
 */
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                await updateUserPhotoOnLogin(user, userData);
                initPortal(user, userData); // Inicia o portal
            } else {
                // Usuário autenticado mas sem registro no Firestore
                window.location.href = '../../../index.html';
            }
        } else {
            // Usuário não está logado
            window.location.href = '../../../index.html';
        }
    });
});

/**
 * Inicializa a funcionalidade completa do portal após a autenticação.
 * @param {object} user - O objeto do usuário autenticado do Firebase.
 * @param {object} userData - Os dados do usuário vindos do Firestore.
 */
function initPortal(user, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    // Mapeamento de todas as views disponíveis no portal
    const views = [
        { id: 'view-dashboard-voluntario', name: 'Dashboard', icon: '🏠' },
        { id: 'meu-perfil', name: 'Meu Perfil', icon: '👤' },
        { id: 'voluntarios', name: 'Voluntários', icon: '🧑‍🤝‍🧑' },
        { id: 'supervisao', name: 'Supervisão', icon: '🎓' },
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄' },
        { id: 'recursos', name: 'Recursos do Voluntário', icon: '🛠️' },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬' },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥' },
    ];

    // Adiciona o Painel Supervisor condicionalmente
    const funcoes = userData.funcoes || [];
    if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
        views.splice(4, 0, { id: 'ver-supervisores', name: 'Painel Supervisor', icon: '⭐' });
    }

    /**
     * Constrói o menu lateral com base nas views disponíveis.
     */
    function buildSidebarMenu() {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = `
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

    /**
     * Carrega uma view (página) dinamicamente na área de conteúdo.
     * @param {string} viewId - O ID da view a ser carregada.
     * @param {string|null} param - Um parâmetro opcional para a view.
     */
    async function loadView(viewId, param = null) {
        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch(`./${viewId}.html`);
            if (!response.ok) throw new Error(`Arquivo HTML não encontrado para a view: ${viewId}`);
            contentArea.innerHTML = await response.text();
            
            // Tenta carregar o módulo JS correspondente
            const viewModule = await import(`../js/${viewId}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData, param);
            }
        } catch (error) {
            // Trata erros de carregamento de HTML e JS
            if (error.message.includes('Failed to fetch dynamically imported module')) {
                console.log(`Nenhum módulo JS encontrado ou necessário para a view '${viewId}'.`);
            } else {
                console.error(`Erro ao carregar a view ${viewId}:`, error);
                contentArea.innerHTML = `<div class="view-container"><p class="alert alert-error">Erro Crítico: A página <strong>${viewId}.html</strong> não foi encontrada. Verifique se o arquivo existe na pasta 'page' e se o link no menu está correto.</p></div>`;
            }
        }
    }
    
    /**
     * Configura os elementos do layout principal (header, etc.).
     */
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

    /**
     * Inicia o portal, configurando layout, menu e navegação.
     */
    function start() {
        setupLayout();
        buildSidebarMenu();

        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            const defaultViewId = views.length > 0 ? views[0].id : null;
            
            if (!hash && defaultViewId) {
                loadView(defaultViewId);
                return;
            }
            
            const [viewId, param] = hash.split('/');
            loadView(viewId, param);
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Carrega a view inicial
    }

    start();
}