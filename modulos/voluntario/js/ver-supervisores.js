// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: CORRIGIDA E ROBUSTA - Não usa mais import()

// Espera o portal principal terminar de carregar para iniciar.
document.addEventListener('portalContentLoaded', () => {
    // Pega as informações de login que o portal disponibilizou
    const { db, user } = window.eupsico;

    console.log("Módulo ver-supervisores.js inicializado com sucesso.");

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
    });
});