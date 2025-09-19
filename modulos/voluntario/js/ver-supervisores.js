// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: MODERNA - Com o card "Meu Perfil" reativado.

export function init(db, user) {
    console.log("Módulo ver-supervisores.js inicializado (Estilo Moderno).");

    const viewContentArea = document.getElementById('view-content-area');
    const dashboardContent = document.getElementById('supervisor-dashboard-content');
    const supervisorCardsGrid = document.getElementById('supervisor-cards-grid');

    if (!viewContentArea || !dashboardContent || !supervisorCardsGrid) {
        console.error("Erro crítico: Elementos essenciais do HTML para o painel do supervisor não foram encontrados.");
        return;
    }

    // Função global para permitir que as sub-telas voltem para este painel
    window.showSupervisorDashboard = function() {
        viewContentArea.style.display = 'none';
        viewContentArea.innerHTML = '';
        dashboardContent.style.display = 'block';
    };

    async function loadSupervisorSubView(viewName) {
        dashboardContent.style.display = 'none';
        viewContentArea.style.display = 'block';
        viewContentArea.innerHTML = '<div class="loading-spinner"></div>';
        
        const fileMap = {
            'meu_perfil': { html: './view-meu-perfil.html' },
            'meus_supervisionados': { html: './view-meus-supervisionados.html' },
            'meus_agendamentos': { html: './view-meus-agendamentos.html' }
        };

        const files = fileMap[viewName];
        if (!files) {
            viewContentArea.innerHTML = `<h2>Erro: Módulo '${viewName}' não foi encontrado.</h2><p>Verifique se o arquivo .html correspondente existe na pasta 'page'.</p><button onclick="showSupervisorDashboard()">Voltar</button>`;
            return;
        }

        try {
            const response = await fetch(files.html);
            if (!response.ok) throw new Error(`Arquivo não encontrado: ${files.html}`);
            contentArea.innerHTML = await response.text(); // Usa a contentArea global do portal
            
            // Tenta carregar o módulo JS correspondente
            const viewModule = await import(`../js/${viewName}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user); // Passa o db e user para o módulo da sub-view
            }

        } catch (error) {
            console.error(`Erro ao carregar a sub-view '${viewName}':`, error);
            viewContentArea.innerHTML = `<h2>Erro ao carregar o módulo.</h2><p>${error.message}</p><button onclick="showSupervisorDashboard()">Voltar</button>`;
        }
    }

    function renderSupervisorCards() {
        supervisorCardsGrid.innerHTML = '';
        
        // ===== AQUI ESTÁ A ALTERAÇÃO =====
        // O card 'meu_perfil' foi reativado.
        const modules = {
            meu_perfil: { 
                titulo: 'Meu Perfil e Edição', 
                descricao: 'Visualize e edite suas informações de perfil.' 
            },
            meus_supervisionados: { 
                titulo: 'Meus Supervisionados', 
                descricao: 'Visualize os acompanhamentos que você supervisiona.' 
            },
            // O módulo de agendamentos continua desativado por enquanto.
            // meus_agendamentos: { 
            //     titulo: 'Meus Agendamentos', 
            //     descricao: 'Visualize os profissionais que agendaram supervisão com você.' 
            // }
        };

        for (const key in modules) {
            const module = modules[key];
            const card = document.createElement('div');
            card.className = 'module-card';
            card.dataset.view = key;
            card.innerHTML = `<div class="card-content"><h3>${module.titulo}</h3><p>${module.descricao}</p></div>`;
            card.addEventListener('click', () => {
                 // Agora vamos usar o roteador principal para carregar a view
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