// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 4.1 (Revisado e padronizado)
// Descrição: Controla as abas de recursos, carregando os submódulos corretos para cada uma.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');
    
    // Mantém um registro das abas já carregadas para não recarregar desnecessariamente
    const loadedTabs = new Set();

    /**
     * Carrega o módulo JS associado a uma aba específica.
     * @param {string} tabId - O ID da aba (ex: 'mensagens', 'disponibilidade').
     */
    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId)) {
            return;
        }

        try {
            let module;
            const initParams = [db, user, userData];

            switch (tabId) {
                case 'mensagens':
                    module = await import('./mensagens.js');
                    break;
                case 'disponibilidade':
                    module = await import('./disponibilidade.js');
                    break;
                case 'grade-online':
                    module = await import('./grade-view.js');
                    initParams.push('online'); // Passa 'online' como parâmetro para o módulo
                    break;
                case 'grade-presencial':
                    module = await import('./grade-view.js');
                    initParams.push('presencial'); // Passa 'presencial' como parâmetro
                    break;
                default:
                    return; // Nenhuma ação se a aba não tiver um módulo JS
            }

            if (module && typeof module.init === 'function') {
                await module.init(...initParams);
                loadedTabs.add(tabId);
            }
        } catch (error) {
            console.error(`Erro ao carregar o módulo da aba '${tabId}':`, error);
            const tabContent = view.querySelector(`#${tabId}`);
            if (tabContent) {
                tabContent.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao carregar este recurso.</p>`;
            }
        }
    };

    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.classList.contains('tab-link')) {
                const tabId = e.target.dataset.tab;

                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });

                loadTabModule(tabId);
            }
        });
    }

    // Carrega o conteúdo da primeira aba ativa ao entrar na página
    const activeTab = tabContainer.querySelector('.tab-link.active');
    if (activeTab) {
        loadTabModule(activeTab.dataset.tab);
    }
}