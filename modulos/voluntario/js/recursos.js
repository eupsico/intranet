// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 3.0
// Descrição: Refatorado para ser um controlador de abas com carregamento dinâmico de módulos.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');
    
    // Rastreia os módulos que já foram carregados para evitar recarregamentos.
    const loadedTabs = new Set();

    /**
     * Carrega e inicializa o módulo de uma aba específica.
     * @param {string} tabId O ID da aba a ser carregada (ex: 'mensagens').
     */
    const loadTabModule = async (tabId) => {
        // Se o módulo já foi carregado, não faz nada.
        if (loadedTabs.has(tabId)) {
            return;
        }

        try {
            let module;
            switch (tabId) {
                case 'mensagens':
                    // Carrega dinamicamente o módulo de mensagens
                    module = await import('./tabs/mensagens.js');
                    break;
                case 'disponibilidade':
                    // Carrega dinamicamente o módulo de disponibilidade
                    module = await import('./tabs/disponibilidade.js');
                    break;
                case 'grade':
                     // Carrega dinamicamente o módulo da grade
                    module = await import('./tabs/grade.js');
                    break;
                default:
                    // Se a aba não tem um módulo associado, não faz nada.
                    return; 
            }

            // Se o módulo foi carregado e tem uma função init, a executa.
            if (module && typeof module.init === 'function') {
                module.init(db, user, userData);
                loadedTabs.add(tabId); // Marca a aba como carregada.
            }
        } catch (error) {
            console.error(`Erro ao carregar o módulo da aba '${tabId}':`, error);
            const tabContent = view.querySelector(`#${tabId}`);
            if(tabContent) {
                tabContent.innerHTML = `<p class="alert alert-error">Ocorreu um erro ao carregar este recurso.</p>`;
            }
        }
    };

    // --- LÓGICA GERAL DAS ABAS ---
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.classList.contains('tab-link')) {
                const tabId = e.target.dataset.tab;

                // Alterna a classe 'active' nos botões
                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Exibe o conteúdo da aba correta
                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });

                // Carrega o módulo da aba clicada (se ainda não foi carregado)
                loadTabModule(tabId);
            }
        });
    }

    // --- INICIALIZAÇÃO DA ABA ATIVA NA PRIMEIRA CARGA ---
    // Verifica qual aba está ativa inicialmente e carrega seu módulo.
    const activeTab = tabContainer.querySelector('.tab-link.active');
    if (activeTab) {
        loadTabModule(activeTab.dataset.tab);
    }
}