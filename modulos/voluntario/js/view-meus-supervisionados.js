// A inicialização do Firebase já é feita pelo portal-voluntario.html
console.log("Script ver-supervisores.js carregado.");

const auth = firebase.auth();
const db = firebase.firestore();

const viewContentArea = document.getElementById('view-content-area');
const dashboardContent = document.getElementById('supervisor-dashboard-content');
const supervisorCardsGrid = document.getElementById('supervisor-cards-grid');

if (!viewContentArea || !dashboardContent || !supervisorCardsGrid) {
    console.error("Erro crítico: Elementos essenciais do HTML para o painel do supervisor não foram encontrados.");
} else {
    console.log("Elementos do painel do supervisor encontrados com sucesso.");

    window.showSupervisorDashboard = function() {
        viewContentArea.style.display = 'none';
        viewContentArea.innerHTML = '';
        dashboardContent.style.display = 'block';
    };

    async function loadSupervisorSubView(viewName) {
        dashboardContent.style.display = 'none';
        viewContentArea.style.display = 'block';
        viewContentArea.innerHTML = '<div class="loading-spinner"></div>';

        // ===== CORREÇÃO PRINCIPAL =====
        // Mapeamento de arquivos ajustado para os caminhos e arquivos corretos.
        const fileMap = {
            'meus_supervisionados': { 
                html: 'page/view-meus-supervisionados.html', 
                js: 'js/view-meus-supervisionados.js' 
            }
        };
        // ============================

        const files = fileMap[viewName];

        if (!files) {
            console.error(`View "${viewName}" não encontrada no fileMap.`);
            viewContentArea.innerHTML = `<h2>Erro: Módulo não encontrado.</h2><button onclick="showSupervisorDashboard()">Voltar</button>`;
            return;
        }

        try {
            // Carrega o HTML da sub-tela
            const response = await fetch(files.html);
            if (!response.ok) throw new Error(`Falha ao carregar o arquivo: ${files.html}`);
            viewContentArea.innerHTML = await response.text();

            const backButton = document.getElementById('view-back-button');
            if (backButton) {
                backButton.addEventListener('click', window.showSupervisorDashboard);
            }

            // Remove script antigo e carrega o novo
            const existingScript = document.querySelector(`script[data-view-script="${viewName}"]`);
            if (existingScript) existingScript.remove();
            
            const script = document.createElement('script');
            script.src = `../${files.js}`; // Caminho relativo a partir da pasta 'page'
            script.dataset.viewScript = viewName;
            document.body.appendChild(script);

        } catch (error) {
            console.error("Erro ao carregar sub-view do supervisor:", error);
            viewContentArea.innerHTML = `<h2>Erro ao carregar o módulo. Verifique o console para mais detalhes.</h2><button onclick="showSupervisorDashboard()">Voltar</button>`;
        }
    }

    // Renderiza apenas os cards de navegação que existem
    function renderSupervisorCards() {
        console.log("Iniciando a renderização dos cards do supervisor.");
        supervisorCardsGrid.innerHTML = '';

        // ===== CORREÇÃO PRINCIPAL =====
        // Apenas os módulos que têm páginas correspondentes estão listados aqui.
        const modules = {
            meus_supervisionados: {
                titulo: 'Meus Supervisionados',
                descricao: 'Visualize os acompanhamentos que você supervisiona.'
            }
        };
        // ============================

        for (const key in modules) {
            const module = modules[key];
            const card = document.createElement('div');
            card.className = 'module-card';
            card.dataset.view = key;
            card.innerHTML = `
                <div class="card-content">
                    <h3>${module.titulo}</h3>
                    <p>${module.descricao}</p>
                </div>`;
            card.addEventListener('click', () => loadSupervisorSubView(key));
            supervisorCardsGrid.appendChild(card);
        }
        console.log("Cards renderizados.");
    }

    // Ponto de entrada: verifica a autenticação e permissões do usuário
    auth.onAuthStateChanged(async user => {
        if (user) {
            try {
                const userDoc = await db.collection('usuarios').doc(user.uid).get();
                if (userDoc.exists) {
                    const funcoes = userDoc.data().funcoes || [];
                    if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
                        renderSupervisorCards();
                    } else {
                        dashboardContent.innerHTML = '<h2>Acesso Negado</h2><p>Você não tem permissão para acessar esta área.</p>';
                    }
                } else {
                    dashboardContent.innerHTML = '<h2>Usuário não encontrado.</h2>';
                }
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                dashboardContent.innerHTML = '<h2>Ocorreu um erro ao verificar suas permissões.</h2>';
            }
        } else {
            window.location.href = '../../../index.html';
        }
    });
}