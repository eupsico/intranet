// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 7.0 (Roteamento por filtro e correção de bugs)
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
                alert("Seus dados de usuário não foram encontrados. Contate o suporte.");
                signOut(auth);
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

    // Define TODAS as views possíveis
    const allViews = [
        { id: 'view-dashboard-voluntario', name: 'Dashboard', icon: '🏠', roles: ['all'] },
        { id: 'meu-perfil', name: 'Meu Perfil', icon: '👤', roles: ['all'] },
        { id: 'voluntarios', name: 'Voluntários', icon: '🧑‍🤝‍🧑', roles: ['all'] },
        { id: 'painel-supervisionado', name: 'Supervisão', icon: '🎓', roles: ['atendimento'] },
        { id: 'painel-supervisor', name: 'Painel do Supervisor', icon: '⭐', roles: ['supervisor', 'admin'] },
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄', roles: ['all'] },
        { id: 'recursos', name: 'Recursos', icon: '🛠️', roles: ['all'] },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬', roles: ['all'] },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥', roles: ['all'] },
    ];
    
    // Filtra as views com base nas funções do usuário
    const userRoles = userData.funcoes || [];
    const isSupervisor = userRoles.includes('supervisor') || userRoles.includes('admin');
    const isAtendimento = userRoles.includes('atendimento');

    const visibleViews = allViews.filter(view => {
        if (view.roles.includes('all')) return true;
        if (isSupervisor && view.roles.includes('supervisor')) return true;
        if (isAtendimento && !isSupervisor && view.roles.includes('atendimento')) return true;
        // Adicione outras regras se necessário
        return false;
    });


    function buildSidebarMenu() {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = `
            <li><a href="../../../index.html" class="back-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg><span>Voltar à Intranet</span></a></li>
            <li class="menu-separator"></li>
        `;
        visibleViews.forEach(view => {
            sidebarMenu.innerHTML += `<li><a href="#${view.id}" data-view="${view.id}"><span class="icon">${view.icon}</span><span>${view.name}</span></a></li>`;
        });
    }

    async function loadView(viewId, param = null) {
        if (!viewId) viewId = visibleViews[0]?.id; // Pega a primeira view visível como padrão
        if (!viewId) {
            contentArea.innerHTML = '<h2>Nenhuma seção disponível.</h2>';
            return;
        }

        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch(`./${viewId}.html`);
            if (!response.ok) throw new Error(`Arquivo HTML não encontrado: ${viewId}.html`);
            
            contentArea.innerHTML = await response.text();
            
            // Tenta carregar o módulo JS correspondente
            // Adicionado bloco try/catch para módulos sem JS
            try {
                const viewModule = await import(`../js/${viewId}.js`);
                if (viewModule && typeof viewModule.init === 'function') {
                    viewModule.init(db, user, userData, param);
                }
            } catch (jsError) {
                 if (jsError.name !== 'TypeError') { // Ignora erro "Failed to fetch" se o JS não existir
                    console.warn(`Módulo JS para a view '${viewId}' não encontrado ou falhou ao carregar.`, jsError);
                }
            }
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewId}:`, error);
            contentArea.innerHTML = `<div class="dashboard-section"><p style="color: var(--cor-erro);">Erro Crítico: A página <strong>${viewId}</strong> não pôde ser carregada.</p></div>`;
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
        
        const layoutContainer = document.querySelector('.layout-container');
        const sidebar = document.querySelector('.sidebar');
        const toggleButton = document.getElementById('sidebar-toggle');
        const overlay = document.getElementById('menu-overlay');

        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                 if (window.innerWidth <= 768) {
                    sidebar.classList.toggle('is-visible');
                    layoutContainer.classList.toggle('mobile-menu-open');
                } else {
                    layoutContainer.classList.toggle('sidebar-collapsed');
                }
            });
        }
        if(overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('is-visible');
                layoutContainer.classList.remove('mobile-menu-open');
            });
        }
    }

    function start() {
        setupLayout();
        buildSidebarMenu();
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            const [viewId, param] = hash.split('/');
            loadView(viewId || visibleViews[0]?.id, param);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Carga inicial
    }
    start();
}