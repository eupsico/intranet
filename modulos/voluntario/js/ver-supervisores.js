// Arquivo: /modulos/voluntario/js/ver-supervisores.js

export function init(db, user) {
    console.log("Módulo ver-supervisores.js inicializado pelo portal (padrão moderno).");

    const dashboardContent = document.getElementById('supervisor-dashboard-content');
    const supervisorCardsGrid = document.getElementById('supervisor-cards-grid');

    if (!dashboardContent || !supervisorCardsGrid) {
        console.error("Erro crítico: Elementos do HTML do painel do supervisor não foram encontrados.");
        return;
    }

    function renderSupervisorCards() {
        supervisorCardsGrid.innerHTML = '';
        
        const modules = {
            'view-meu-perfil': { 
                titulo: 'Meu Perfil e Edição', 
                descricao: 'Visualize e edite suas informações de perfil.' 
            },
            'view-meus-supervisionados': { 
                titulo: 'Meus Supervisionados', 
                descricao: 'Visualize os acompanhamentos que você supervisiona.' 
            }
        };

        for (const key in modules) {
            const module = modules[key];
            const card = document.createElement('div');
            card.className = 'module-card';
            card.dataset.view = key; 
            card.innerHTML = `<div class="card-content"><h3>${module.titulo}</h3><p>${module.descricao}</p></div>`;
            
            // Ao clicar, o hash da URL é atualizado, e o roteador principal
            // cuidará de carregar a nova página e seu respectivo script.
            card.addEventListener('click', () => {
                window.location.hash = `#${key}`;
            });
            
            supervisorCardsGrid.appendChild(card);
        }
    }

    // Busca as permissões do usuário e renderiza os cards
    db.collection('usuarios').doc(user.uid).get().then(userDoc => {
        if (userDoc.exists) {
            const funcoes = userDoc.data().funcoes || [];
            if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
                renderSupervisorCards();
            } else {
                dashboardContent.innerHTML = '<h2>Acesso Negado</h2><p>Você não tem permissão para acessar esta área.</p>';
            }
        }
    }).catch(error => {
        console.error("Erro ao verificar permissões:", error);
        dashboardContent.innerHTML = '<h2>Ocorreu um erro ao verificar suas permissões.</h2>';
    });
}