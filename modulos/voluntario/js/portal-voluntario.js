import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from "../../../assets/js/firebase-config.js";

// AQUI ESTÁ A MUDANÇA: Importa do novo arquivo 'utils.js'
import { loadHTML } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let user, userData;
let currentModule = null; // Rastreia o módulo atual

// Mapeamento de módulos para seus arquivos
const modules = {
    'dashboard': { html: 'dashboard.html', js: '../js/dashboard.js' },
    'meu-perfil': { html: 'meu-perfil.html', js: '../js/meu-perfil.js' },
    'supervisao': { html: 'supervisao.html', js: '../js/supervisao.js' },
    'painel-supervisor': { html: 'painel-supervisor.html', js: '../js/painel-supervisor.js' },
    'recursos': { html: 'recursos.html', js: '../js/recursos.js' },
    'solicitacoes': { html: 'solicitacoes.html', js: '../js/solicitacoes.js' },
    'gestao': { html: 'gestao.html', js: '../js/gestao.js' },
};

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error("Elemento #main-content não encontrado!");
        return;
    }

    onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            user = currentUser;
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                userData = userDocSnap.data();
                setupUI(userData);
                setupNavigation();

                // Carrega o módulo inicial com base no hash ou padrão
                const moduleName = window.location.hash.substring(1) || 'dashboard';
                loadModule(moduleName);
            } else {
                console.error("Dados do usuário não encontrados no Firestore.");
                window.location.href = '../../../index.html';
            }
        } else {
            window.location.href = '../../../index.html';
        }
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = '../../../index.html';
        });
    });
});

function setupUI(userData) {
    const userNameElement = document.getElementById('user-name');
    const userRoleElement = document.getElementById('user-role');
    const navLinks = document.querySelectorAll('.nav-link[data-role]');

    if (userNameElement) userNameElement.textContent = userData.nomeCompleto || 'Usuário';
    if (userRoleElement) userRoleElement.textContent = (userData.funcoes && userData.funcoes.length > 0) ? userData.funcoes.join(', ') : 'Voluntário';

    // Controle de visibilidade dos links de navegação
    const userRoles = userData.funcoes || [];
    navLinks.forEach(link => {
        const requiredRole = link.dataset.role;
        if (requiredRole && !userRoles.includes(requiredRole) && !userRoles.includes('admin')) {
            link.style.display = 'none';
        }
    });
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = link.getAttribute('href').substring(1);
            if (moduleName !== currentModule) {
                window.location.hash = moduleName; // Atualiza o hash na URL
            }
        });
    });

    // Ouve mudanças no hash para navegação (botão voltar/avançar do navegador)
    window.addEventListener('hashchange', () => {
        const moduleName = window.location.hash.substring(1) || 'dashboard';
        loadModule(moduleName);
    });
}

async function loadModule(moduleName) {
    const mainContent = document.getElementById('main-content');
    const moduleFiles = modules[moduleName];

    if (!moduleFiles) {
        console.error(`Módulo "${moduleName}" não encontrado.`);
        mainContent.innerHTML = `<h2>Módulo não encontrado</h2>`;
        return;
    }

    currentModule = moduleName;
    mainContent.innerHTML = '<div class="loading-spinner"></div>'; // Mostra o spinner

    // Atualiza o link ativo na navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${moduleName}`) {
            link.classList.add('active');
        }
    });

    try {
        const html = await loadHTML(moduleFiles.html); // Usa a função do utils.js
        mainContent.innerHTML = html;

        // Carrega e inicializa o script do módulo
        const module = await import(moduleFiles.js);
        if (module.init) {
            module.init(db, user, userData);
        }
    } catch (error) {
        console.error(`Erro ao carregar o módulo ${moduleName}:`, error);
        mainContent.innerHTML = `<h2>Ocorreu um erro ao carregar o módulo.</h2><p>Tente novamente mais tarde.</p>`;
    }
}

