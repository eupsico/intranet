// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 4.0 (Base Funcional Desktop)
// Descrição: Controla as abas de recursos, carregando os módulos corretos para cada uma.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');
    
    const loadedTabs = new Set();

    const loadTabModule = async (tabId) => {
        if (loadedTabs.has(tabId)) {
            return;
        }

        try {
            let module;
            let initParams = [db, user, userData];

            switch (tabId) {
                case 'mensagens':
                    module = await import('./mensagens.js');
                    break;
                case 'disponibilidade':
                    module = await import('./disponibilidade.js');
                    break;
                case 'grade-online':
                    module = await import('./grade-view.js');
                    initParams.push('online'); // Informa ao módulo para carregar a grade online
                    break;
                case 'grade-presencial':
                    module = await import('./grade-view.js');
                    initParams.push('presencial'); // Informa ao módulo para carregar a grade presencial
                    break;
                default:
                    return; 
            }

            if (module && typeof module.init === 'function') {
                await module.init(...initParams);
                loadedTabs.add(tabId);
            }
        } catch (error) {
            console.error(`Erro ao carregar o módulo da aba '${tabId}':`, error);
            const tabContent = view.querySelector(`#${tabId}`);
            if(tabContent) {
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

    // Verifica se uma aba específica deve ser aberta ao carregar a página
    if (tabToOpen) {
        const tabButton = tabContainer.querySelector(`.tab-link[data-tab="${tabToOpen}"]`);
        if (tabButton) {
            tabButton.click(); // Simula o clique para ativar a aba e carregar seu conteúdo
        }
    } else {
        // Comportamento padrão: carrega a primeira aba ativa
        const activeTab = tabContainer.querySelector('.tab-link.active');
        if (activeTab) {
            loadTabModule(activeTab.dataset.tab);
        }
    }
    // --- FIM DA ALTERAÇÃO ---
}