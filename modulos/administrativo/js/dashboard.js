// Arquivo: /modulos/administrativo/js/dashboard.js
// Versão: 1.0
// Descrição: Renderiza os cards dos módulos disponíveis no painel administrativo.

export function init(db, user, userData) {
    const adminModulesGrid = document.getElementById('admin-modules-grid');
    if (!adminModulesGrid) return;

    // Definição dos módulos disponíveis no painel administrativo
    const adminModules = {
        grade: {
            titulo: 'Grade de Horários',
            descricao: 'Visualize e edite os horários dos profissionais para os atendimentos online e presenciais.',
            roles: ['admin', 'gestor', 'assistente'],
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
        },
        // Outros módulos administrativos podem ser adicionados aqui no futuro
    };

    const userRoles = userData.funcoes || [];
    let cardsHtml = '';

    // Itera sobre os módulos e verifica se o usuário tem permissão para vê-los
    for (const key in adminModules) {
        const module = adminModules[key];
        const hasPermission = module.roles.some(role => userRoles.includes(role));

        if (hasPermission) {
            cardsHtml += `
                <a href="#${key}" class="module-card" data-view="${key}">
                    <div class="card-icon">${module.icon}</div>
                    <div class="card-content">
                        <h3>${module.titulo}</h3>
                        <p>${module.descricao}</p>
                    </div>
                </a>
            `;
        }
    }

    if (cardsHtml === '') {
        adminModulesGrid.innerHTML = '<p>Nenhum módulo administrativo disponível para o seu perfil.</p>';
    } else {
        adminModulesGrid.innerHTML = cardsHtml;
    }
}