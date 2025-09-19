// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: MODERNA - Com IDs dos cards corrigidos para corresponder aos nomes dos arquivos.

export function init(db, user) {
    console.log("Módulo ver-supervisores.js inicializado.");

    const dashboardContent = document.getElementById('supervisor-dashboard-content');
    const supervisorCardsGrid = document.getElementById('supervisor-cards-grid');

    if (!dashboardContent || !supervisorCardsGrid) {
        console.error("Erro crítico: Elementos essenciais do HTML para o painel do supervisor não foram encontrados.");
        return;
    }

    function renderSupervisorCards() {
        supervisorCardsGrid.innerHTML = '';
        
        // ===== AQUI ESTÁ A CORREÇÃO PRINCIPAL =====
        // Os IDs (chaves) foram alterados para corresponder EXATAMENTE
        // aos nomes dos arquivos .html que o roteador principal irá procurar.
        const modules = {
            'view-meu-perfil': { 
                titulo: 'Meu Perfil e Edição', 
                descricao: 'Visualize e edite suas informações de perfil.' 
            },
            'view-meus-supervisionados': { 
                titulo: 'Meus Supervisionados', 
                descricao: 'Visualize os acompanhamentos que você supervisiona.' 
            },
            // O módulo de agendamentos continua desativado.
            // 'view-meus-agendamentos': { 
            //     titulo: 'Meus Agendamentos', 
            //     descricao: 'Visualize os agendamentos com você.' 
            // }
        };

        for (const key in modules) {
            const module = modules[key];
            const card = document.createElement('div');
            card.className = 'module-card';
            
            // O dataset.view agora terá o nome correto (ex: 'view-meu-perfil')
            card.dataset.view = key; 
            
            card.innerHTML = `<div class="card-content"><h3>${module.titulo}</h3><p>${module.descricao}</p></div>`;
            
            // Ao clicar, o hash da URL é atualizado para o ID correto.
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