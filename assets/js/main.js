// assets/js/main.js

/**
 * Função principal que é executada assim que a página termina de carregar.
 */
function appInit() {
    console.log("App Inicializado.");

    // Lógica para controlar o menu lateral retrátil
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const appContainer = document.getElementById('app');

    if (sidebarToggleBtn && appContainer) {
        sidebarToggleBtn.addEventListener('click', () => {
            appContainer.classList.toggle('sidebar-collapsed');
        });
    }

    // Futuramente, adicionaremos aqui:
    // - A proteção de página (auth guard)
    // - O preenchimento dos dados do usuário no header
    // - A inicialização do timer de inatividade
}


// Garante que o script só rode depois que todo o HTML foi carregado
document.addEventListener('DOMContentLoaded', appInit);