// Arquivo: /modulos/voluntario/js/portal-voluntario.js
// Versão: 4.2 (Corrige erro crítico de inicialização e mantém o histórico de navegação)
import {
    auth,
    db,
    onAuthStateChanged,
    signOut,
    doc,
    getDoc,
    updateDoc
} from '../../../assets/js/firebase-init.js';

// CORREÇÃO: A função que faltava foi restaurada aqui.
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
                await updateUserPhotoOnLogin(user, userData); // A chamada agora funcionará
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
    let viewHistory = [];

    const views = [
        { id: 'view-dashboard-voluntario', name: 'Dashboard', icon: '🏠' },
        { id: 'meu-perfil', name: 'Meu Perfil', icon: '👤' },
        { id: 'voluntarios', name: 'Voluntários', icon: '🧑‍🤝‍🧑' },
        { id: 'envio_comprovantes', name: 'Enviar Comprovante', icon: '📄' },
        { id: 'recursos', name: 'Recursos', icon: '🛠️' },
        { id: 'solicitacoes', name: 'Solicitações', icon: '📬' },
        { id: 'gestao', name: 'Nossa Gestão', icon: '👥' },
    ];
    
    const userRoles = userData.funcoes || [];
    const isSupervisor = userRoles.includes('supervisor') || userRoles.includes('admin');

    if (isSupervisor) {
        views.splice(3, 0, { id: 'painel-supervisor', name: 'Painel do Supervisor', icon: '⭐' });
    } else {
        views.splice(3, 0, { id: 'painel-supervisionado', name: 'Supervisão', icon: '🎓' });
    }

    views.push({ id: 'ficha-supervisao', name: 'Ficha de Supervisão' });
    
    window.viewNavigator = {
        push: (hash) => {
            viewHistory.push(window.location.hash || `#${views[0].id}`);
            window.location.hash = hash;
        },
        back: () => {
            const previousView = viewHistory.pop();
            if (previousView) {
                window.location.hash = previousView;
            } else {
                window.location.hash = isSupervisor ? '#painel-supervisor' : '#painel-supervisionado';
            }
        }
    };

    function buildSidebarMenu() {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = `
            <li><a href="../../../index.html" class="back-link"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg><span>Voltar à Intranet</span></a></li>
            <li class="menu-separator"></li>
        `;
        views.forEach(view => {
            if (view.icon) {
                sidebarMenu.innerHTML += `<li><a href="#${view.id}" data-view="${view.id}"><span class="icon">${view.icon}</span><span>${view.name}</span></a></li>`;
            }
        });
    }

    async function loadView(viewId, param = null) {
        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const htmlFile = viewId === 'ficha-supervisao' ? `./painel-supervisionado.html` : `./${viewId}.html`;
            const response = await fetch(htmlFile);
            if (!response.ok) throw new Error(`Arquivo HTML não encontrado: ${htmlFile}`);
            
            let htmlContent = await response.text();
            
            if (viewId === 'ficha-supervisao') {
                const formResponse = await fetch('./ficha-supervisao-completa.html');
                if (!formResponse.ok) throw new Error('Arquivo do formulário da ficha não encontrado.');
                const formHtml = await formResponse.text();
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                tempDiv.querySelector('.tabs-container').remove();
                tempDiv.querySelector('.tab-content').innerHTML = formHtml;
                tempDiv.querySelector('.tab-content').style.display = 'block';
                tempDiv.querySelector('.dashboard-section h1').textContent = 'Ficha de Acompanhamento';
                tempDiv.querySelector('.dashboard-section p').textContent = 'Preencha ou edite os dados da supervisão.';

                const backButton = document.createElement('button');
                backButton.innerHTML = '&larr; Voltar para Supervisão';
                backButton.className = 'btn btn-secondary';
                backButton.style.marginBottom = '20px';
                backButton.onclick = () => window.viewNavigator.back();
                tempDiv.querySelector('.dashboard-section').insertAdjacentElement('afterend', backButton);
                
                htmlContent = tempDiv.innerHTML;
            }

            contentArea.innerHTML = htmlContent;

            const cssPath = `../css/${viewId}.css`;
            const cssResponse = await fetch(cssPath);
            if (cssResponse.ok) {
                 const link = document.createElement('link');
                 link.rel = 'stylesheet';
                 link.href = cssPath;
                 link.id = `css-${viewId}`;
                 if (!document.getElementById(link.id)) {
                    document.head.appendChild(link);
                 }
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
            if (!hash) {
                window.location.hash = views[0].id;
                return;
            }
            const [viewId, param] = hash.split('/');
            
            if (!param && viewHistory[viewHistory.length - 1] !== `#${viewId}`) {
                viewHistory.push(`#${viewId}`);
            }

            loadView(viewId, param);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
    }
    start();
}