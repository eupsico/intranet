// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 3.1
// Descrição: Atualiza os caminhos de importação para refletir a nova estrutura de pastas sem a subpasta /tabs.

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
            switch (tabId) {
                case 'mensagens':
                    // Caminho atualizado
                    module = await import('./mensagens.js');
                    break;
                case 'disponibilidade':
                    // Caminho atualizado
                    module = await import('./disponibilidade.js');
                    break;
                case 'grade':
                     // Caminho atualizado
                    module = await import('./grade.js');
                    break;
                default:
                    return; 
            }

            if (module && typeof module.init === 'function') {
                // A função init agora pode ser assíncrona, então usamos await
                await module.init(db, user, userData);
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

    const activeTab = tabContainer.querySelector('.tab-link.active');
    if (activeTab) {
        loadTabModule(activeTab.dataset.tab);
    }
}