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

        // ===== CORREÇÃO DEFINITIVA DO CAMINHO =====
        // Caminhos relativos ao 'portal-voluntario.html' que está em 'page/'
        const fileMap = {
            'meu_perfil': { 
                html: './view-meu-perfil.html', // O './' indica o diretório atual ('page/')
                js: '../js/view-meu-perfil.js'  // O '../' sobe para 'voluntario/' e entra em 'js/'
            },
            'meus_supervisionados': { 
                html: './view-meus-supervisionados.html', 
                js: '../js/view-meus-supervisionados.js' 
            },
            'meus_agendamentos': { 
                html: './view-meus-agendamentos.html', 
                js: '../js/view-meus-agendamentos.js' 
            }
        };
        // ===========================================

        const files = fileMap[viewName];

        if (!files) {
            console.error(`View "${viewName}" não encontrada no fileMap.`);
            viewContentArea.innerHTML = `<h2>Erro: Módulo não encontrado.</h2><p>O arquivo para este módulo ainda não foi criado.</p><button onclick="showSupervisorDashboard()">Voltar</button>`;
            return;
        }

        try {
            const response = await fetch(files.html);
            if (!response.ok) throw new Error(`Falha ao carregar o arquivo: ${files.html}. Verifique se o arquivo existe no local correto.`);
            viewContentArea.innerHTML = await response.text();

            // O script da sub-tela é carregado dinamicamente pelo portal-voluntario.js
            // A tag <script> dentro do HTML carregado fará o trabalho.

        } catch (error) {
            console.error("Erro ao carregar sub-view do supervisor:", error);
            viewContentArea.innerHTML = `<h2>Erro ao carregar o módulo.</h2><p>${error.message}</p><button onclick="showSupervisorDashboard()">Voltar</button>`;
        }
    }

    function renderSupervisorCards() {
        supervisorCardsGrid.innerHTML = '';

        // Reativamos todos os módulos para construí-los
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
            card.innerHTML = `<div class="card-content"><h3>${module.titulo}</h3><p>${module.descricao}</p></div>`;
            card.addEventListener('click', () => loadSupervisorSubView(key));
            supervisorCardsGrid.appendChild(card);
        }
    }

    auth.onAuthStateChanged(async user => {
        if (user) {
            const userDoc = await db.collection('usuarios').doc(user.uid).get();
            if (userDoc.exists) {
                const funcoes = userDoc.data().funcoes || [];
                if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
                    renderSupervisorCards();
                } else {
                    dashboardContent.innerHTML = '<h2>Acesso Negado</h2>';
                }
            }
        }
    });
}