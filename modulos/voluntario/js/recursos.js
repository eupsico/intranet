export function init(db, user, userData, tabToOpen) {
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
                    initParams.push('online');
                    break;
                case 'grade-presencial':
                    module = await import('./grade-view.js');
                    initParams.push('presencial');
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

    // Lógica que usa a variável 'tabToOpen'
    if (tabToOpen) {
        const tabButton = tabContainer.querySelector(`.tab-link[data-tab="${tabToOpen}"]`);
        if (tabButton) {
            tabButton.click(); // Simula o clique para abrir a aba correta
        }
    } else {
        // Comportamento padrão se nenhum link direto for usado
        const activeTab = tabContainer.querySelector('.tab-link.active');
        if (activeTab) {
            loadTabModule(activeTab.dataset.tab);
        }
    }
}