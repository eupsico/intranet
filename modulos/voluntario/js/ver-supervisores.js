// A inicialização do Firebase foi removida, pois já é feita pelo portal-voluntario.html
// O código agora roda imediatamente ao ser carregado.
console.log("Script ver-supervisores.js carregado.");

// Garante que estamos pegando as instâncias corretas de auth e db.
const auth = firebase.auth();
const db = firebase.firestore();

// Seleciona os elementos que foram carregados pelo HTML (ver-supervisores.html)
const viewContentArea = document.getElementById('view-content-area');
const dashboardContent = document.getElementById('supervisor-dashboard-content');
const supervisorCardsGrid = document.getElementById('supervisor-cards-grid');

if (!viewContentArea || !dashboardContent || !supervisorCardsGrid) {
    console.error("Erro crítico: Elementos essenciais do HTML para o painel do supervisor não foram encontrados.");
} else {
    console.log("Elementos do painel do supervisor encontrados com sucesso.");
    // Função para voltar à tela de cards do painel do supervisor
    window.showSupervisorDashboard = function() {
        viewContentArea.style.display = 'none';
        viewContentArea.innerHTML = '';
        dashboardContent.style.display = 'block';
    };

    // Função para carregar uma nova "view" (sub-tela) dentro do container principal
    async function loadSupervisorSubView(viewName) {
        dashboardContent.style.display = 'none';
        viewContentArea.style.display = 'block';
        viewContentArea.innerHTML = '<div class="loading-spinner"></div>';

        // Mapeamento dos arquivos para cada sub-tela, com caminhos corrigidos
        const fileMap = {
            'meu_perfil': { html: 'page/view-meu-perfil.html', js: 'js/view-meu-perfil.js' },
            'meus_supervisionados': { html: 'page/view-meus-supervisionados.html', js: 'js/view-meus-supervisionados.js' },
            'meus_agendamentos': { html: 'page/view-meus-agendamentos.html', js: 'js/view-meus-agendamentos.js' }
        };
        const files = fileMap[viewName];

        if (!files) {
            console.error(`View "${viewName}" não encontrada.`);
            viewContentArea.innerHTML = `<h2>Erro: Módulo não encontrado.</h2><button onclick="showSupervisorDashboard()">Voltar</button>`;
            return;
        }

        try {
            // 1. Carrega o HTML da sub-tela
            const response = await fetch(files.html);
            if (!response.ok) throw new Error(`Falha ao carregar ${files.html}`);
            viewContentArea.innerHTML = await response.text();

            // 2. Adiciona um listener no botão "voltar" da sub-tela, se ele existir
            const backButton = document.getElementById('view-back-button');
            if (backButton) {
                backButton.addEventListener('click', window.showSupervisorDashboard);
            }

            // 3. Remove o script antigo (se houver) e carrega o novo JS da sub-tela
            const existingScript = document.querySelector(`script[data-view-script="${viewName}"]`);
            if (existingScript) existingScript.remove();
            
            const script = document.createElement('script');
            // O caminho aqui precisa ser relativo à pasta raiz dos módulos (voluntario/)
            script.src = `../${files.js}`; 
            script.dataset.viewScript = viewName;
            document.body.appendChild(script);

        } catch (error) {
            console.error("Erro ao carregar sub-view do supervisor:", error);
            viewContentArea.innerHTML = `<h2>Erro ao carregar.</h2><button onclick="showSupervisorDashboard()">Voltar</button>`;
        }
    }

    // Renderiza os cards de navegação do painel do supervisor
    function renderSupervisorCards() {
        console.log("Iniciando a renderização dos cards do supervisor.");
        supervisorCardsGrid.innerHTML = '';
        const modules = {
            meu_perfil: {
                titulo: 'Meu Perfil e Edição',
                descricao: 'Visualize e edite suas informações de perfil.'
            },
            meus_supervisionados: {
                titulo: 'Meus Supervisionados',
                descricao: 'Visualize os acompanhamentos que você supervisiona.'
            },
            meus_agendamentos: { 
                titulo: 'Meus Agendamentos', 
                descricao: 'Visualize os profissionais que agendaram supervisão com você.' 
            }
        };

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

    // Ponto de entrada: verifica a autenticação do usuário
    auth.onAuthStateChanged(async user => {
        if (user) {
            console.log("Usuário autenticado:", user.uid);
            try {
                const userDoc = await db.collection('usuarios').doc(user.uid).get();
                if (userDoc.exists) {
                    const funcoes = userDoc.data().funcoes || [];
                    console.log("Funções do usuário:", funcoes);
                    // Apenas permite o acesso se o usuário for supervisor ou admin
                    if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
                        console.log("Usuário é supervisor ou admin. Acesso permitido.");
                        renderSupervisorCards();
                    } else {
                        console.warn("Acesso negado. Usuário não é supervisor ou admin.");
                        dashboardContent.innerHTML = '<h2>Acesso Negado</h2><p>Você não tem permissão para acessar esta área.</p>';
                    }
                } else {
                    console.error("Documento do usuário não encontrado no Firestore.");
                    dashboardContent.innerHTML = '<h2>Usuário não encontrado.</h2>';
                }
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                dashboardContent.innerHTML = '<h2>Ocorreu um erro ao verificar suas permissões.</h2>';
            }
        } else {
            console.log("Nenhum usuário logado. Redirecionando para o login.");
            // Se não houver usuário logado, redireciona para a página de login
            window.location.href = '../../../index.html';
        }
    });
}