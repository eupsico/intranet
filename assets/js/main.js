// assets/js/main.js

// Define as constantes do Firebase que serão usadas em todo o script
const auth = firebase.auth();
const db = firebase.firestore();

/**
 * Função principal que controla a autenticação e inicializa a página.
 * Ela roda imediatamente, sem esperar pelo 'DOMContentLoaded'.
 */
function pageController() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // --- USUÁRIO ESTÁ LOGADO ---
            try {
                const userDoc = await db.collection("usuarios").doc(user.uid).get();

                if (userDoc.exists && userDoc.data().funcoes?.length > 0) {
                    // Usuário válido e com permissões, inicializa a página
                    const userData = userDoc.data();
                    initializeApp(user, userData);
                } else {
                    // Usuário logado, mas sem permissões no Firestore
                    alert("Você não tem permissão para acessar esta área. Contate o administrador.");
                    auth.signOut(); // Desloga o usuário
                    // ✅ CORREÇÃO: Aponta para o caminho completo do projeto no GitHub Pages
                    window.location.href = '/intraneteupsico/index.html';
                }
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                alert("Ocorreu um erro ao verificar suas permissões.");
                auth.signOut();
                // ✅ CORREÇÃO: Aponta para o caminho completo do projeto no GitHub Pages
                window.location.href = '/intraneteupsico/index.html';
            }
        } else {
            // --- USUÁRIO ESTÁ DESLOGADO ---
            console.log("Nenhum usuário logado. Redirecionando para a página de login.");
            // ✅ CORREÇÃO: Aponta para o caminho completo do projeto no GitHub Pages
            window.location.href = '/intraneteupsico/index.html'; 
        }
    });
}

/**
 * Inicializa todos os componentes da página APÓS a confirmação do login.
 * @param {object} user - O objeto do usuário do Firebase Auth.
 * @param {object} userData - Os dados do usuário do Firestore.
 */
function initializeApp(user, userData) {
    // 1. Torna a página visível para o usuário
    document.body.classList.add('body-visible');

    // 2. Preenche as informações do usuário no cabeçalho
    populateHeader(user, userData);

    // 3. Ativa o botão de expandir/recolher o menu
    setupSidebarToggle();

    // 4. Inicia o timer de inatividade
    setupInactivityListeners();
}


/**
 * Preenche o cabeçalho com nome, foto e ativa o botão de logout.
 */
function populateHeader(user, userData) {
    const userPhoto = document.getElementById('user-photo-header');
    const userEmail = document.getElementById('user-email-header');
    const logoutButton = document.getElementById('logout-button-dashboard');

    if (userPhoto) userPhoto.src = user.photoURL || 'URL_PARA_FOTO_PADRAO_AQUI';
    if (userEmail) userEmail.textContent = userData.nome ? userData.nome.split(' ')[0] : user.email;
    
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut();
        });
    }
}

/**
 * Configura o botão que controla o menu lateral retrátil.
 */
function setupSidebarToggle() {
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const appContainer = document.getElementById('app');

    if (sidebarToggleBtn && appContainer) {
        sidebarToggleBtn.addEventListener('click', () => {
            appContainer.classList.toggle('sidebar-collapsed');
        });
    }
}

/**
 * Configura e inicia o timer de inatividade de 20 minutos.
 */
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("Você foi desconectado por inatividade.");
        auth.signOut();
    }, 20 * 60 * 1000); // 20 minutos
}
function setupInactivityListeners() {
    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => 
        window.addEventListener(event, resetInactivityTimer)
    );
    resetInactivityTimer();
}


// Inicia o controlador da página assim que o script é carregado
pageController();