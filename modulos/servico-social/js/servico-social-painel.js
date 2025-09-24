// Arquivo: /modulos/servico-social/js/servico-social-painel.js
// Versão: 2.0 (Refatorado para alinhar com a arquitetura padrão da intranet)

export function init(user, db, userData) {
    console.log("✔️ [DEBUG] Módulo Serviço Social iniciado.");

    const contentArea = document.getElementById('content-area');
    const sidebarMenu = document.getElementById('sidebar-menu');

    // Mapeamento das seções (abas) do painel
    const views = [
        { id: 'agendamentos-triagem', name: 'Agendamentos de Triagem' },
        { id: 'fila-atendimento', name: 'Fila de Atendimento' },
        { id: 'calculo-contribuicao', name: 'Cálculo de Contribuição' },
        { id: 'disponibilidade-assistente', name: 'Minha Disponibilidade' },
        { id: 'script-triagem', name: 'Script da Triagem' },
        { id: 'drive', name: 'Acesso ao Drive', url: 'https://link.do.seu.drive.aqui', isExternal: true }
    ];

    // ATENÇÃO: A função buildSidebarMenu foi removida. O app.js agora é responsável por isso.

    // Carrega o conteúdo de uma aba (HTML e o script JS correspondente)
    async function loadView(viewId) {
        // A lógica de atualizar a aba ativa no menu lateral já é feita pelo app.js
        // Aqui, focamos apenas em carregar o conteúdo na área principal.
        
        contentArea.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            // Carrega o HTML da aba
            const htmlResponse = await fetch(`../page/${viewId}.html`);
            if (!htmlResponse.ok) throw new Error(`Arquivo HTML não encontrado: ${viewId}.html`);
            contentArea.innerHTML = await htmlResponse.text();

            // Importa e executa o JavaScript da aba
            const viewModule = await import(`../js/${viewId}.js`);
            if (viewModule && typeof viewModule.init === 'function') {
                viewModule.init(db, user, userData);
            }
        } catch (error) {
            console.error(`Erro ao carregar a view ${viewId}:`, error);
            contentArea.innerHTML = `<p class="alert alert-error">Não foi possível carregar a seção.</p>`;
        }
    }

    // Ponto de partida do painel
    function start() {
        // A construção do menu é removida, pois o app.js cuidará disso.

        const handleHashChange = () => {
            const viewId = window.location.hash.substring(1) || views[0].id;
            const view = views.find(v => v.id === viewId);
            if (view && !view.isExternal) {
                // Atualiza o link ativo no menu lateral
                if (sidebarMenu) {
                    sidebarMenu.querySelectorAll('a').forEach(link => {
                        link.classList.toggle('active', link.dataset.view === viewId);
                    });
                }
                loadView(viewId);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Carrega a view inicial ou a definida no hash
    }

    start();
}