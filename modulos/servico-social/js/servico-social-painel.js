import { auth, db } from '../../../assets/js/firebase-init.js';

// Função principal que é chamada pelo app.js quando o usuário acessa o painel
export function init(user, userData) {
    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    // Mapeamento das seções (abas) do painel
    const views = [
        { id: 'agendamentos-triagem', name: 'Agendamentos de Triagem' },
        { id: 'fila-atendimento', name: 'Fila de Atendimento' },
        { id: 'calculo-contribuicao', name: 'Cálculo de Contribuição' },
        { id: 'disponibilidade-assistente', name: 'Minha Disponibilidade' },
        { id: 'script-triagem', name: 'Script da Triagem' },
        { id: 'drive', name: 'Acesso ao Drive', url: 'https://drive.google.com/drive/folders/12345' } // Substituir pelo link real
    ];

    // Constrói o menu lateral
    function buildSidebarMenu() {
        if (!sidebarMenu) return;
        sidebarMenu.innerHTML = `
            <li>
                <a href="../../../index.html" class="back-link">
                    <span>&larr; Voltar à Intranet</span>
                </a>
            </li>
            <li class="menu-separator"></li>
        `;
        views.forEach(view => {
            const link = view.url ? `href="${view.url}" target="_blank"` : `href="#${view.id}" data-view="${view.id}"`;
            sidebarMenu.innerHTML += `<li><a ${link}><span>${view.name}</span></a></li>`;
        });
    }

    // Carrega o conteúdo de uma aba (HTML e o script JS correspondente)
    async function loadView(viewId) {
        sidebarMenu.querySelectorAll('a').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            const htmlResponse = await fetch(`../page/${viewId}.html`);
            if (!htmlResponse.ok) throw new Error(`Arquivo HTML não encontrado para a view: ${viewId}`);
            contentArea.innerHTML = await htmlResponse.text();

            // Carrega o módulo JS da view
            const viewModule = await import(`../js/${viewId}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData);
            }
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewId}:`, error);
            contentArea.innerHTML = `<p class="alert alert-error">Não foi possível carregar a seção. Verifique o console para mais detalhes.</p>`;
        }
    }

    // Ponto de partida do painel
    function start() {
        buildSidebarMenu();

        // Lida com a navegação por hash (links diretos para abas)
        const handleHashChange = () => {
            const viewId = window.location.hash.substring(1) || views[0].id;
            if (views.find(v => v.id === viewId && !v.url)) {
                loadView(viewId);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Carrega a view inicial
    }

    start();
}